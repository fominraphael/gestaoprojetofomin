import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback } from "react";
import {
  type UsuarioSistema,
  obterUsuarios,
  atualizarStatusUsuario,
  excluirUsuario,
} from "@/lib/usuarios";
import {
  Users,
  Check,
  X,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldX,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Gerenciar Usuários — Admin" }] }),
  component: AdminUsuariosPage,
});

function statusBadge(status: string) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
        <ShieldCheck className="w-3 h-3" /> Aprovado
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
        <ShieldX className="w-3 h-3" /> Rejeitado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Pendente
    </span>
  );
}

function AdminUsuariosPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [isAuthenticated, isAdmin, loading, navigate]);

  const fetchUsuarios = useCallback(async () => {
    setLoadingData(true);
    try {
      setUsuarios(await obterUsuarios());
    } catch {
      setFeedback({ type: "error", msg: "Erro ao carregar usuários." });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) fetchUsuarios();
  }, [loading, isAdmin, fetchUsuarios]);

  const handleAction = async (
    id: string,
    action: () => Promise<void>,
    successMsg: string
  ) => {
    setActionLoading(id);
    try {
      await action();
      setFeedback({ type: "success", msg: successMsg });
      await fetchUsuarios();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Erro ao executar ação." });
    } finally {
      setActionLoading(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const pending = usuarios.filter((u) => u.status === "pending");
  const others = usuarios.filter((u) => u.status !== "pending");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Portal
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Users className="w-4 h-4 text-amber-400" />
              Gerenciar Usuários
            </div>
          </div>
          <button
            onClick={fetchUsuarios}
            id="btn-refresh-usuarios"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Feedback toast */}
        {feedback && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
              feedback.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Pending requests */}
        {pending.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Solicitações Pendentes ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex-wrap"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{u.username}</div>
                      <div className="text-slate-400 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-aprovar-${u.id}`}
                      disabled={actionLoading === u.id}
                      onClick={() =>
                        handleAction(u.id, () => atualizarStatusUsuario(u.id, "approved"), `Usuário "${u.username}" aprovado!`)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 hover:text-green-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprovar
                    </button>
                    <button
                      id={`btn-rejeitar-${u.id}`}
                      disabled={actionLoading === u.id}
                      onClick={() =>
                        handleAction(u.id, () => atualizarStatusUsuario(u.id, "rejected"), `Usuário "${u.username}" rejeitado.`)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All users */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Todos os Usuários ({usuarios.length})
          </h2>
          {loadingData ? (
            <div className="text-center py-12 text-slate-500">
              <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin inline-block" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">Nenhum usuário encontrado.</div>
          ) : (
            <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/50">
                    <th className="text-left px-5 py-3 text-slate-400 font-medium">Usuário</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-medium hidden sm:table-cell">Perfil</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Criado em</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...pending, ...others].map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-700/30 last:border-0 ${i % 2 === 0 ? "bg-slate-800/20" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.username[0].toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        {u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Usuário</span>
                        )}
                      </td>
                      <td className="px-5 py-3">{statusBadge(u.status)}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs hidden md:table-cell">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {u.role !== "admin" && (
                          <button
                            id={`btn-excluir-${u.id}`}
                            disabled={actionLoading === u.id}
                            onClick={() =>
                              handleAction(u.id, () => excluirUsuario(u.id), `Usuário "${u.username}" excluído.`)
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
