import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";
import { whatsappClient } from "@/gateway/whatsapp/whatsapp.client";

/**
 * whatsapp/verify/start
 *
 * Step 1 of the "type your number, get a code" flow: the Kernel
 * generates and stores a one-time code (whatsapp.verify_start), then
 * the Gateway - and only the Gateway, per the Kernel/Gateway split -
 * sends it to the user's number via a Meta-approved Authentication
 * template. The code itself is never returned to the browser; only
 * WhatsApp delivers it.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  if (!body.phone_number || typeof body.phone_number !== "string") {
    return NextResponse.json(
      { error: { code: "BAD_INPUT", message: "phone_number is required" } },
      { status: 422 },
    );
  }

  try {
    const result = await kernelClient.execute<{
      code: string;
      phone_number: string;
      expires_at: string;
    }>({
      workflow: "whatsapp.verify_start",
      payload: { phone_number: body.phone_number },
      supabase_access_token: guard,
      company_id: companyId,
      request_id: crypto.randomUUID(),
    });

    await whatsappClient.sendAuthCode(result.phone_number, result.code);

    return NextResponse.json({ sent: true, expires_at: result.expires_at });
  } catch (err) {
    if (err instanceof KernelError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "WHATSAPP_SEND_FAILED",
          message: "Could not send the verification code. Please try again.",
        },
      },
      { status: 502 },
    );
  }
}
