import { NextRequest, NextResponse } from "next/server";
import { KernelError } from "@/gateway/kernel/kernel.errors";
import { signupSchema } from "@/gateway/validation/auth.schema";
import { authService } from "@/services/auth.service";

/**
 * POST /api/auth/signup
 *
 * Frontend submits {email, password, company_name}. The Gateway checks
 * only that the shape is well-formed, then forwards it to the Kernel
 * untouched. The Kernel does everything else: creates the identity in
 * Supabase, gets back a UUID, creates the company/owner rows in
 * Postgres, signs the user in, and returns success or failure - which
 * the Gateway relays here as one normalized session object.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const session = await authService.signup(parsed.data);
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof KernelError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unexpected error during signup" } },
      { status: 500 },
    );
  }
}
