import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_MAX_AGE, authConfig, nowSeconds, signSession } from "@/lib/session";
import { authenticate, ensureAdminUser } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  // Make sure the admin account exists before we authenticate against the DB.
  await ensureAdminUser();

  const user = await authenticate(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

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

  return NextResponse.json({
    user: { username: user.username, role: user.role },
    redirectTo: user.role === "admin" ? "/admin" : "/chat",
  });
}
