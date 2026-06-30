import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";

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
  /** UI keeps the English name; DB column is `ativo`. Mapped at lib layer. */
  active?: boolean;
  tipo_usuario?: string;
  pode_criar_admin?: boolean;
  campos_customizados?: Record<string, any>;
  created_at?: string;
}

// ---------- helpers ----------
function fromRow(row: any): UsuarioSistema {
  const { ativo, campos_schema, ...rest } = row;
  return {
    ...rest,
    active: ativo,
    modulos: row.modulos ?? [],
    campos_customizados: row.campos_customizados ?? {},
  };
}

function toRow<T extends Partial<UsuarioSistema>>(u: T) {
  const { active, password_hash, ...rest } = u as any;
  const out: any = { ...rest };
  if (active !== undefined) out.ativo = active;
  return out;
}

// ============================================================
// USUÁRIOS
// ============================================================
export async function obterUsuarios(): Promise<UsuarioSistema[]> {
  const { data, error } = await supabase
    .from("usuarios_sistema_public" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(fromRow);
}

export async function criarUsuario(
  usuario: Omit<UsuarioSistema, "id" | "created_at"> & { password?: string }
): Promise<UsuarioSistema> {
  const password_hash = usuario.password
    ? await hashPassword(usuario.password)
    : "4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2"; // sha256("root")

  const payload: any = {
    username: usuario.username,
    password_hash,
    role: usuario.role,
    status: usuario.status,
    cnpj: usuario.cnpj || null,
    empresa_id: usuario.empresa_id || null,
    modulos: usuario.modulos || [],
    ativo: usuario.active !== undefined ? usuario.active : true,
    tipo_usuario: usuario.tipo_usuario || "Lojista",
    pode_criar_admin: usuario.pode_criar_admin || false,
    campos_customizados: usuario.campos_customizados || {},
  };

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .insert([payload])
    .select("id, username, role, status, cnpj, empresa_id, modulos, ativo, tipo_usuario, pode_criar_admin, campos_customizados, created_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Login de acesso já cadastrado.");
    throw error;
  }
  return fromRow(data);
}

export async function atualizarUsuario(
  id: string,
  updates: Partial<UsuarioSistema> & { password?: string }
): Promise<void> {
  const payload: any = toRow(updates);
  if (updates.password) {
    payload.password_hash = await hashPassword(updates.password);
    delete payload.password;
  }
  const { error } = await supabase.from("usuarios_sistema").update(payload).eq("id", id);
  if (error) throw error;
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

export async function autenticar(username: string, password: string): Promise<UsuarioSistema> {
  const password_hash = await hashPassword(password);

  function checkStatus(u: UsuarioSistema): UsuarioSistema {
    if (u.active === false) throw new Error("Sua conta está inativa. Entre em contato com o administrador.");
    if (u.status === "pending") throw new Error("Sua solicitação de conta está pendente de aprovação pelo administrador.");
    if (u.status === "rejected") throw new Error("Sua solicitação de conta foi rejeitada pelo administrador.");
    return u;
  }

  // Direct match by username
  const { data: direct, error: directErr } = await supabase
    .from("usuarios_sistema")
    .select("id, username, role, status, cnpj, empresa_id, modulos, ativo, tipo_usuario, pode_criar_admin, campos_customizados, created_at")
    .eq("username", username)
    .eq("password_hash", password_hash)
    .maybeSingle();
  if (directErr) throw directErr;
  if (direct) return checkStatus(fromRow(direct));

  // Try CNPJ inside campos_customizados
  const cleanUsername = username.replace(/\D/g, "");
  if (cleanUsername.length === 14) {
    const { data: byCnpj, error: cnpjErr } = await supabase
      .from("usuarios_sistema")
      .select("id, username, role, status, cnpj, empresa_id, modulos, ativo, tipo_usuario, pode_criar_admin, campos_customizados, created_at")
      .eq("password_hash", password_hash)
      .filter("campos_customizados->>cnpj", "eq", cleanUsername)
      .maybeSingle();
    if (cnpjErr) throw cnpjErr;
    if (byCnpj) return checkStatus(fromRow(byCnpj));
  }

  throw new Error("Usuário ou senha incorretos.");
}

export async function atualizarStatusUsuario(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  return atualizarUsuario(id, { status });
}

export async function excluirUsuario(id: string): Promise<void> {
  const { error } = await supabase.from("usuarios_sistema").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// TIPOS DE USUÁRIO (perfis)
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

// Compatibility shim for older imports
export function getLocalTypes(): TipoUsuarioConfig[] {
  return [];
}
export function saveLocalTypes(_t: TipoUsuarioConfig[]) {}
