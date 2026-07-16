import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSuperUser } from "@/lib/superadmin";

/**
 * Redefine a senha de um usuário sem envolver e-mail.
 * Permitido apenas para admins (via has_role) ou para o superusuário `fominraphael`.
 */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input?.userId) throw new Error("userId é obrigatório.");
    if (!input?.password || input.password.length < 6)
      throw new Error("A senha deve ter no mínimo 6 caracteres.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica se o chamador é admin ou o superusuário.
    const [{ data: isAdmin }, { data: profile }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    ]);
    const isSuper = isSuperUser(profile?.username);
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

/**
 * Exclui um usuário permanentemente (hard delete).
 * Remove de auth.users (cascade para profiles e user_roles).
 * Não permite excluir o próprio usuário logado.
 */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("userId é obrigatório.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.userId === userId) {
      throw new Error("Não é possível excluir seu próprio usuário.");
    }

    const [{ data: isAdmin }, { data: profile }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    ]);
    const isSuper = isSuperUser(profile?.username);
    if (!isAdmin && !isSuper) {
      throw new Error("Sem permissão para excluir usuários.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove auth user (cascade: profiles, user_roles, push_subscriptions)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
