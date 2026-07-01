import { createServerFn } from "@tanstack/react-start";

// Server functions públicas (sem middleware de auth) para o fluxo de
// recuperação de senha via código de validação (OTP) enviado por e-mail.

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // 6 dígitos, com zeros à esquerda
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function loadProfileByUsername(username: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, email_recuperacao")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Etapa 1: usuário digita o username → sistema gera um código de 6 dígitos,
 * salva no banco e envia por e-mail para `profiles.email_recuperacao`.
 *
 * Resposta é sempre { ok: true } para não vazar quais usernames existem.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) => {
    if (!input?.username?.trim()) throw new Error("Informe o usuário.");
    return { username: input.username.trim() };
  })
  .handler(async ({ data }) => {
    try {
      const profile = await loadProfileByUsername(data.username);
      if (!profile || !profile.email_recuperacao) {
        // Não revela ao caller o motivo
        console.warn(
          `[reset] username="${data.username}" sem email_recuperacao ou inexistente`,
        );
        return { ok: true };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendMail } = await import("@/lib/smtp.server");

      // Invalida códigos anteriores não usados
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", profile.id)
        .is("used_at", null);

      const code = generateCode();
      const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

      const { error: insErr } = await supabaseAdmin
        .from("password_reset_codes")
        .insert({
          user_id: profile.id,
          code,
          expires_at: expires.toISOString(),
        });
      if (insErr) throw new Error(insErr.message);

      const html = `
        <p>Olá,</p>
        <p>Recebemos uma solicitação para redefinir a senha do usuário <strong>${profile.username}</strong>.</p>
        <p>Seu código de verificação é:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f4f4f5;padding:12px 16px;display:inline-block;border-radius:8px">${code}</p>
        <p>O código expira em ${CODE_TTL_MINUTES} minutos e só pode ser usado uma vez.</p>
        <p>Se você não solicitou, ignore este e-mail.</p>
      `;

      await sendMail({
        to: profile.email_recuperacao,
        subject: `Código de recuperação de senha — ${code}`,
        html,
      });

      return { ok: true };
    } catch (e: any) {
      console.error("[requestPasswordReset] falhou:", e?.message, e?.stack);
      // Ainda retorna ok:true para não vazar; log fica no servidor
      return { ok: true };
    }
  });

/**
 * Etapa 2: verifica se o código digitado bate. Não faz reset ainda —
 * apenas confirma que o par (username, code) é válido para habilitar a
 * etapa 3 na UI.
 */
export const verifyResetCode = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; code: string }) => {
    if (!input?.username?.trim()) throw new Error("Informe o usuário.");
    if (!input?.code?.trim()) throw new Error("Informe o código.");
    return { username: input.username.trim(), code: input.code.trim() };
  })
  .handler(async ({ data }) => {
    const profile = await loadProfileByUsername(data.username);
    if (!profile) throw new Error("Código inválido ou expirado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("password_reset_codes")
      .select("id, code, expires_at, used_at, attempts")
      .eq("user_id", profile.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Código inválido ou expirado.");

    if (row.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", row.id);
      throw new Error("Muitas tentativas. Solicite um novo código.");
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Código expirado. Solicite um novo.");
    }

    if (row.code !== data.code) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Código incorreto.");
    }

    return { ok: true };
  });

/**
 * Etapa 3: aplica a nova senha. Revalida o código, marca como usado e
 * chama a Admin API para trocar a senha.
 */
export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { username: string; code: string; newPassword: string }) => {
      if (!input?.username?.trim()) throw new Error("Informe o usuário.");
      if (!input?.code?.trim()) throw new Error("Informe o código.");
      if (!input?.newPassword || input.newPassword.length < 6)
        throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
      return {
        username: input.username.trim(),
        code: input.code.trim(),
        newPassword: input.newPassword,
      };
    },
  )
  .handler(async ({ data }) => {
    const profile = await loadProfileByUsername(data.username);
    if (!profile) throw new Error("Código inválido ou expirado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("password_reset_codes")
      .select("id, code, expires_at, used_at, attempts")
      .eq("user_id", profile.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Código inválido ou expirado.");
    if (new Date(row.expires_at).getTime() < Date.now())
      throw new Error("Código expirado. Solicite um novo.");
    if (row.code !== data.code) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Código incorreto.");
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: data.newPassword },
    );
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true };
  });
