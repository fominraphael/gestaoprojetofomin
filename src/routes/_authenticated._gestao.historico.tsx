import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tarefasQuery, STATUSES, statusColor, type Tarefa, type Status, type Categoria } from "@/lib/tarefas";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TarefaModal } from "@/components/TarefaModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArchiveRestore, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_gestao/historico")({
  head: () => ({
    meta: [{ title: "Lixeira — Gestão de Projetos" }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tarefasQuery("historico")),
  component: LixeiraPage,
  errorComponent: ModuleErrorBoundary,
  notFoundComponent: () => <div className="p-8">Lixeira vazia.</div>,
});

const ORIGEM_LABEL: Record<Categoria, string> = {
  backlog: "Backlog",
  roadmap: "Roadmap",
  solicitacao: "Solicitações",
  historico: "Lixeira",
};

const ORIGEM_STYLE: Record<Categoria, string> = {
  backlog: "bg-muted text-primary dark:bg-muted dark:text-foreground",
  roadmap: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  solicitacao: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  historico: "bg-muted text-muted-foreground",
};

function diasRestantes(deletedAt: string | null): number {
  if (!deletedAt) return 30;
  const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function LixeiraPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery("historico"));
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todas");
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return tarefas.filter((t) => {
      if (filtroStatus !== "todos" && t.status !== filtroStatus) return false;
      if (filtroOrigem !== "todas" && (t.categoria_origem ?? "backlog") !== filtroOrigem) return false;
      if (!q) return true;
      return (
        t.titulo.toLowerCase().includes(q) ||
        (t.projeto ?? "").toLowerCase().includes(q) ||
        (t.codigo ?? "").toLowerCase().includes(q) ||
        (t.responsaveis ?? "").toLowerCase().includes(q)
      );
    });
  }, [tarefas, busca, filtroStatus, filtroOrigem]);

  const restaurar = useMutation({
    mutationFn: async (t: Tarefa) => {
      const destino: Categoria = t.categoria_origem ?? "backlog";
      const { error } = await supabase
        .from("tarefas")
        .update({ categoria: destino, categoria_origem: null, deleted_at: null })
        .eq("id", t.id);
      if (error) throw error;
      return destino;
    },
    onSuccess: (destino) => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success(`Restaurada para ${ORIGEM_LABEL[destino]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirDefinitivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Excluída definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lixeira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Itens excluídos do Backlog, Roadmap e Solicitações. Removidos automaticamente após 30 dias.
        </p>
      </header>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, projeto, código..."
            className="pl-9"
          />
        </div>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="roadmap">Roadmap</SelectItem>
            <SelectItem value="solicitacao">Solicitações</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-24">Código</th>
              <th className="text-left px-4 py-3 font-medium">Título</th>
              <th className="text-left px-4 py-3 font-medium w-32">Origem</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium w-36">Remoção em</th>
              <th className="text-right px-4 py-3 font-medium w-56">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((t) => {
              const origem: Categoria = t.categoria_origem ?? "backlog";
              const dias = diasRestantes(t.deleted_at);
              return (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td
                    className="px-4 py-3 font-mono text-xs text-muted-foreground cursor-pointer"
                    onClick={() => setModal({ open: true, tarefa: t })}
                  >
                    {t.codigo ?? "—"}
                  </td>
                  <td
                    className="px-4 py-3 font-medium cursor-pointer"
                    onClick={() => setModal({ open: true, tarefa: t })}
                  >
                    {t.titulo}
                    {t.projeto && (
                      <div className="text-xs text-muted-foreground font-normal">{t.projeto}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${ORIGEM_STYLE[origem]}`}>
                      {ORIGEM_LABEL[origem]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status as Status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {dias === 0 ? "hoje" : `${dias} ${dias === 1 ? "dia" : "dias"}`}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => restaurar.mutate(t)}
                      className="text-xs"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                      Restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Excluir definitivamente? Esta ação não pode ser desfeita.")) {
                          excluirDefinitivo.mutate(t.id);
                        }
                      }}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-10">
                  Lixeira vazia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground mt-3">
        {filtradas.length} {filtradas.length === 1 ? "item" : "itens"}
      </div>

      <TarefaModal
        open={modal.open}
        onOpenChange={(o) => setModal({ open: o, tarefa: o ? modal.tarefa : null })}
        tarefa={modal.tarefa}
        defaultCategoria="historico"
      />
    </div>
  );
}
