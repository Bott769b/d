import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { encryptBytes } from "@/lib/filecrypt";
import { UPLOAD_DIR } from "@/lib/storage";
import type { UploadMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file

interface UploadRow {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: string;
  createdAt: Date;
}

function serialize(u: UploadRow): UploadMeta {
  return {
    id: u.id,
    filename: u.filename,
    originalName: u.originalName,
    mimeType: u.mimeType,
    size: u.size,
    kind: u.kind === "image" ? "image" : "file",
    url: `/api/files/${u.id}`,
    createdAt: u.createdAt.toISOString(),
  };
}

function kindFor(mime: string): "image" | "file" {
  return mime.startsWith("image/") ? "image" : "file";
}

// GET /api/upload — the caller's own uploads (any signed-in user).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const uploads = await db.upload.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ uploads: uploads.map(serialize) });
}

// POST /api/upload — accept one or more files, encrypt, store, record.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const single = form.get("file");
  if (single instanceof File) files.push(single);

  const real = files.filter((f) => f.size > 0);
  if (!real.length) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }
  for (const f of real) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `"${f.name}" is larger than the 25 MB limit.` },
        { status: 413 },
      );
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const created: UploadMeta[] = [];
  for (const file of real) {
    const stored = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.enc`;
    const plain = Buffer.from(await file.arrayBuffer());
    const blob = encryptBytes(plain);
    await writeFile(path.join(UPLOAD_DIR, stored), blob);

    const row = await db.upload.create({
      data: {
        userId: session.sub,
        filename: stored,
        originalName: file.name || stored,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        kind: kindFor(file.type || ""),
      },
    });
    created.push(serialize(row));
  }

  return NextResponse.json({ uploads: created }, { status: 201 });
}
