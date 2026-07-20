import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * intelligence/dashboard
 *
 * Combined health/findings/forecast/counts snapshot for the Intelligence Dashboard.
 * Same relay pattern every other Gateway route uses - the Gateway
 * decides nothing beyond "is there a credential to forward"; the Kernel
 * re-verifies the token and the Intelligence Engine (owned entirely by
 * kernel/intelligence_engine/) does the actual work. GET query params
 * other than company_id are passed through as the workflow payload,
 * since these reads take filters (report_type, limit, metric_key, ...).
 */
async function forward(req: NextRequest, workflow: string) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  let payload: Record<string, unknown> = {};
  if (req.method === "GET") {
    for (const [key, value] of req.nextUrl.searchParams.entries()) {
      if (key === "company_id") continue;
      payload[key] = value;
    }
  } else {
    payload = (await req
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
  }
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  try {
    const result = await kernelClient.execute({
      workflow,
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

export async function GET(req: NextRequest) {
  return forward(req, "intelligence_dashboard.list");
}
