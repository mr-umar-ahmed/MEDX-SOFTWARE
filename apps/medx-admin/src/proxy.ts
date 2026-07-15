import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

/**
 * Auth gate for the whole admin panel. Everything requires a valid admin
 * session except the login flow and the two endpoints consumed by client
 * software (desktop heartbeat) and the public patient website (labs
 * directory).
 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/heartbeat", "/api/labs-directory"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || request.method === "OPTIONS") {
    return NextResponse.next();
  }

  // Session cookie set by /api/auth
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySessionToken(cookie)) {
    return NextResponse.next();
  }

  // Direct API access (scripts / automation) with the admin password
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && authHeader === `Bearer ${adminPassword}`) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)"],
};
