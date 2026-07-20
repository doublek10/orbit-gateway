import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

/**
 * GET /api/auth/session
 *
 * Even checking "am I logged in" goes to the Kernel every time - the
 * Gateway holds no session state of its own to answer this from.
 */
export async function GET() {
  const ctx = await authService.currentSession();
  return NextResponse.json({ session: ctx });
}
