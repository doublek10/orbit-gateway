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
  // Meta calls this directly - there is no Orbit session, by definition.
  // It's not unauthenticated in an unsafe sense: the POST handler itself
  // verifies Meta's X-Hub-Signature-256 before trusting anything, and
  // the GET handler only ever echoes back Meta's own challenge if
  // WHATSAPP_VERIFY_TOKEN matches. See src/app/api/whatsapp/webhook/route.ts.
  "/api/whatsapp/webhook",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasToken = req.cookies.has(env.sessionCookie);
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
