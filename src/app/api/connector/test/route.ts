import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * connector/test
 *
 * Test Connection for the Connector Generator. Relays database,
 * connection details, and table map to the Kernel's "connector.test"
 * workflow, which attempts a real, read-only connection and previews
 * a few sample rows per table. The Kernel never persists what it
 * finds - every response carries saved: false - so this route doesn't
 * either; it's a pure pass-through, same shape as company/test-endpoint.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const payload = await req.json().catch(() => ({}));
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  try {
    const result = await kernelClient.execute({
      workflow: "connector.test",
      payload,
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
