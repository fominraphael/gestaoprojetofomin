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
      const stored = localStorage.getItem("sessao_usuario_v2");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("sessao_usuario_v2");
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const u = await autenticar(username, password);
    const session = { id: u.id, username: u.username, role: u.role, status: u.status } as UsuarioSistema;
    setUser(session);
    localStorage.setItem("sessao_usuario_v2", JSON.stringify(session));
  };

  const logout = () => {
    setUser(null);
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
