import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * blueprint
 *
 * The Company Blueprint is the first-login setup wizard: "how do you
 * want Orbit to work for you". Same shape as every other Gateway route -
 * the Gateway decides nothing about the Blueprint's contents, it just
 * forwards to the Kernel's /execute endpoint with a credential attached.
 */
async function forward(req: NextRequest, workflow: string) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const payload = req.method === "GET" ? {} : await req.json().catch(() => ({}));
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
  return forward(req, "blueprint.list");
}

export async function POST(req: NextRequest) {
  return forward(req, "blueprint.create");
}
