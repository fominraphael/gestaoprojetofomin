import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";

export interface UsuarioSistema {
  id: string;
  username: string;
  password_hash?: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  cnpj?: string | null;
  empresa_id?: string | null;
  modulos?: string[]; // e.g. ["documentos", "gestao"]
  active?: boolean;
  created_at?: string;
}

// SHA-256 of "root"
const ROOT_HASH = "4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2";
const LOCAL_KEY = "usuarios_sistema_v3";

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
      .select("id, username, role, status, cnpj, empresa_id, modulos, active, created_at")
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
        active: usuario.active !== undefined ? usuario.active : true
      }])
      .select("id, username, role, status, cnpj, empresa_id, modulos, active, created_at");
    if (error) {
      if (error.code === "23505") throw new Error("Nome de usuário ou CNPJ já cadastrado.");
      throw error;
    }
    return data[0] as UsuarioSistema;
  } catch (err: any) {
    if (err.message?.includes("já cadastrado")) throw err;
    const users = getLocalUsers();
    if (users.some((u) => u.username === usuario.username || (usuario.cnpj && u.cnpj === usuario.cnpj))) {
      throw new Error("Nome de usuário ou CNPJ já cadastrado.");
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
    const isCnpj = /^\d{14}$/.test(username.replace(/\D/g, ''));
    let query = supabase.from("usuarios_sistema").select("id, username, role, status, cnpj, empresa_id, modulos, active, created_at");
    
    if (isCnpj) {
      const cleanCnpj = username.replace(/\D/g, '');
      query = query.or(`cnpj.eq.${cleanCnpj},username.eq.${username}`);
    } else {
      query = query.eq("username", username);
    }

    const { data, error } = await query.eq("password_hash", password_hash).single();
    if (error) throw error;
    return await checkStatus(data as UsuarioSistema);
  } catch (err: any) {
    if (err.message?.includes("inativa") || err.message?.includes("pendente") || err.message?.includes("rejeitada")) {
      throw err;
    }
    // Fallback localStorage
    const users = getLocalUsers();
    const found = users.find((u) => 
      (u.username === username || (u.cnpj && u.cnpj.replace(/\D/g, '') === username.replace(/\D/g, ''))) && 
      u.password_hash === password_hash
    );
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
