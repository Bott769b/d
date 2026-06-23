// Lightweight signed-cookie sessions. Uses Web Crypto (HMAC-SHA256) so the
// exact same code verifies in both the Node runtime (route handlers) and the
// Edge runtime (middleware).
//
// SECURITY NOTE: this is prototype-grade auth for a local single-user tool.
// The admin credential is read from env (defaults to admin/admin) and the
// token is signed, not encrypted. Do not treat this as production security.

export const AUTH_COOKIE = "cavoti_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

export type Role = "admin" | "user";

export interface Session {
  /** user id (cuid) */
  sub: string;
  username: string;
  role: Role;
  /** issued-at, unix seconds */
  iat: number;
}

export interface AuthConfig {
  secret: string;
  adminUsername: string;
  adminPassword: string;
}

const DEV_SECRET = "cavoti-dev-secret-change-me";

export function authConfig(): AuthConfig {
  return {
    secret: process.env.SESSION_SECRET?.trim() || DEV_SECRET,
    adminUsername: process.env.ADMIN_USERNAME?.trim() || "admin",
    adminPassword: process.env.ADMIN_PASSWORD ?? "admin",
  };
}

const encoder = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strToB64url(s: string): string {
  return bytesToB64url(encoder.encode(s));
}

function b64urlToStr(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Produce a `payload.signature` token. */
export async function signSession(session: Session, secret: string): Promise<string> {
  const payload = strToB64url(JSON.stringify(session));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** Verify a token and return the session, or null if tampered/invalid. */
export async function verifySession(token: string, secret: string): Promise<Session | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;

  let valid = false;
  try {
    const key = await hmacKey(secret);
    valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), encoder.encode(payload));
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const obj = JSON.parse(b64urlToStr(payload)) as Partial<Session>;
    if (
      typeof obj.sub === "string" &&
      typeof obj.username === "string" &&
      (obj.role === "admin" || obj.role === "user") &&
      typeof obj.iat === "number"
    ) {
      return { sub: obj.sub, username: obj.username, role: obj.role, iat: obj.iat };
    }
    return null;
  } catch {
    return null;
  }
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
