/**
 * Aggregates Gateway + Kernel health for the /api/health route.
 */
import { kernelClient } from "@/gateway/kernel/kernel.client";

export async function checkPlatformHealth() {
  try {
    const kernel = await kernelClient.health();
    return { gateway: "ok", kernel: kernel.status, database: kernel.database };
  } catch {
    return { gateway: "ok", kernel: "unreachable", database: false };
  }
}
