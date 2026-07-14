// Server-only SMTP helper — usa Lovable Email API quando disponível, senão worker-mailer.
import { sendLovableEmail } from "@lovable.dev/email-js";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const lovableSendUrl = process.env.LOVABLE_SEND_URL;

  // Tenta Lovable Email API primeiro
  if (lovableApiKey) {
    try {
      const messageId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sendLovableEmail(
        {
          to,
          from: process.env.SMTP_FROM || "noreply@notify.moduloabsn.com",
          sender_domain: "moduloabsn.com",
          subject,
          html,
          purpose: "transactional",
          label: "sistema",
          message_id: messageId,
          idempotency_key: messageId,
        },
        { apiKey: lovableApiKey, sendUrl: lovableSendUrl },
      );
      console.log(`[lovable-email] sent to=${to} subject="${subject}"`);
      return;
    } catch (err) {
      console.error("[lovable-email] falha, fallback para SMTP:", err);
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
