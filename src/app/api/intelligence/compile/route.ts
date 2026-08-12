import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * intelligence/compile
 *
 * Backs the Intelligence page's "Compile" button. Same relay pattern
 * every other Gateway route uses - the Gateway decides nothing beyond
 * "is there a credential to forward"; the Kernel re-verifies the token
 * and the Intelligence Engine (kernel/intelligence_engine/) does the
 * actual work: a fresh Reasoning Engine cycle (ledger findings +
 * whatever the company's Connector URL reports live) rendered straight
 * into a PDF.
 *
 * The Kernel returns the PDF as base64 JSON (`pdf_base64`) rather than
 * a binary body, since every Kernel response is JSON by contract
 * (kernel_api's exception handlers assume it, and the Frontend's
 * gateway.ts always calls response.json()). This route relays that
 * JSON unchanged - the Frontend decodes the base64 into a Blob and
 * triggers the download client-side, the same way ConnectorGenerator's
 * "Download" button already builds a Blob from generated code.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  try {
    const result = await kernelClient.execute({
      workflow: "intelligence_compile.create",
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
