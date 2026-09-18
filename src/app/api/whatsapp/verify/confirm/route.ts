import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * whatsapp/verify/confirm
 *
 * Step 2: the user types the code they received on WhatsApp back into
 * the dashboard. Purely a Kernel round trip - the Gateway plays no
 * part beyond forwarding, since confirming doesn't need to talk to
 * Meta at all.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  if (!body.phone_number || !body.code) {
    return NextResponse.json(
      { error: { code: "BAD_INPUT", message: "phone_number and code are required" } },
      { status: 422 },
    );
  }

  try {
    const result = await kernelClient.execute<{ linked: boolean }>({
      workflow: "whatsapp.verify_confirm",
      payload: { phone_number: body.phone_number, code: body.code },
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
