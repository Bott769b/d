import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_MAX_AGE, authConfig, nowSeconds, signSession } from "@/lib/session";
import { createUser, ensureAdminUser, findUserByUsername, isValidUsername } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD = 4;

export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 2–32 characters: letters, numbers, dot, dash, underscore." },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 },
    );
  }

  await ensureAdminUser();

  // The admin username is reserved.
  if (username.toLowerCase() === authConfig().adminUsername.toLowerCase()) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 409 });
  }
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const user = await createUser(username, password, "user");

  // Auto sign-in after registering.
  const token = await signSession(
    { sub: user.id, username: user.username, role: user.role, iat: nowSeconds() },
    authConfig().secret,
  );
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json(
    { user: { username: user.username, role: user.role }, redirectTo: "/chat" },
    { status: 201 },
  );
}
