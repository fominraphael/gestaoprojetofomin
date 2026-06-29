import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tarefasQuery,
  STATUSES,
  statusColor,
  prioColor,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, LayoutGrid, List } from "lucide-react";
import { TarefaModal } from "@/components/TarefaModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/backlog")({
  head: () => ({
    meta: [{ title: "Backlog — Gestão de Projetos" }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tarefasQuery("backlog")),
  component: BacklogPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Sem tarefas no backlog.</div>,
});

function BacklogPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery("backlog"));
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filtroProjeto, setFiltroProjeto] = useState<string>("todos");
  const [filtroResp, setFiltroResp] = useState<string>("todos");
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const projetos = useMemo(
    () => Array.from(new Set(tarefas.map((t) => t.projeto).filter(Boolean))) as string[],
    [tarefas],
  );
  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    tarefas.forEach((t) =>
      t.responsaveis?.split(",").forEach((r) => {
        const v = r.trim();
        if (v) set.add(v);
      }),
    );
    return Array.from(set).sort();
  }, [tarefas]);

  const filtered = tarefas.filter((t) => {
    if (filtroProjeto !== "todos" && t.projeto !== filtroProjeto) return false;
    if (filtroResp !== "todos" && !(t.responsaveis ?? "").includes(filtroResp)) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-[1600px]">
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tarefas pendentes organizadas por status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border rounded-md p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 ${view === "kanban" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("lista")}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 ${view === "lista" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
          <Button onClick={() => setModal({ open: true, tarefa: null })}>
            <Plus className="w-4 h-4 mr-1" /> Nova tarefa
          </Button>
        </div>
      </header>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os projetos</SelectItem>
            {projetos.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroResp} onValueChange={setFiltroResp}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "kanban" ? (
        <KanbanBoard tarefas={filtered} onClickCard={(t) => setModal({ open: true, tarefa: t })} />
      ) : (
        <ListaView tarefas={filtered} onClickCard={(t) => setModal({ open: true, tarefa: t })} />
      )}

      <TarefaModal
        open={modal.open}
        onOpenChange={(o) => setModal({ open: o, tarefa: o ? modal.tarefa : null })}
        tarefa={modal.tarefa}
        defaultCategoria="backlog"
      />
    </div>
  );
}

function KanbanBoard({
  tarefas,
  onClickCard,
}: {
  tarefas: Tarefa[];
  onClickCard: (t: Tarefa) => void;
}) {
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);

  const mutate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tarefas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STATUSES.map((status) => {
        const items = tarefas.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) {
                const t = tarefas.find((x) => x.id === dragId);
                if (t && t.status !== status) mutate.mutate({ id: dragId, status });
              }
              setDragId(null);
            }}
            className="bg-secondary/50 rounded-lg p-3 min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[status]}`}>
                  {status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onClick={() => onClickCard(t)}
                  className="bg-card border border-border rounded-md p-3 cursor-pointer hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <div className="text-sm font-medium mb-1.5 line-clamp-2">{t.titulo}</div>
                  {t.projeto && (
                    <div className="text-xs text-muted-foreground mb-2">{t.projeto}</div>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.prioridade && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${prioColor[t.prioridade]}`}>
                        {t.prioridade}
                      </span>
                    )}
                    {t.fim_previsto && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {new Date(t.fim_previsto + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {t.responsaveis && (
                    <div className="text-xs text-muted-foreground mt-2 truncate">
                      {t.responsaveis}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListaView({
  tarefas,
  onClickCard,
}: {
  tarefas: Tarefa[];
  onClickCard: (t: Tarefa) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Título</th>
            <th className="text-left px-4 py-3 font-medium">Projeto</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Prioridade</th>
            <th className="text-left px-4 py-3 font-medium">Prazo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tarefas.map((t) => (
            <tr
              key={t.id}
              onClick={() => onClickCard(t)}
              className="cursor-pointer hover:bg-muted/40"
            >
              <td className="px-4 py-3 font-medium">{t.titulo}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.projeto ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}>
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {t.prioridade ? (
                  <span className={`text-xs px-2 py-0.5 rounded ${prioColor[t.prioridade]}`}>
                    {t.prioridade}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {t.fim_previsto
                  ? new Date(t.fim_previsto + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </td>
            </tr>
          ))}
          {tarefas.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma tarefa.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
