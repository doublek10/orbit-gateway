import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * sdk/[language]
 *
 * SDK Generator. One dynamic route serves the spec's five literal
 * endpoints (GET /api/sdk/typescript, /javascript, /php, /python,
 * /java) - the Kernel validates the language and returns 422 for
 * anything else.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ language: string }> },
) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const { language } = await context.params;
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  try {
    const result = await kernelClient.execute({
      workflow: "sdk.generate",
      payload: { language },
      supabase_access_token: guard,
      company_id: companyId,
      request_id: crypto.randomUUID(),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof KernelError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unexpected error" } },
      { status: 500 },
    );
  }
}
