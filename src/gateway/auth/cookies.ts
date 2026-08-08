import { cookies } from "next/headers";
import { env } from "@/gateway/config/env";
import type { SessionOut } from "@/gateway/kernel/kernel.types";

/**
 * The Gateway is a security guard, not a decision-maker: it stores
 * whatever tokens the Kernel hands it and hands them back on the next
 * request. It never signs anything, never decodes the JWT, never decides
 * who someone is - it just carries the credential.
 *
 * Both tokens are stored together in ONE cookie, not two. Login/signup
 * responses are relayed to the browser through the Frontend's external
 * `next.config.ts` rewrite (so the Gateway's cookie behaves as a normal
 * first-party cookie). That proxying is fetch()-based, and multiple
 * `Set-Cookie` headers on a single proxied response are not reliably
 * preserved - one of them silently gets lost or corrupted in transit.
 * A single cookie sidesteps that entirely.
 */
interface StoredSession {
  access_token: string;
  refresh_token: string;
}

function parseStoredSession(raw: string | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.access_token === "string" && typeof parsed?.refresh_token === "string") {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setAuthCookies(session: SessionOut): Promise<void> {
  const cookieStore = await cookies();
  const secure = env.nodeEnv === "production";

  const value: StoredSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };

  cookieStore.set(env.sessionCookie, JSON.stringify(value), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    // The cookie itself lives as long as the refresh token is useful -
    // the access token's own shorter lifetime is enforced independently
    // by the Kernel checking the JWT's `exp` claim on every request, not
    // by cookie expiry.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(env.sessionCookie);
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const stored = parseStoredSession(cookieStore.get(env.sessionCookie)?.value);
  return stored?.access_token ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const stored = parseStoredSession(cookieStore.get(env.sessionCookie)?.value);
  return stored?.refresh_token ?? null;
}
