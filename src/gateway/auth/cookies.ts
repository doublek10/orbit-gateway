import { cookies } from "next/headers";
import { env } from "@/gateway/config/env";
import type { SessionOut } from "@/gateway/kernel/kernel.types";

/**
 * The Gateway is a security guard, not a decision-maker: it stores
 * whatever tokens the Kernel hands it and hands them back on the next
 * request. It never signs anything, never decodes the JWT, never decides
 * who someone is - it just carries the credential.
 */
export async function setAuthCookies(session: SessionOut): Promise<void> {
  const cookieStore = await cookies();
  const secure = env.nodeEnv === "production";

  cookieStore.set(env.accessTokenCookie, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: session.expires_in,
  });

  cookieStore.set(env.refreshTokenCookie, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    // Refresh tokens outlive access tokens - 30 days is a reasonable
    // default, tune to your product's session-length requirements.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(env.accessTokenCookie);
  cookieStore.delete(env.refreshTokenCookie);
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(env.accessTokenCookie)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(env.refreshTokenCookie)?.value ?? null;
}
