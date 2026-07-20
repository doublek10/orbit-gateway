import { NextResponse } from "next/server";

/**
 * Webhook Reception
 *
 * Unlike every other route in the Gateway, webhooks are called by
 * external systems (banks, payment platforms, mobile money) - there is
 * no Orbit session to check. Instead this route MUST verify a
 * provider-specific signature before forwarding anything to the Kernel.
 * Signature verification is provider-specific and not implemented yet;
 * do not forward unverified payloads to the Kernel.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Webhook signature verification is not implemented yet.",
      },
    },
    { status: 501 },
  );
}
