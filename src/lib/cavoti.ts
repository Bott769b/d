// Server-only Cavoti relay client. Never import from a client component.
//
// We don't reuse the cavoti-relay package here on purpose: the web app should
// be runnable on its own without a workspace install step. The protocol is
// simple enough that a thin server wrapper keeps the app self-contained.

import "server-only";
import { isValidModel } from "./models";
import type { RelayMessage, UsageBlock } from "./types";

const DEFAULT_BASE_URL = "https://cavoti.com/v1";
const DEFAULT_TIMEOUT_MS = 120_000;
const REQUEST_ID_HEADER = "x-oneapi-request-id";

export type CavotiErrorCode =
  | "config"
  | "invalid_request"
  | "auth"
  | "not_found"
  | "rate_limit"
  | "upstream"
  | "network"
  | "stream"
  | "empty";

export class CavotiError extends Error {
  readonly code: CavotiErrorCode;
  readonly status?: number;
  readonly requestId?: string;

  constructor(
    code: CavotiErrorCode,
    message: string,
    init: { status?: number; requestId?: string } = {},
  ) {
    super(message);
    this.name = "CavotiError";
    this.code = code;
    if (init.status !== undefined) this.status = init.status;
    if (init.requestId !== undefined) this.requestId = init.requestId;
  }
}

interface CavotiConfig {
  apiKeys: string[];
  baseUrl: string;
  timeoutMs: number;
}

function readConfig(): CavotiConfig {
  // Accept a pool of keys via CAVOTI_API_KEYS (comma / newline / space
  // separated) plus a single legacy CAVOTI_API_KEY. Requests rotate through
  // the pool and fail over to the next key when one doesn't deliver.
  const raw = [process.env.CAVOTI_API_KEYS ?? "", process.env.CAVOTI_API_KEY ?? ""].join(",");

  const seen = new Set<string>();
  const apiKeys: string[] = [];
  for (const piece of raw.split(/[\s,]+/)) {
    const key = piece.trim();
    if (!key || key === "sk-replace-me") continue;
    if (!key.startsWith("sk-")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    apiKeys.push(key);
  }

  if (apiKeys.length === 0) {
    throw new CavotiError(
      "config",
      "No Cavoti API keys configured. Set CAVOTI_API_KEYS (comma-separated) or CAVOTI_API_KEY in .env.local.",
    );
  }

  const baseUrl = (process.env.CAVOTI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const rawTimeout = process.env.CAVOTI_TIMEOUT_MS;
  const timeoutMs = rawTimeout ? Number.parseInt(rawTimeout, 10) : DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new CavotiError(
      "config",
      `CAVOTI_TIMEOUT_MS must be a positive integer (got "${rawTimeout}").`,
    );
  }
  return { apiKeys, baseUrl, timeoutMs };
}

// Round-robin starting point so load spreads across keys instead of always
// hammering the first one. Module-level: persists across requests in the
// same server process.
let rotationCursor = 0;
function orderedKeys(keys: string[]): string[] {
  if (keys.length <= 1) return keys.slice();
  const start = rotationCursor % keys.length;
  rotationCursor = (rotationCursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

/** Which failures are worth retrying on a different key. */
function shouldFailover(code: CavotiErrorCode): boolean {
  // Retry transient or key-specific failures. Don't retry a malformed request
  // or an unknown model — another key won't change the outcome.
  return (
    code === "auth" ||
    code === "rate_limit" ||
    code === "upstream" ||
    code === "network" ||
    code === "stream" ||
    code === "empty"
  );
}

// Per-key model catalogs. Keys on Cavoti can expose different model sets, so
// we route each request to keys that actually advertise the requested model.
// Cached with a TTL to avoid hitting /v1/models on every chat.
const MODELS_TTL_MS = 10 * 60_000;
const keyModelsCache = new Map<string, { models: Set<string>; fetchedAt: number }>();

async function fetchKeyModels(apiKey: string, config: CavotiConfig): Promise<Set<string>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${config.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "cavoti-web/0.1",
      },
      signal: controller.signal,
    });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { data?: Array<{ id?: unknown }> };
    const out = new Set<string>();
    if (Array.isArray(data.data)) {
      for (const m of data.data) {
        if (typeof m?.id === "string") out.add(m.id);
      }
    }
    return out;
  } catch {
    return new Set();
  } finally {
    clearTimeout(timeout);
  }
}

async function modelsForKey(apiKey: string, config: CavotiConfig): Promise<Set<string>> {
  const cached = keyModelsCache.get(apiKey);
  if (cached && Date.now() - cached.fetchedAt < MODELS_TTL_MS) return cached.models;
  const models = await fetchKeyModels(apiKey, config);
  // Only cache non-empty results; an empty set usually means a transient fetch
  // failure, and we'd rather re-check next time than blacklist the key.
  if (models.size > 0) keyModelsCache.set(apiKey, { models, fetchedAt: Date.now() });
  return models;
}

/**
 * Order keys for a given model: keys known to support it first (round-robin
 * within the pool), then keys whose catalog we couldn't determine, then keys
 * known NOT to support it (still tried as a last resort in case the cache is
 * stale). Falls back to the raw rotation if catalogs can't be fetched.
 */
async function selectKeys(modelId: string, config: CavotiConfig): Promise<string[]> {
  const rotated = orderedKeys(config.apiKeys);
  if (rotated.length <= 1) return rotated;

  const sets = await Promise.all(
    rotated.map((k) => modelsForKey(k, config).catch(() => new Set<string>())),
  );

  const supports: string[] = [];
  const unknown: string[] = [];
  const others: string[] = [];
  rotated.forEach((key, i) => {
    const set = sets[i];
    if (!set || set.size === 0) unknown.push(key);
    else if (set.has(modelId)) supports.push(key);
    else others.push(key);
  });

  return [...supports, ...unknown, ...others];
}

export interface StreamOptions {
  modelId: string;
  messages: RelayMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ParsedStreamChunk {
  text?: string;
  finish_reason?: string | null;
  usage?: UsageBlock;
  model?: string;
}

/**
 * Stream a chat completion with automatic key failover.
 *
 * Requests rotate through the configured key pool (round-robin start). If a
 * key fails to deliver — auth / rate-limit / upstream error, network timeout,
 * or an empty response — we transparently retry with the next key. Once the
 * model has emitted text we're committed to that key (we can't rewind what
 * the user already saw), so mid-stream failures propagate.
 */
export async function* streamChat(
  opts: StreamOptions,
): AsyncGenerator<ParsedStreamChunk, void, void> {
  if (!isValidModel(opts.modelId)) {
    throw new CavotiError("not_found", `Unknown model: ${opts.modelId}`);
  }
  if (!Array.isArray(opts.messages) || !opts.messages.length) {
    throw new CavotiError("invalid_request", "messages must be a non-empty array.");
  }

  const config = readConfig();
  const keys = await selectKeys(opts.modelId, config);
  let lastError: unknown;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === undefined) continue;
    const attempt = i + 1;
    let sawText = false;

    try {
      for await (const chunk of streamOnce(key, config, opts)) {
        if (chunk.text) sawText = true;
        yield chunk;
      }

      if (sawText) return; // genuine success on this key

      // Completed with no text — treat as "no response" and fail over.
      lastError = new CavotiError("empty", "The model returned an empty response.");
      console.warn(
        `[cavoti] key ${attempt}/${keys.length} returned empty for ${opts.modelId}; trying next key.`,
      );
    } catch (err) {
      // A user-initiated abort is final — never fail over on it.
      if (opts.signal?.aborted) throw err;
      // If text already streamed, we can't restart cleanly.
      if (sawText) throw err;

      lastError = err;
      const code = err instanceof CavotiError ? err.code : "upstream";
      if (!shouldFailover(code)) throw err;

      console.warn(
        `[cavoti] key ${attempt}/${keys.length} failed (${code}) for ${opts.modelId}; trying next key.`,
      );
    }
  }

  // Every key was exhausted.
  if (lastError instanceof CavotiError) {
    const suffix = keys.length > 1 ? ` (all ${keys.length} keys failed)` : "";
    throw new CavotiError(lastError.code, `${lastError.message}${suffix}`, {
      ...(lastError.status !== undefined ? { status: lastError.status } : {}),
      ...(lastError.requestId ? { requestId: lastError.requestId } : {}),
    });
  }
  throw new CavotiError(
    "upstream",
    lastError instanceof Error ? lastError.message : "All API keys failed to respond.",
  );
}

/** Single-key streaming attempt. Yields parsed chunks; throws CavotiError. */
async function* streamOnce(
  apiKey: string,
  config: CavotiConfig,
  opts: StreamOptions,
): AsyncGenerator<ParsedStreamChunk, void, void> {
  const url = `${config.baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: opts.modelId,
    messages: opts.messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "cavoti-web/0.1",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new CavotiError(
      "network",
      aborted
        ? `Cavoti request timed out after ${config.timeoutMs}ms.`
        : `Could not reach Cavoti: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const requestId = res.headers.get(REQUEST_ID_HEADER) ?? undefined;

  if (!res.ok) {
    clearTimeout(timeout);
    const detail = await safeReadJson(res);
    const message =
      (detail && typeof detail === "object" && "error" in detail
        ? ((detail as { error?: { message?: string } }).error?.message ?? "")
        : "") || `Cavoti returned HTTP ${res.status}.`;
    const code: CavotiErrorCode =
      res.status === 401 || res.status === 403
        ? "auth"
        : res.status === 429
          ? "rate_limit"
          : res.status === 400
            ? "invalid_request"
            : res.status === 404
              ? "not_found"
              : "upstream";
    const errInit: { status: number; requestId?: string } = { status: res.status };
    if (requestId) errInit.requestId = requestId;
    throw new CavotiError(code, message, errInit);
  }

  if (!res.body) {
    clearTimeout(timeout);
    const errInit: { requestId?: string } = {};
    if (requestId) errInit.requestId = requestId;
    throw new CavotiError("stream", "Cavoti returned no streaming body.", errInit);
  }

  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = findBoundary(buffer);
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary).replace(/^(\r?\n){2}/, "");

          const data = extractDataPayload(frame);
          if (data === null) {
            boundary = findBoundary(buffer);
            continue;
          }
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data) as RawChunk;
            const projected = projectChunk(parsed);
            if (projected) yield projected;
          } catch {
            // Skip malformed frames. The relay occasionally emits comments.
          }
          boundary = findBoundary(buffer);
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ─── internals ─────────────────────────────────────────────────────────────

interface RawChunk {
  id?: string;
  model?: string;
  choices?: Array<{
    index?: number;
    delta?: { content?: string; role?: string };
    finish_reason?: string | null;
  }>;
  usage?: UsageBlock;
}

function projectChunk(chunk: RawChunk): ParsedStreamChunk | null {
  const out: ParsedStreamChunk = {};
  if (chunk.model) out.model = chunk.model;
  if (chunk.usage) out.usage = chunk.usage;
  const choice = chunk.choices?.[0];
  if (choice) {
    const delta = choice.delta?.content;
    if (typeof delta === "string" && delta.length) out.text = delta;
    if (choice.finish_reason) out.finish_reason = choice.finish_reason;
  }
  if (out.text === undefined && out.finish_reason === undefined && out.usage === undefined) {
    return null;
  }
  return out;
}

function findBoundary(buf: string): number {
  const lf = buf.indexOf("\n\n");
  const crlf = buf.indexOf("\r\n\r\n");
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

function extractDataPayload(frame: string): string | null {
  const lines = frame.split(/\r?\n/);
  const datas: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      datas.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (!datas.length) return null;
  return datas.join("\n");
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return await res.json();
    return await res.text();
  } catch {
    return undefined;
  }
}
