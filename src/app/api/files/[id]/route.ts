import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { decryptBytes } from "@/lib/filecrypt";
import { UPLOAD_DIR } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/files/[id] — decrypt and serve the caller's own file. Used as the
// src for <img> in chat + admin, and for download links.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const row = await db.upload.findFirst({ where: { id, userId: session.sub } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let plain: Buffer;
  try {
    const blob = await readFile(path.join(UPLOAD_DIR, path.basename(row.filename)));
    plain = decryptBytes(blob);
  } catch {
    return NextResponse.json({ error: "File is missing or unreadable." }, { status: 410 });
  }

  const asciiName = row.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const body = new Uint8Array(plain);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${asciiName}"`,
      // Private cache only — never shared/CDN, since it's per-user content.
      "Cache-Control": "private, max-age=300",
    },
  });
}
