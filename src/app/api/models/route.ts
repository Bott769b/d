import { NextResponse } from "next/server";
import { MODELS, DEFAULT_MODEL_ID } from "@/lib/models";

export const runtime = "nodejs";

/** GET /api/models — returns the curated catalog with the default selection. */
export function GET() {
  return NextResponse.json(
    {
      defaultModelId: DEFAULT_MODEL_ID,
      models: MODELS,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
