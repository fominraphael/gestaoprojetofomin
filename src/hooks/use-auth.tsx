import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  active: boolean;
  tipo_usuario: string;
  modulos: string[];
  empresa_id: string | null;
  cnpj: string | null;
  pode_criar_admin: boolean;
  campos_customizados: Record<string, any>;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    username: string,
    password: string,
    extras?: {
      tipo_usuario?: string;
      campos_customizados?: Record<string, any>;
      cnpj?: string | null;
      email_recuperacao?: string | null;
    },
  ) => Promise<void>;

  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMAIL_DOMAIN = "gestao.local";
const usernameToEmail = (u: string) =>
  u.includes("@") ? u.toLowerCase() : `${u.toLowerCase()}@${EMAIL_DOMAIN}`;

const SUPER_USERNAME = "fominraphael";

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const [{ data: profile, error: pErr }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (pErr || !profile) return null;
  const dbIsAdmin = roles?.some((r: any) => r.role === "admin");
  const isSuper = (profile.username ?? "").toLowerCase() === SUPER_USERNAME;
  // Superusuário sempre admin, com `modulos: []` (bypass total em userCanAccess).
  const role: "admin" | "user" = isSuper || dbIsAdmin ? "admin" : "user";
  const { data: au } = await supabase.auth.getUser();
  return {
    id: profile.id,
    username: profile.username ?? "",
    email: au.user?.email ?? "",
    role,
    status: (profile.status ?? "approved") as any,
    active: profile.ativo ?? true,
    tipo_usuario: profile.tipo_usuario ?? "Lojista",
    modulos: isSuper ? [] : (profile.modulos ?? []),
    empresa_id: profile.empresa_id ?? null,
    cnpj: profile.cnpj ?? null,
    pode_criar_admin: isSuper ? true : (profile.pode_criar_admin ?? false),
    campos_customizados: (profile.campos_customizados ?? {}) as any,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (s: Session | null) => {
    setSession(s);
    if (s?.user) {
      const p = await loadProfile(s.user.id);
      setUser(p);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Listen first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Defer DB calls outside the listener
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id).then(setUser);
        }, 0);
      } else {
        setUser(null);
      }
    });
    // Then check existing session
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (identifier: string, password: string) => {
    let username = identifier.trim();
    if (username.includes("@")) {
      const { data, error: rpcErr } = await supabase.rpc(
        "get_username_by_recovery_email",
        { _email: username },
      );
      if (rpcErr) throw rpcErr;
      if (!data) throw new Error("Usuário ou senha incorretos.");
      username = data as string;
    }
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("invalid"))
        throw new Error("Usuário ou senha incorretos.");
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const register: AuthContextType["register"] = async (username, password, extras) => {
    const email = usernameToEmail(username);
    const tipo = extras?.tipo_usuario || "Lojista";
    const campos = extras?.campos_customizados || {};
    const cnpj = extras?.cnpj ?? (campos.cnpj ? String(campos.cnpj).trim() : null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username,
          tipo_usuario: tipo,
          campos_customizados: campos,
          cnpj,
          email_recuperacao: extras?.email_recuperacao ?? null,
          modulos: ["gestao"],
          status: "pending",
          ativo: true,
          role: "user",
        },
      },
    });

    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const p = await loadProfile(session.user.id);
      setUser(p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        logout,
        register,
        refreshProfile,
        isAuthenticated: !!session && !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
