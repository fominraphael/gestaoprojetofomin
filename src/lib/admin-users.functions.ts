import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSuperUser } from "@/lib/superadmin";

/**
 * Cria um novo usuário via Supabase Admin API (service role).
 * NÃO afeta a sessão do admin logado.
 * Usado para importação em massa e criação administrativa.
 */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      username: string;
      tipo_usuario?: string;
      modulos?: string[];
      status?: string;
      ativo?: boolean;
      cnpj?: string | null;
      empresa_id?: string | null;
      nome_fantasia?: string | null;
      pode_criar_admin?: boolean;
      central_compras?: boolean;
      campos_customizados?: Record<string, any>;
    }) => {
      if (!input?.email) throw new Error("email é obrigatório.");
      if (!input?.password || input.password.length < 6)
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      if (!input?.username) throw new Error("username é obrigatório.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica se o chamador é admin ou superusuário
    const [{ data: isAdmin }, { data: profile }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    ]);
    const isSuper = isSuperUser(profile?.username);
    if (!isAdmin && !isSuper) {
      throw new Error("Sem permissão para criar usuários.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username,
        tipo_usuario: data.tipo_usuario ?? "Lojista",
        modulos: data.modulos ?? ["gestao"],
        empresa_id: data.empresa_id ?? null,
        cnpj: data.cnpj ?? null,
        nome_fantasia: data.nome_fantasia ?? null,
        pode_criar_admin: data.pode_criar_admin ?? false,
        central_compras: data.central_compras ?? false,
        campos_customizados: data.campos_customizados ?? {},
        ativo: data.ativo ?? true,
        status: data.status ?? "approved",
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already")) {
        throw new Error("Login de acesso já cadastrado.");
      }
      throw new Error(error.message);
    }
    if (!created?.user) throw new Error("Falha ao criar usuário.");

    // Update the profile with correct field values (signUp metadata doesn't always persist)
    const profilePayload: {
      username: string;
      tipo_usuario: string;
      modulos: string[];
      status: string;
      ativo: boolean;
      cnpj?: string | null;
      empresa_id?: string | null;
      nome_fantasia?: string | null;
      pode_criar_admin?: boolean;
      central_compras?: boolean;
      campos_customizados?: Record<string, any>;
    } = {
      username: data.username,
      tipo_usuario: data.tipo_usuario ?? "Lojista",
      modulos: data.modulos ?? ["gestao"],
      status: data.status ?? "approved",
      ativo: data.ativo ?? true,
    };
    if (data.cnpj !== undefined) profilePayload.cnpj = data.cnpj;
    if (data.empresa_id !== undefined) profilePayload.empresa_id = data.empresa_id;
    if (data.nome_fantasia !== undefined) profilePayload.nome_fantasia = data.nome_fantasia;
    if (data.pode_criar_admin !== undefined) profilePayload.pode_criar_admin = data.pode_criar_admin;
    if (data.central_compras !== undefined) profilePayload.central_compras = data.central_compras;
    if (data.campos_customizados !== undefined)
      profilePayload.campos_customizados = data.campos_customizados;

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(profilePayload as any)
      .eq("id", created.user.id);
    if (profileErr) {
      console.error("Profile update after create:", profileErr);
    }

    // Insert role
    const role = data.tipo_usuario === "Administrador" ? "admin" : "user";
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role });
    if (roleErr) {
      console.error("Role insert after create:", roleErr);
    }

    return { id: created.user.id, username: data.username };
  });

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
