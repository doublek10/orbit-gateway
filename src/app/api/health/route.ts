import { NextResponse } from "next/server";
import { checkPlatformHealth } from "@/gateway/monitoring/health";

export async function GET() {
  const health = await checkPlatformHealth();
  const ok = health.gateway === "ok" && health.kernel === "ok";
  return NextResponse.json(health, { status: ok ? 200 : 503 });
}
