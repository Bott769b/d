import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// At-rest encryption for uploaded files. AES-256-GCM with a key derived from
// UPLOAD_SECRET (falls back to SESSION_SECRET, then a dev default). Each blob
// is self-contained:  [12-byte IV][16-byte auth tag][ciphertext].
//
// Files never touch the public folder — they're written as opaque .enc blobs
// and only decrypted in-memory by the authenticated /api/files/[id] route.

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.UPLOAD_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "cavoti-dev-upload-secret-change-me";
  cachedKey = scryptSync(secret, "cavoti-upload-kdf-v1", 32);
  return cachedKey;
}

const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptBytes(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptBytes(blob: Buffer): Buffer {
  if (blob.length < IV_LEN + TAG_LEN) {
    throw new Error("Encrypted blob is too short / corrupt.");
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
