import { NextResponse } from "next/server";
import { getAccessToken } from "@/gateway/auth/cookies";

/**
 * Security-guard duty only: checks a credential is present before
 * bothering to forward the request. It does NOT check whether the token
 * is valid, expired, or belongs to anyone real - that determination
 * belongs entirely to the Kernel, which re-verifies it on every single
 * call. If the token is bad, the Kernel's response (relayed verbatim)
 * will say so.
 */
export async function requireAccessToken(): Promise<string | NextResponse> {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "No credentials presented" } },
      { status: 401 },
    );
  }
  return token;
}
