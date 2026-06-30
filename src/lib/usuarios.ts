import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";

export interface UsuarioSistema {
  id: string;
  username: string;
  password_hash?: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}

// SHA-256 of "root"
const ROOT_HASH = "4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2";
const LOCAL_KEY = "usuarios_sistema_v2";

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
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(stored);
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
      .select("id, username, role, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as UsuarioSistema[];
  } catch {
    return getLocalUsers().map(({ password_hash: _p, ...u }) => u);
  }
}

export async function solicitarCriacaoConta(username: string, password: string): Promise<UsuarioSistema> {
  const password_hash = await hashPassword(password);
  try {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .insert([{ username, password_hash, role: "user", status: "pending" }])
      .select("id, username, role, status, created_at");
    if (error) {
      if (error.code === "23505") throw new Error("Este nome de usuário já está em uso.");
      throw error;
    }
    return data[0] as UsuarioSistema;
  } catch (err: any) {
    if (err.message?.includes("já está em uso")) throw err;
    // Fallback localStorage
    const users = getLocalUsers();
    if (users.some((u) => u.username === username))
      throw new Error("Este nome de usuário já está em uso.");
    const created: UsuarioSistema = {
      id: crypto.randomUUID(),
      username,
      password_hash,
      role: "user",
      status: "pending",
      created_at: new Date().toISOString(),
    };
    users.push(created);
    saveLocalUsers(users);
    return created;
  }
}

export async function autenticar(username: string, password: string): Promise<UsuarioSistema> {
  const password_hash = await hashPassword(password);

  async function checkStatus(user: UsuarioSistema) {
    if (user.status === "pending")
      throw new Error("Sua solicitação de conta está pendente de aprovação pelo administrador.");
    if (user.status === "rejected")
      throw new Error("Sua solicitação de conta foi rejeitada pelo administrador.");
    return user;
  }

  try {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("id, username, role, status, created_at")
      .eq("username", username)
      .eq("password_hash", password_hash)
      .single();
    if (error) throw error;
    return await checkStatus(data as UsuarioSistema);
  } catch (err: any) {
    if (err.message?.includes("pendente") || err.message?.includes("rejeitada")) throw err;
    // Fallback localStorage
    const users = getLocalUsers();
    const found = users.find((u) => u.username === username && u.password_hash === password_hash);
    if (!found) throw new Error("Usuário ou senha incorretos.");
    return await checkStatus(found);
  }
}

export async function atualizarStatusUsuario(id: string, status: "approved" | "rejected"): Promise<void> {
  try {
    const { error } = await supabase.from("usuarios_sistema").update({ status }).eq("id", id);
    if (error) throw error;
  } catch {
    const users = getLocalUsers();
    const u = users.find((u) => u.id === id);
    if (u) { u.status = status; saveLocalUsers(users); }
  }
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
