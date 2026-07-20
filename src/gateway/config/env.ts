/**
 * Single source of truth for Gateway environment configuration.
 * Nothing else in the codebase should read `process.env` directly.
 */
export const env = {
  // Where the Orbit Kernel lives. Private network only - never a public URL.
  kernelUrl: process.env.KERNEL_URL ?? "http://localhost:8000",

  // Must match the Kernel's GATEWAY_SHARED_SECRET exactly.
  gatewaySharedSecret:
    process.env.GATEWAY_SHARED_SECRET ?? "changeme-gateway-shared-secret",

  // Cookie names the Gateway uses to carry Supabase tokens between the
  // browser and the Kernel. The Gateway does not sign, verify, or
  // interpret these values - it only stores and forwards them. That
  // decision-making happens exclusively in the Kernel.
  accessTokenCookie: "orbit_access_token",
  refreshTokenCookie: "orbit_refresh_token",

  nodeEnv: process.env.NODE_ENV ?? "development",
};
