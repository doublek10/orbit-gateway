import { NextResponse } from "next/server";

/**
 * Used by domain routes whose corresponding Kernel Workflow Engine
 * capability doesn't exist yet. Returns a clean, honest 501 instead of a
 * fake 200 - so the frontend can distinguish "not built yet" from
 * "actually failed".
 */
export function notImplemented(capability: string) {
  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `${capability} is not implemented in the Kernel's Workflow Engine yet.`,
      },
    },
    { status: 501 },
  );
}
