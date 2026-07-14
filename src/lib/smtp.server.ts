// Server-only SMTP helper — usa Lovable Email API quando disponível, senão worker-mailer.
import { sendLovableEmail } from "@lovable.dev/email-js";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

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
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const lovableSendUrl = process.env.LOVABLE_SEND_URL;
  const lovableFrom = process.env.LOVABLE_FROM || "noreply@notify.moduloabsn.com";
  const lovableDomain = process.env.LOVABLE_SENDER_DOMAIN || "notify.moduloabsn.com";

  // Tenta Lovable Email API primeiro
  if (lovableApiKey) {
    try {
      const messageId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sendLovableEmail(
        {
          to,
          from: lovableFrom,
          sender_domain: lovableDomain,
          subject,
          html,
          text: htmlToText(html),
          purpose: "transactional",
          label: "sistema",
          message_id: messageId,
          idempotency_key: messageId,
          unsubscribe_token: messageId,
        },
        { apiKey: lovableApiKey, sendUrl: lovableSendUrl },
      );
      console.log(`[lovable-email] sent to=${to} from=${lovableFrom} subject="${subject}"`);
      return;
    } catch (err) {
      console.error("[lovable-email] FALHA:", err);
      console.error("[lovable-email] params: from=" + lovableFrom + " domain=" + lovableDomain);
      throw err;
    }
  }

  // Fallback: SMTP direto via worker-mailer
  const { WorkerMailer } = await import("worker-mailer");
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || user;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(`SMTP credentials missing (user=${!!user}, pass=${!!pass})`);
  }

  const mailer = await WorkerMailer.connect({
    host,
    port,
    secure: port === 465,
    startTls: port === 587,
    credentials: { username: user, password: pass },
    authType: "login",
  });

  try {
    await mailer.send({
      from: { email: from!, name: "Alertas" },
      to: { email: to },
      subject,
      html,
    });
    console.log(`[smtp] sent to=${to} subject="${subject}"`);
  } finally {
    try { await mailer.close?.(); } catch {}
  }
}
