import { NextRequest, NextResponse } from "next/server";
import { KernelError } from "@/gateway/kernel/kernel.errors";
import { loginSchema } from "@/gateway/validation/auth.schema";
import { authService } from "@/services/auth.service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const session = await authService.login(parsed.data);
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof KernelError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unexpected error during login" } },
      { status: 500 },
    );
  }
}
