import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { UPLOAD_DIR } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/upload/[id] — remove the caller's own file (disk + DB).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const row = await db.upload.findFirst({ where: { id, userId: session.sub } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(row.filename)));
  } catch {
    // File may already be gone — drop the row anyway.
  }

  await db.upload.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
