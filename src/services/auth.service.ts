import { kernelClient } from "@/gateway/kernel/kernel.client";
import { setAuthCookies, clearAuthCookies, getAccessToken, getRefreshToken } from "@/gateway/auth/cookies";
import { fromAuthResult, fromExecutionContext, type SessionView } from "@/gateway/kernel/session-view";
import type { LoginInput, SignupInput } from "@/gateway/validation/auth.schema";

/**
 * Thin translation layer, on purpose - the Gateway is a security guard,
 * not a decision-maker. Every function here does exactly two things:
 * call the Kernel, then manage the transport-level cookies. No business
 * logic, no validation beyond shape, no caching of what the Kernel says.
 */
export const authService = {
  async signup(input: SignupInput): Promise<SessionView> {
    const result = await kernelClient.signup(input);
    await setAuthCookies(result.session);
    return fromAuthResult(result);
  },

  async login(input: LoginInput): Promise<SessionView> {
    const result = await kernelClient.login(input);
    await setAuthCookies(result.session);
    return fromAuthResult(result);
  },

  async logout(): Promise<void> {
    const token = await getAccessToken();
    if (token) {
      await kernelClient.logout(token).catch(() => {
        // Even if the Kernel/Supabase call fails, still clear local
        // cookies below - don't trap the user in a logged-in browser.
      });
    }
    await clearAuthCookies();
  },

  async currentSession(): Promise<SessionView | null> {
    const token = await getAccessToken();
    if (!token) return null;

    try {
      const ctx = await kernelClient.resolveIdentity(token);
      return fromExecutionContext(ctx);
    } catch {
      // Access token expired or invalid - try the refresh token once
      // before giving up, exactly like a security guard checking a
      // backup ID before turning someone away.
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      try {
        const session = await kernelClient.refresh(refreshToken);
        await setAuthCookies(session);
        const ctx = await kernelClient.resolveIdentity(session.access_token);
        return fromExecutionContext(ctx);
      } catch {
        await clearAuthCookies();
        return null;
      }
    }
  },
};
