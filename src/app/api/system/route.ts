import { NextRequest, NextResponse } from "next/server";
import { requireAccessToken } from "@/gateway/middleware/require-access-token";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { KernelError } from "@/gateway/kernel/kernel.errors";

/**
 * System administration. Same pass-through shape as every other route -
 * the Gateway does not decide who counts as an admin. The Kernel's
 * Permission Engine is what will reject this at the /execute call once
 * "system.read" is a real permission grant checked there.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAccessToken();
  if (guard instanceof NextResponse) return guard;

  try {
    const result = await kernelClient.execute({
      workflow: "system.read",
      supabase_access_token: guard,
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
    return NextResponse.json({ error: { code: "INTERNAL", message: "Unexpected error" } }, { status: 500 });
  }
}
