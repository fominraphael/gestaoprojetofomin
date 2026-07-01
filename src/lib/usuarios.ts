import { supabase } from "@/integrations/supabase/client";

const EMAIL_DOMAIN = "gestao.local";
const usernameToEmail = (u: string) =>
  u.includes("@") ? u.toLowerCase() : `${u.toLowerCase()}@${EMAIL_DOMAIN}`;

export interface TipoUsuarioConfig {
  id: string;
  nome: string;
  role: "admin" | "user";
  campos_schema: {
    nome: string;
    label: string;
    tipo: "text" | "number" | "boolean";
    obrigatorio: boolean;
  }[];
  ativo?: boolean;
  created_at?: string;
}

export interface UsuarioSistema {
  id: string;
  username: string;
  password_hash?: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  cnpj?: string | null;
  empresa_id?: string | null;
  modulos?: string[];
  active?: boolean;
  tipo_usuario?: string;
  pode_criar_admin?: boolean;
  campos_customizados?: Record<string, any>;
  created_at?: string;
}

function profileToUsuario(p: any, role: "admin" | "user"): UsuarioSistema {
  return {
    id: p.id,
    username: p.username ?? "",
    role,
    status: (p.status ?? "approved") as any,
    cnpj: p.cnpj ?? null,
    empresa_id: p.empresa_id ?? null,
    modulos: p.modulos ?? [],
    active: p.ativo ?? true,
    tipo_usuario: p.tipo_usuario ?? "Lojista",
    pode_criar_admin: p.pode_criar_admin ?? false,
    campos_customizados: p.campos_customizados ?? {},
    created_at: p.created_at,
  };
}

// ============================================================
// USUÁRIOS — agora ancorado em profiles + user_roles + auth
// ============================================================
export async function obterUsuarios(): Promise<UsuarioSistema[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
  return ((profiles as any[]) ?? []).map((p) =>
    profileToUsuario(p, adminSet.has(p.id) ? "admin" : "user")
  );
}

export async function criarUsuario(
  usuario: Omit<UsuarioSistema, "id" | "created_at"> & { password?: string }
): Promise<UsuarioSistema> {
  const password = usuario.password || "Trocar@2026!";
  const email = usernameToEmail(usuario.username);

  // Preserve the current admin session — signUp otherwise switches the active
  // session to the newly created user, effectively logging the admin out.
  const { data: currentSessionData } = await supabase.auth.getSession();
  const preservedSession = currentSessionData.session;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        username: usuario.username,
        tipo_usuario: usuario.tipo_usuario ?? "Lojista",
        modulos: usuario.modulos ?? ["gestao"],
        empresa_id: usuario.empresa_id ?? null,
        cnpj: usuario.cnpj ?? null,
        pode_criar_admin: usuario.pode_criar_admin ?? false,
        campos_customizados: usuario.campos_customizados ?? {},
        ativo: usuario.active ?? true,
        status: usuario.status ?? "approved",
        role: usuario.role ?? "user",
      },
    },
  });

  // Restore the admin session regardless of signUp outcome.
  if (preservedSession) {
    try {
      await supabase.auth.setSession({
        access_token: preservedSession.access_token,
        refresh_token: preservedSession.refresh_token,
      });
    } catch {
      // best-effort; ignore restore failure
    }
  }

  if (error) {
    if (error.message.toLowerCase().includes("already") || (error as any).code === "user_already_exists")
      throw new Error("Login de acesso já cadastrado.");
    throw error;
  }
  if (!data.user) throw new Error("Falha ao criar usuário.");

  return {
    id: data.user.id,
    username: usuario.username,
    role: usuario.role ?? "user",
    status: usuario.status ?? "approved",
    cnpj: usuario.cnpj ?? null,
    empresa_id: usuario.empresa_id ?? null,
    modulos: usuario.modulos ?? [],
    active: usuario.active ?? true,
    tipo_usuario: usuario.tipo_usuario ?? "Lojista",
    pode_criar_admin: usuario.pode_criar_admin ?? false,
    campos_customizados: usuario.campos_customizados ?? {},
  };
}

export async function atualizarUsuario(
  id: string,
  updates: Partial<UsuarioSistema> & { password?: string }
): Promise<void> {
  const payload: any = {};
  if (updates.username !== undefined) payload.username = updates.username;
  if (updates.tipo_usuario !== undefined) payload.tipo_usuario = updates.tipo_usuario;
  if (updates.modulos !== undefined) payload.modulos = updates.modulos;
  if (updates.empresa_id !== undefined) payload.empresa_id = updates.empresa_id;
  if (updates.cnpj !== undefined) payload.cnpj = updates.cnpj;
  if (updates.pode_criar_admin !== undefined) payload.pode_criar_admin = updates.pode_criar_admin;
  if (updates.campos_customizados !== undefined) payload.campos_customizados = updates.campos_customizados;
  if (updates.active !== undefined) payload.ativo = updates.active;
  if (updates.status !== undefined) payload.status = updates.status;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from("profiles").update(payload).eq("id", id);
    if (error) throw error;
  }

  // Atualizar role (somente admin pode — RLS bloqueia caso contrário)
  if (updates.role !== undefined) {
    const { data: existing } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", id);
    const hasAdmin = (existing ?? []).some((r: any) => r.role === "admin");
    if (updates.role === "admin" && !hasAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
      if (error) throw error;
    } else if (updates.role === "user" && hasAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", "admin");
      if (error) throw error;
    }
  }

  if (updates.password) {
    // Senha só pode ser alterada via fluxo de reset/atualização do próprio usuário.
    // Para o próprio usuário logado, usamos supabase.auth.updateUser.
    const { data: au } = await supabase.auth.getUser();
    if (au.user?.id === id) {
      const { error } = await supabase.auth.updateUser({ password: updates.password });
      if (error) throw error;
    } else {
      throw new Error(
        "Alteração de senha de outro usuário requer redefinição via e-mail (não suportado nesta interface)."
      );
    }
  }
}

export async function solicitarCriacaoConta(
  username: string,
  password: string
): Promise<UsuarioSistema> {
  return criarUsuario({
    username,
    password,
    role: "user",
    status: "pending",
    cnpj: null,
    empresa_id: null,
    modulos: ["gestao"],
    active: true,
    tipo_usuario: "Lojista",
    pode_criar_admin: false,
    campos_customizados: {},
  });
}

/**
 * @deprecated A autenticação agora é feita pelo Supabase Auth via useAuth().login.
 */
export async function autenticar(username: string, password: string): Promise<UsuarioSistema> {
  const email = usernameToEmail(username);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Usuário ou senha incorretos.");
  const { data: au } = await supabase.auth.getUser();
  if (!au.user) throw new Error("Falha ao autenticar.");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", au.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", au.user.id),
  ]);
  const role: "admin" | "user" =
    (roles ?? []).some((r: any) => r.role === "admin") ? "admin" : "user";
  if (!profile) throw new Error("Perfil não encontrado.");
  return profileToUsuario(profile, role);
}

export async function atualizarStatusUsuario(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  return atualizarUsuario(id, { status });
}

export async function excluirUsuario(id: string): Promise<void> {
  // Soft delete: marca como inativo. Exclusão real exige service_role.
  const { error } = await supabase.from("profiles").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

// ============================================================
// TIPOS DE USUÁRIO (perfis) — sem mudanças estruturais
// ============================================================
function fromTipoRow(row: any): TipoUsuarioConfig {
  return {
    id: row.id,
    nome: row.nome,
    role: row.role,
    campos_schema: row.campos_schema || [],
    ativo: row.ativo,
    created_at: row.created_at,
  };
}

export async function obterTiposUsuarioConfig(): Promise<TipoUsuarioConfig[]> {
  const { data, error } = await supabase
    .from("tipos_usuario_config")
    .select("id, nome, role, campos_schema, ativo, created_at")
    .order("nome", { ascending: true });
  if (error) throw error;
  return ((data as any[]) || []).map(fromTipoRow);
}

export async function criarTipoUsuarioConfig(
  tipo: Omit<TipoUsuarioConfig, "id" | "created_at">
): Promise<TipoUsuarioConfig> {
  const { data, error } = await supabase
    .from("tipos_usuario_config")
    .insert([{
      nome: tipo.nome,
      role: tipo.role,
      campos_schema: tipo.campos_schema as any,
      ativo: tipo.ativo ?? true,
    }])
    .select("id, nome, role, campos_schema, ativo, created_at")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`Tipo de usuário "${tipo.nome}" já existe.`);
    throw error;
  }
  return fromTipoRow(data);
}

export async function atualizarTipoUsuarioConfig(
  id: string,
  updates: Partial<TipoUsuarioConfig>
): Promise<void> {
  const payload: any = { ...updates };
  if (payload.campos_schema) payload.campos_schema = payload.campos_schema as any;
  const { error } = await supabase
    .from("tipos_usuario_config")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function excluirTipoUsuarioConfig(id: string): Promise<void> {
  const { error } = await supabase.from("tipos_usuario_config").delete().eq("id", id);
  if (error) throw error;
}

export function getLocalTypes(): TipoUsuarioConfig[] {
  return [];
}
export function saveLocalTypes(_t: TipoUsuarioConfig[]) {}
