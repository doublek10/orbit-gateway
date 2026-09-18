import { NextRequest, NextResponse } from "next/server";
import { env } from "@/gateway/config/env";
import { kernelClient } from "@/gateway/kernel/kernel.client";
import { verifyWhatsAppSignature } from "@/gateway/whatsapp/signature";
import { whatsappClient } from "@/gateway/whatsapp/whatsapp.client";

/**
 * WhatsApp Webhook
 *
 * The one route in the Gateway that WhatsApp itself calls directly -
 * there is no Orbit session, and unlike every other route here, the
 * caller isn't the Frontend. Two responsibilities, same as the generic
 * /api/webhooks stub's own docstring promises for provider webhooks:
 *
 *   GET  - Meta's one-time subscription verification handshake.
 *   POST - inbound message delivery. MUST verify the payload's HMAC
 *          signature before forwarding anything to the Kernel.
 *
 * Business logic (what a message means, who it's from, what to reply)
 * lives entirely in the Kernel's whatsapp_channel package - this route
 * only verifies, normalizes, forwards, and relays the reply back to
 * Meta's Graph API.
 */

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.whatsapp.verifyToken && challenge) {
    // Meta expects the raw challenge string back, not JSON.
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: { code: "FORBIDDEN", message: "Verification failed" } }, {
    status: 403,
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    // Never forward an unverified payload to the Kernel - this is the
    // WhatsApp-equivalent of the bank/provider webhook rule in
    // /api/webhooks.
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Signature verification failed" } },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_INPUT", message: "Malformed webhook payload" } },
      { status: 400 },
    );
  }

  const messages = extractMessages(payload);

  // Meta expects a fast 200 regardless of outcome, or it will retry
  // (and eventually disable) the webhook - so every message is
  // processed best-effort and errors are swallowed here, never thrown
  // back to Meta. Real failures are still logged server-side.
  await Promise.all(
    messages.map(async (msg) => {
      try {
        const { reply } = await kernelClient.whatsappInbound({
          phone_number: msg.from,
          text: msg.text,
          wa_message_id: msg.id,
        });
        await whatsappClient.sendText(msg.from, reply);
      } catch (err) {
        console.error("WhatsApp inbound processing failed", err);
      }
    }),
  );

  return NextResponse.json({ received: true });
}

interface InboundMessage {
  from: string;
  text: string;
  id?: string;
}

/**
 * Meta's webhook payload nests messages several levels deep and also
 * delivers delivery/read *status* updates through the same endpoint -
 * those have no `messages` array and are silently ignored here (not
 * an error, just nothing Orbit needs to act on).
 */
function extractMessages(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  if (typeof payload !== "object" || payload === null || !("entry" in payload)) return out;

  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: unknown }).value as
        | { messages?: unknown[] }
        | undefined;
      const rawMessages = value?.messages;
      if (!Array.isArray(rawMessages)) continue;

      for (const m of rawMessages) {
        const message = m as {
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        };
        // Only plain text is handled today - media/interactive/location
        // messages are acknowledged (200) but produce no reply.
        if (message.type === "text" && message.from && message.text?.body) {
          out.push({ from: message.from, text: message.text.body, id: message.id });
        }
      }
    }
  }

  return out;
}
