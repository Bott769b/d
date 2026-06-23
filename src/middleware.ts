import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authConfig, verifySession } from "@/lib/session";

// Gate the authenticated areas. Runs on the Edge runtime, so it uses the
// Web-Crypto-based verifier from session.ts (no next/headers here).
export const config = {
  matcher: [
    "/chat",
    "/chat/:path*",
    "/admin",
    "/admin/:path*",
    "/api/upload",
    "/api/upload/:path*",
    "/api/files/:path*",
  ],
};

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySession(token, authConfig().secret) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminPath(pathname) && session.role !== "admin") {
    if (isApi) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
