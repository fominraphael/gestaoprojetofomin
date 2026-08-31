// Server-only helper de envio — usa a API de e-mail gerenciada da Lovable.
import { sendLovableEmail } from "@lovable.dev/email-js";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

const FROM = "noreply@notify.moduloabsn.com";
const SENDER_DOMAIN = "notify.moduloabsn.com";

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY ausente — não é possível enviar e-mail.");
  }

  const idempotencyKey = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await sendLovableEmail(
      {
        to,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: htmlToText(html),
        purpose: "transactional",
        label: "sistema",
        idempotency_key: idempotencyKey,
      },
      { apiKey },
    );
    console.log(`[email] enviado subject="${subject}"`);
  } catch (err) {
    const e = err as { code?: string; status?: number; message?: string };
    if (e?.code === "recipient_suppressed") {
      console.warn(`[email] destinatário suprimido — envio ignorado (subject="${subject}")`);
      return;
    }
    console.error("[email] falha no envio:", { code: e?.code, status: e?.status });
    throw err;
  }
}
