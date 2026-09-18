import { env } from "@/gateway/config/env";

/**
 * WhatsApp Client
 *
 * The Gateway's only door to Meta's WhatsApp Cloud API, symmetrical
 * with kernel.client.ts being the Gateway's only door to the Kernel.
 * Sending is the one piece of "external API communication" the
 * Developer Overview explicitly assigns to the Gateway rather than the
 * Kernel - the Kernel decides *what* to say (via /whatsapp/inbound's
 * reply text), the Gateway is the only thing that actually says it.
 */
class WhatsAppClient {
  async sendText(to: string, body: string): Promise<void> {
    if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
      console.error("WhatsApp send skipped: WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID not configured");
      return;
    }

    const url = `https://graph.facebook.com/${env.whatsapp.graphApiVersion}/${env.whatsapp.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        // WhatsApp truncates/rejects overly long messages; Orbit's
        // formatter keeps replies short, but this is a hard backstop.
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error("WhatsApp send failed", { status: res.status, body: errorBody });
    }
  }

  /**
   * Sends a one-time verification code using Meta's Authentication
   * template category - the only way to message a number that hasn't
   * messaged Orbit first (WhatsApp's "business-initiated conversation"
   * rule). The template must exist and be approved in Meta Business
   * Manager; its single body variable is the code itself, and
   * Authentication templates conventionally add their own "Copy code"
   * button automatically once the {{1}} placeholder is filled in.
   */
  async sendAuthCode(to: string, code: string): Promise<void> {
    if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
      console.error("WhatsApp auth-code send skipped: credentials not configured");
      return;
    }

    const url = `https://graph.facebook.com/${env.whatsapp.graphApiVersion}/${env.whatsapp.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: env.whatsapp.authTemplateName,
          language: { code: env.whatsapp.authTemplateLanguage },
          // NOTE: Meta's exact button component shape for Authentication
          // templates has changed over API versions (older: a "url"
          // button with the code baked into the link; newer: a
          // dedicated "copy_code" button type). Check what your
          // approved template actually declares in WhatsApp Manager and
          // match the button `sub_type` here - if your template has no
          // button at all (a bare OTP-in-body template), delete the
          // second `components` entry below.
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error("WhatsApp auth-code send failed", { status: res.status, body: errorBody });
      throw new Error("Could not send the WhatsApp verification code");
    }
  }
}

export const whatsappClient = new WhatsAppClient();
