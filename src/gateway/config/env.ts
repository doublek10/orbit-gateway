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
  sessionCookie: "orbit_session",

  nodeEnv: process.env.NODE_ENV ?? "development",

  // --- WhatsApp Channel: the Gateway is the only thing that ever talks
  // to Meta's public Graph API (Development Rule: the Kernel never
  // touches the public internet) - it verifies inbound webhook
  // signatures and sends outbound replies. The Kernel only ever
  // receives an already-verified, normalized message and returns plain
  // reply text; it holds none of these secrets.
  whatsapp: {
    // Arbitrary string Meta calls back with during the one-time webhook
    // subscription handshake (GET /api/whatsapp/webhook) - must match
    // what's configured in the Meta App dashboard.
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "changeme-whatsapp-verify-token",
    // Meta App Secret - used to verify the X-Hub-Signature-256 HMAC on
    // every inbound webhook POST. Never forward an unverified payload.
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    // System-user access token used to call the Graph API to send replies.
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    // The Cloud API phone_number_id (not the phone number itself)
    // outbound messages are sent from.
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0",
    // Name of the Meta-approved Authentication-category template used
    // to send one-time verification codes to a number that hasn't
    // messaged Orbit first. Must exist and be APPROVED in Meta Business
    // Manager under WhatsApp Manager > Message Templates before the
    // dashboard's "connect a number" flow will work.
    authTemplateName: process.env.WHATSAPP_AUTH_TEMPLATE_NAME ?? "orbit_verification",
    authTemplateLanguage: process.env.WHATSAPP_AUTH_TEMPLATE_LANGUAGE ?? "en_US",
  },
};

// Trim every WhatsApp secret defensively - a trailing newline pasted
// into a hosting provider's env var UI is a very common way to get a
// silently-invalid "Bearer <token>\n" header that Meta's Graph API
// rejects with a 401 that looks identical to a genuinely wrong token.
env.whatsapp.appSecret = env.whatsapp.appSecret.trim();
env.whatsapp.accessToken = env.whatsapp.accessToken.trim();
env.whatsapp.phoneNumberId = env.whatsapp.phoneNumberId.trim();
env.whatsapp.verifyToken = env.whatsapp.verifyToken.trim();
