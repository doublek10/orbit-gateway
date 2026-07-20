import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * graph
 *
 * The Gateway decides nothing here beyond "is there a credential to
 * forward" - every request is relayed to the Kernel's /execute endpoint,
 * which re-verifies the token and dispatches to its Workflow Engine.
 * Until that workflow exists, the Kernel itself returns the 501 - this
 * route does not manufacture that response locally anymore.
 */
async function forward(req: NextRequest, workflow: string) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

<<<<<<< HEAD
  const payload =
    req.method === "GET"
      ? {
          ...(req.nextUrl.searchParams.get("limit") && {
            limit: Number(req.nextUrl.searchParams.get("limit")),
          }),
          ...(req.nextUrl.searchParams.get("offset") && {
            offset: Number(req.nextUrl.searchParams.get("offset")),
          }),
        }
      : await req.json().catch(() => ({}));
=======
  const payload = req.method === "GET" ? {} : await req.json().catch(() => ({}));
>>>>>>> aa746f7017a331b8c4ac2e0f198e337c0d4c8001
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
  return forward(req, "graph.list");
}

export async function POST(req: NextRequest) {
  return forward(req, "graph.create");
}
