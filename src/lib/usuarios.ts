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
  created_at?: string;
}

export interface UsuarioSistema {
  id: string;
  username: string; // Login de acesso
  password_hash?: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  cnpj?: string | null; // Keep for legacy database compatibility if needed
  empresa_id?: string | null; // Keep for legacy database compatibility if needed
  modulos?: string[]; // e.g. ["documentos", "gestao"]
  active?: boolean;
  tipo_usuario?: string;
  pode_criar_admin?: boolean;
  campos_customizados?: Record<string, any>;
  created_at?: string;
}

// SHA-256 of "root"
const ROOT_HASH = "4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2";
const LOCAL_KEY = "usuarios_sistema_v4";
const CONFIG_LOCAL_KEY = "tipos_usuario_config_v1";

// Default Seed for User Types
const DEFAULT_TYPES: TipoUsuarioConfig[] = [
  {
    id: "type-admin",
    nome: "Administrador",
    role: "admin",
    campos_schema: [],
  },
  {
    id: "type-lojista",
    nome: "Lojista",
    role: "user",
    campos_schema: [
      { nome: "cnpj", label: "CNPJ", tipo: "text", obrigatorio: true },
      { nome: "razao_social", label: "Razão Social", tipo: "text", obrigatorio: true },
    ],
  },
  {
    id: "type-adm-loja",
    nome: "ADM de loja",
    role: "user",
    campos_schema: [
      { nome: "cnpj", label: "CNPJ", tipo: "text", obrigatorio: true },
      { nome: "nome_loja", label: "Nome da Loja", tipo: "text", obrigatorio: false },
    ],
  },
];

export function getLocalTypes(): TipoUsuarioConfig[] {
  if (typeof window === "undefined") return DEFAULT_TYPES;
  const stored = localStorage.getItem(CONFIG_LOCAL_KEY);
  if (!stored) {
    localStorage.setItem(CONFIG_LOCAL_KEY, JSON.stringify(DEFAULT_TYPES));
    return DEFAULT_TYPES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_TYPES;
  }
}

export function saveLocalTypes(types: TipoUsuarioConfig[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_LOCAL_KEY, JSON.stringify(types));
  }
}

function getLocalUsers(): UsuarioSistema[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_KEY);
  if (!stored) {
    const seed: UsuarioSistema[] = [
      {
        id: "root-id",
        username: "root",
        password_hash: ROOT_HASH,
        role: "admin",
        status: "approved",
        cnpj: "",
        empresa_id: null,
        modulos: ["documentos", "gestao"],
        active: true,
        tipo_usuario: "Administrador",
        pode_criar_admin: true,
        campos_customizados: {},
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveLocalUsers(users: UsuarioSistema[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(users));
  }
}

export async function obterUsuarios(): Promise<UsuarioSistema[]> {
  try {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("id, username, role, status, cnpj, empresa_id, modulos, active, tipo_usuario, pode_criar_admin, campos_customizados, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as UsuarioSistema[];
  } catch {
    return getLocalUsers().map(({ password_hash: _p, ...u }) => u);
  }
}


export async function criarUsuario(usuario: Omit<UsuarioSistema, "id" | "created_at"> & { password?: string }): Promise<UsuarioSistema> {
  const password_hash = usuario.password ? await hashPassword(usuario.password) : ROOT_HASH;
  const newId = crypto.randomUUID();
  const newObj: UsuarioSistema = {
    id: newId,
    username: usuario.username,
    role: usuario.role,
    status: usuario.status,
    cnpj: usuario.cnpj || null,
    empresa_id: usuario.empresa_id || null,
    modulos: usuario.modulos || [],
    active: usuario.active !== undefined ? usuario.active : true,
    tipo_usuario: usuario.tipo_usuario || "Lojista",
    pode_criar_admin: usuario.pode_criar_admin || false,
    campos_customizados: usuario.campos_customizados || {},
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .insert([{
        username: usuario.username,
        password_hash,
        role: usuario.role,
        status: usuario.status,
        cnpj: usuario.cnpj || null,
        empresa_id: usuario.empresa_id || null,
        modulos: usuario.modulos || [],
        active: usuario.active !== undefined ? usuario.active : true,
        tipo_usuario: usuario.tipo_usuario || "Lojista",
        pode_criar_admin: usuario.pode_criar_admin || false,
        campos_customizados: usuario.campos_customizados || {}
      }])
      .select("id, username, role, status, cnpj, empresa_id, modulos, active, tipo_usuario, pode_criar_admin, campos_customizados, created_at");
    if (error) {
      if (error.code === "23505") throw new Error("Login de acesso já cadastrado.");
      throw error;
    }
    return data[0] as UsuarioSistema;
  } catch (err: any) {
    if (err.message?.includes("já cadastrado")) throw err;
    const users = getLocalUsers();
    if (users.some((u) => u.username === usuario.username)) {
      throw new Error("Login de acesso já cadastrado.");
    }
    const created: UsuarioSistema = {
      ...newObj,
      password_hash,
    };
    users.push(created);
    saveLocalUsers(users);
    return newObj;
  }
}

export async function atualizarUsuario(id: string, updates: Partial<UsuarioSistema> & { password?: string }): Promise<void> {
  const payload: any = { ...updates };
  if (updates.password) {
    payload.password_hash = await hashPassword(updates.password);
    delete payload.password;
  }

  try {
    const { error } = await supabase
      .from("usuarios_sistema")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  } catch {
    const users = getLocalUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...updates,
        ...(updates.password ? { password_hash: await hashPassword(updates.password) } : {}),
      };
      // Prevent deleting password_hash if not updated
      delete (users[idx] as any).password;
      saveLocalUsers(users);
    }
  }
}

export async function solicitarCriacaoConta(username: string, password: string): Promise<UsuarioSistema> {
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

  async function checkStatus(user: UsuarioSistema) {
    if (user.active === false) {
      throw new Error("Sua conta está inativa. Entre em contato com o administrador.");
    }
    if (user.status === "pending") {
      throw new Error("Sua solicitação de conta está pendente de aprovação pelo administrador.");
    }
    if (user.status === "rejected") {
      throw new Error("Sua solicitação de conta foi rejeitada pelo administrador.");
    }
    return user;
  }

  try {
    // Check in database
    // We search by username (login de acesso) OR if the username matches a CNPJ inside campos_customizados
    const cleanUsername = username.replace(/\D/g, "");
    
    let query = supabase.from("usuarios_sistema").select("id, username, role, status, cnpj, empresa_id, modulos, active, tipo_usuario, pode_criar_admin, campos_customizados, created_at");
    
    // Check direct username match first
    const { data: directData, error: directError } = await query.eq("username", username).eq("password_hash", password_hash).maybeSingle();
    
    if (directData) {
      return await checkStatus(directData as UsuarioSistema);
    }
    
    // If not found and input looks like CNPJ, we search inside jsonb campos_customizados->>'cnpj'
    if (cleanUsername.length === 14) {
      const { data: cnpjData, error: cnpjError } = await supabase
        .from("usuarios_sistema")
        .select("id, username, role, status, cnpj, empresa_id, modulos, active, tipo_usuario, pode_criar_admin, campos_customizados, created_at")
        .eq("password_hash", password_hash)
        .filter("campos_customizados->>cnpj", "eq", cleanUsername)
        .maybeSingle();
        
      if (cnpjData) {
        return await checkStatus(cnpjData as UsuarioSistema);
      }
    }
    
    throw new Error("Usuário ou senha incorretos.");
  } catch (err: any) {
    if (err.message?.includes("inativa") || err.message?.includes("pendente") || err.message?.includes("rejeitada")) {
      throw err;
    }
    
    // Fallback localStorage
    const users = getLocalUsers();
    const cleanUsername = username.replace(/\D/g, "");
    
    const found = users.find((u) => {
      const isDirectMatch = u.username === username;
      const isCnpjMatch = cleanUsername.length === 14 && u.campos_customizados?.cnpj?.replace(/\D/g, "") === cleanUsername;
      return (isDirectMatch || isCnpjMatch) && u.password_hash === password_hash;
    });
    
    if (!found) throw new Error("Usuário ou senha incorretos.");
    return await checkStatus(found);
  }
}

export async function atualizarStatusUsuario(id: string, status: "approved" | "rejected"): Promise<void> {
  return atualizarUsuario(id, { status });
}

export async function excluirUsuario(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("usuarios_sistema").delete().eq("id", id);
    if (error) throw error;
  } catch {
    const users = getLocalUsers().filter((u) => u.id !== id);
    saveLocalUsers(users);
  }
}

// --- TIPOS DE USUARIO CONFIG ACTIONS ---

export async function obterTiposUsuarioConfig(): Promise<TipoUsuarioConfig[]> {
  try {
    const { data, error } = await supabase
      .from("tipos_usuario_config")
      .select("id, nome, role, campos_schema, created_at")
      .order("nome", { ascending: true });
    if (error) throw error;
    return data as TipoUsuarioConfig[];
  } catch {
    return getLocalTypes();
  }
}

export async function criarTipoUsuarioConfig(tipo: Omit<TipoUsuarioConfig, "id" | "created_at">): Promise<TipoUsuarioConfig> {
  const newId = crypto.randomUUID();
  const newObj: TipoUsuarioConfig = {
    id: newId,
    nome: tipo.nome,
    role: tipo.role,
    campos_schema: tipo.campos_schema,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("tipos_usuario_config")
      .insert([tipo])
      .select("id, nome, role, campos_schema, created_at");
    if (error) throw error;
    return data[0] as TipoUsuarioConfig;
  } catch {
    const types = getLocalTypes();
    if (types.some((t) => t.nome.toLowerCase() === tipo.nome.toLowerCase())) {
      throw new Error(`Tipo de usuário "${tipo.nome}" já existe.`);
    }
    types.push(newObj);
    saveLocalTypes(types);
    return newObj;
  }
}

export async function atualizarTipoUsuarioConfig(id: string, updates: Partial<TipoUsuarioConfig>): Promise<void> {
  try {
    const { error } = await supabase
      .from("tipos_usuario_config")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  } catch {
    const types = getLocalTypes();
    const idx = types.findIndex((t) => t.id === id);
    if (idx !== -1) {
      types[idx] = {
        ...types[idx],
        ...updates,
      };
      saveLocalTypes(types);
    }
  }
}

export async function excluirTipoUsuarioConfig(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("tipos_usuario_config")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const types = getLocalTypes().filter((t) => t.id !== id);
    saveLocalTypes(types);
  }
}

