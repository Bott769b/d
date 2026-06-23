import { NextResponse } from "next/server";
import {
  deleteConversation,
  getConversation,
  updateConversation,
} from "@/lib/conversations";
import { getSession } from "@/lib/auth-server";
import { isValidModel } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/conversations/[id] — full conversation with messages (owner only).
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const conversation = await getConversation(id, session.sub);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load conversation." },
      { status: 500 },
    );
  }
}

// PATCH /api/conversations/[id] — rename and/or change model (owner only).
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;

  let body: { title?: unknown; modelId?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: { title?: string; modelId?: string } = {};
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title;
  }
  if (typeof body.modelId === "string") {
    if (!isValidModel(body.modelId)) {
      return NextResponse.json({ error: "Unknown model." }, { status: 400 });
    }
    patch.modelId = body.modelId;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const conversation = await updateConversation(id, session.sub, patch);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update conversation." },
      { status: 500 },
    );
  }
}

// DELETE /api/conversations/[id] — remove it (owner only; messages cascade).
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const ok = await deleteConversation(id, session.sub);
    if (!ok) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete conversation." },
      { status: 500 },
    );
  }
}
