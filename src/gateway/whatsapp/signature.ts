import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/gateway/config/env";

/**
 * Verifies Meta's X-Hub-Signature-256 header on an inbound WhatsApp
 * Cloud API webhook call.
 *
 * Meta signs the *raw* request body (before any JSON parsing) with
 * HMAC-SHA256 keyed by the Meta App Secret. This MUST run on the raw
 * bytes/string exactly as received - re-serializing a parsed JSON
 * object and hashing that instead can silently produce a different
 * signature (key order, whitespace) and either reject legitimate
 * traffic or, worse, be worked around. Nothing gets forwarded to the
 * Kernel until this passes.
 */
export function verifyWhatsAppSignature(rawBody: string, header: string | null): boolean {
  if (!header || !env.whatsapp.appSecret) return false;

  const expectedPrefix = "sha256=";
  if (!header.startsWith(expectedPrefix)) return false;

  const providedHex = header.slice(expectedPrefix.length);
  const expectedHex = createHmac("sha256", env.whatsapp.appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const provided = Buffer.from(providedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  // Different lengths would throw inside timingSafeEqual - treat that
  // as "not a match" rather than letting it bubble up as a 500.
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(provided, expected);
}
