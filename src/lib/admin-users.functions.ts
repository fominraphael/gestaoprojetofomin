import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_USERNAME = "fominraphael";

/**
 * Redefine a senha de um usuário sem envolver e-mail.
 * Permitido apenas para admins (via has_role) ou para o superusuário `fominraphael`.
 */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; password: string }) => {
      if (!input?.userId) throw new Error("userId é obrigatório.");
      if (!input?.password || input.password.length < 6)
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica se o chamador é admin ou o superusuário.
    const [{ data: isAdmin }, { data: profile }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    ]);
    const isSuper = profile?.username === SUPER_USERNAME;
    if (!isAdmin && !isSuper) {
      throw new Error("Sem permissão para redefinir senhas.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
