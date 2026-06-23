import { NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/conversations";
import { getSession } from "@/lib/auth-server";
import { DEFAULT_MODEL_ID, isValidModel } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations — the signed-in user's threads, newest first.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const conversations = await listConversations(session.sub);
    return NextResponse.json({ conversations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load conversations." },
      { status: 500 },
    );
  }
}

// POST /api/conversations — create a new (empty) conversation for the user.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { modelId?: unknown; title?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — fall back to defaults.
  }

  const modelId =
    typeof body.modelId === "string" && isValidModel(body.modelId)
      ? body.modelId
      : DEFAULT_MODEL_ID;
  const title = typeof body.title === "string" ? body.title : undefined;

  try {
    const conversation = await createConversation(session.sub, modelId, title);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create conversation." },
      { status: 500 },
    );
  }
}
