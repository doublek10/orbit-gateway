import { NextResponse } from "next/server";
import { KernelError } from "@/gateway/kernel/kernel.errors";
import { kernelClient } from "@/gateway/kernel/kernel.client";

/**
 * GET /api/countries
 *
 * Public, unauthenticated - the registration screen calls this before
 * any session exists so it can render the country picker from the
 * Kernel's Country Package registry instead of a hardcoded list
 * (spec: "The Frontend ... Retrieves available countries from the
 * Kernel"). Thin relay only, same as every other route in this
 * Gateway - the Kernel decides which countries are active.
 */
export async function GET() {
  try {
    const countries = await kernelClient.countries();
    return NextResponse.json({ countries });
  } catch (err) {
    if (err instanceof KernelError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unexpected error fetching countries" } },
      { status: 500 },
    );
  }
}
