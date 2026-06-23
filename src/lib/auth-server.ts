import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authConfig, verifySession, type Session } from "./session";

// Read + verify the current session inside a route handler / server component.
// Kept separate from session.ts because it imports next/headers, which must
// not be pulled into the Edge middleware bundle.
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, authConfig().secret);
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession();
  return session && session.role === "admin" ? session : null;
}
