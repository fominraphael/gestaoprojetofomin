import React, { createContext, useContext, useState, useEffect } from "react";
import { type UsuarioSistema, autenticar, solicitarCriacaoConta } from "@/lib/usuarios";

interface AuthContextType {
  user: UsuarioSistema | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string) => Promise<UsuarioSistema>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UsuarioSistema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Try v3 first, then fall back to v2 (old sessions)
      const storedV3 = localStorage.getItem("sessao_usuario_v3");
      const storedV2 = localStorage.getItem("sessao_usuario_v2");
      const stored = storedV3 || storedV2;
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("sessao_usuario_v3");
      localStorage.removeItem("sessao_usuario_v2");
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const u = await autenticar(username, password);
    // Save all fields including empresa_id and modulos so the portal
    // can conditionally render the correct modules and documents
    const session: UsuarioSistema = {
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      cnpj: u.cnpj ?? null,
      empresa_id: u.empresa_id ?? null,
      modulos: u.modulos ?? [],
      active: u.active ?? true,
    };
    setUser(session);
    // Persist under v3 key; remove old v2 to avoid stale data
    localStorage.setItem("sessao_usuario_v3", JSON.stringify(session));
    localStorage.removeItem("sessao_usuario_v2");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sessao_usuario_v3");
    localStorage.removeItem("sessao_usuario_v2");
  };

  const register = (username: string, password: string) =>
    solicitarCriacaoConta(username, password);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        isAuthenticated: !!user,
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
