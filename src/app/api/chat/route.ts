import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CavotiError, streamChat } from "@/lib/cavoti";
import { isValidModel } from "@/lib/models";
import { persistExchange } from "@/lib/conversations";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { decryptBytes } from "@/lib/filecrypt";
import { UPLOAD_DIR } from "@/lib/storage";
import type {
  ChatMessage,
  ContentPart,
  MessageAttachment,
  RelayMessage,
  SendChatBody,
  StreamFrame,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_VISION_MAX = 8 * 1024 * 1024; // only inline images up to 8 MB
const TEXT_INLINE_MAX = 8000; // chars of a text file to inline

const encoder = new TextEncoder();

function frame(payload: StreamFrame): Uint8Array {
  return encoder.encode(JSON.stringify(payload) + "\n");
}

function asMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (
    (obj.role === "user" || obj.role === "assistant" || obj.role === "system") &&
    typeof obj.content === "string"
  ) {
    return { role: obj.role, content: obj.content };
  }
  return null;
}

function asAttachment(value: unknown): MessageAttachment | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  return {
    id: o.id,
    name: typeof o.name === "string" ? o.name : "file",
    mimeType: typeof o.mimeType === "string" ? o.mimeType : "application/octet-stream",
    kind: o.kind === "image" ? "image" : "file",
    url: typeof o.url === "string" ? o.url : `/api/files/${o.id}`,
  };
}

function parseBody(raw: unknown): SendChatBody | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Body must be a JSON object." };
  const obj = raw as Record<string, unknown>;

  const modelId = typeof obj.modelId === "string" ? obj.modelId : "";
  if (!modelId) return { error: "modelId is required." };
  if (!isValidModel(modelId)) return { error: `Unknown model: ${modelId}` };

  if (!Array.isArray(obj.messages)) return { error: "messages must be an array." };
  const messages: ChatMessage[] = [];
  for (const m of obj.messages) {
    const parsed = asMessage(m);
    if (!parsed) return { error: "Each message needs a role and string content." };
    messages.push(parsed);
  }
  if (!messages.length) return { error: "messages must include at least one entry." };

  const body: SendChatBody = { modelId, messages };
  if (typeof obj.temperature === "number" && Number.isFinite(obj.temperature)) {
    body.temperature = obj.temperature;
  }
  if (typeof obj.maxTokens === "number" && Number.isFinite(obj.maxTokens) && obj.maxTokens > 0) {
    body.maxTokens = obj.maxTokens;
  }
  if (typeof obj.conversationId === "string" && obj.conversationId.trim()) {
    body.conversationId = obj.conversationId.trim();
  }
  if (Array.isArray(obj.attachments)) {
    const atts = obj.attachments.map(asAttachment).filter((a): a is MessageAttachment => a !== null);
    if (atts.length) body.attachments = atts;
  }
  return body;
}

function lastUserIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return i;
  }
  return -1;
}

function isTextual(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  if (["application/json", "application/xml"].includes(mime)) return true;
  return /\.(txt|md|markdown|csv|json|log|ya?ml|tsv|ini|conf)$/i.test(name);
}

/** Load attachments the user owns and split into vision parts + inlined text. */
async function loadAttachmentParts(
  attachments: MessageAttachment[],
  userId: string,
): Promise<{ imageParts: ContentPart[]; textAdditions: string[] }> {
  const imageParts: ContentPart[] = [];
  const textAdditions: string[] = [];

  for (const att of attachments) {
    const row = await db.upload.findFirst({ where: { id: att.id, userId } });
    if (!row) continue;
    const diskPath = path.join(UPLOAD_DIR, path.basename(row.filename));

    if (row.kind === "image" && row.size <= IMAGE_VISION_MAX) {
      try {
        const plain = decryptBytes(await readFile(diskPath));
        const dataUrl = `data:${row.mimeType};base64,${plain.toString("base64")}`;
        imageParts.push({ type: "image_url", image_url: { url: dataUrl } });
      } catch {
        textAdditions.push(`[Image: ${row.originalName} — could not be read]`);
      }
    } else if (isTextual(row.mimeType, row.originalName)) {
      try {
        const plain = decryptBytes(await readFile(diskPath));
        const text = plain.toString("utf-8").slice(0, TEXT_INLINE_MAX);
        textAdditions.push(`[Attached file: ${row.originalName}]\n\`\`\`\n${text}\n\`\`\``);
      } catch {
        textAdditions.push(`[Attached file: ${row.originalName}]`);
      }
    } else {
      textAdditions.push(`[Attached ${row.kind}: ${row.originalName} (${row.mimeType})]`);
    }
  }

  return { imageParts, textAdditions };
}

function buildWireMessages(
  messages: ChatMessage[],
  augment: { index: number; imageParts: ContentPart[]; textAdditions: string[] } | null,
): RelayMessage[] {
  const wire: RelayMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  if (augment && augment.index >= 0) {
    const base = messages[augment.index]?.content ?? "";
    const text =
      [base, ...augment.textAdditions].filter((s) => s.length).join("\n\n") ||
      "See the attached file(s).";
    wire[augment.index] = augment.imageParts.length
      ? { role: "user", content: [{ type: "text", text }, ...augment.imageParts] }
      : { role: "user", content: text };
  }
  return wire;
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const userId = session.sub;
  const idx = lastUserIndex(parsed.messages);
  const userContent = idx >= 0 ? (parsed.messages[idx]?.content ?? "") : "";
  const attachments = parsed.attachments ?? [];

  // Build the wire messages (with multimodal content when files are attached).
  let wireMessages: RelayMessage[];
  if (attachments.length) {
    const { imageParts, textAdditions } = await loadAttachmentParts(attachments, userId);
    wireMessages = buildWireMessages(parsed.messages, { index: idx, imageParts, textAdditions });
  } else {
    wireMessages = parsed.messages.map((m) => ({ role: m.role, content: m.content }));
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cleanup = () => {
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      try {
        let model: string | undefined;
        let finishReason: string | null = null;
        let lastUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
        let assistantText = "";

        const streamArgs: Parameters<typeof streamChat>[0] = {
          modelId: parsed.modelId,
          messages: wireMessages,
          signal: req.signal,
        };
        if (parsed.temperature !== undefined) streamArgs.temperature = parsed.temperature;
        if (parsed.maxTokens !== undefined) streamArgs.maxTokens = parsed.maxTokens;

        for await (const chunk of streamChat(streamArgs)) {
          if (chunk.text) {
            assistantText += chunk.text;
            controller.enqueue(frame({ type: "delta", text: chunk.text }));
          }
          if (chunk.model) model = chunk.model;
          if (chunk.finish_reason !== undefined) finishReason = chunk.finish_reason;
          if (chunk.usage) lastUsage = chunk.usage;
        }

        const done: StreamFrame = { type: "done", finish_reason: finishReason };
        if (model) done.model = model;
        if (lastUsage) done.usage = lastUsage;

        // Persist once the reply completes. Failures never drop the visible reply.
        if (parsed.conversationId && assistantText.trim() && (userContent || attachments.length)) {
          try {
            const convo = await persistExchange({
              conversationId: parsed.conversationId,
              userId,
              userContent,
              assistantContent: assistantText,
              modelId: parsed.modelId,
              ...(attachments.length ? { attachments } : {}),
            });
            if (convo) done.conversation = convo;
          } catch (persistErr) {
            console.error("[cavoti] persist failed:", persistErr);
          }
        }

        controller.enqueue(frame(done));
      } catch (err) {
        if (err instanceof CavotiError) {
          const errFrame: StreamFrame = { type: "error", code: err.code, message: err.message };
          if (err.requestId) errFrame.requestId = err.requestId;
          controller.enqueue(frame(errFrame));
        } else if (err instanceof Error && err.name === "AbortError") {
          controller.enqueue(
            frame({ type: "error", code: "network", message: "Request was cancelled." }),
          );
        } else {
          controller.enqueue(
            frame({
              type: "error",
              code: "upstream",
              message: err instanceof Error ? err.message : "Unknown error.",
            }),
          );
        }
      } finally {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
