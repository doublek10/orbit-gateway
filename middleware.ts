import { NextRequest, NextResponse } from "next/server";
import { env } from "@/gateway/config/env";

/**
 * The security guard's front-door check: is there even a credential
 * presented? This middleware does NOT decide if that credential is
 * valid - it just saves a wasted round trip to the Kernel for requests
 * that obviously have nothing to forward. The Kernel is what actually
 * verifies and authorizes, on every request, with no exceptions.
 */

const PUBLIC_PATHS = [
  "/api/auth/signup",
  "/api/auth/login",
  "/api/auth/session", // GET always allowed through - it's how "am I logged in" is answered
  "/api/auth/logout",
  "/api/health",
  "/api/webhooks",
  "/api/countries",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasToken = req.cookies.has(env.accessTokenCookie);
  if (!hasToken) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "No credentials presented" } },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
