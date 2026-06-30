import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function ModuleAccessDenied({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center bg-card border border-border p-8 rounded-2xl shadow-xl shadow-red-950/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-red-600/5 rounded-full blur-2xl" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 shadow-inner shadow-red-500/5">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
          403 - Acesso Negado
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Você não possui permissão para acessar o módulo de {label}.
        </p>

        <button
          onClick={() => navigate({ to: "/" })}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-transparent rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-red-900/25 active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Portal
        </button>
      </div>
    </div>
  );
}
