// Server-only SMTP helper — usa worker-mailer (compatível com Cloudflare Workers).
// nodemailer não funciona no runtime workerd.
import { WorkerMailer } from "worker-mailer";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || user;
  // Remove qualquer espaço em branco da app password
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(`SMTP credentials missing (user=${!!user}, pass=${!!pass})`);
  }

  console.log(`[smtp] connecting host=${host} port=${port} user=${user} passLen=${pass.length}`);

  const mailer = await WorkerMailer.connect({
    host,
    port,
    // Porta 587 usa STARTTLS (secure=false); 465 usa TLS direto (secure=true)
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
    try {
      await mailer.close?.();
    } catch {
      /* noop */
    }
  }
}
