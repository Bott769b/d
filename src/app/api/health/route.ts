import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight liveness probe for Railway's healthcheck. Intentionally does no
// DB or network work so a transient dependency hiccup doesn't flap the deploy.
export function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() });
}
