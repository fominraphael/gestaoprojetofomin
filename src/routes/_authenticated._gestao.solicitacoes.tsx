import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tarefasQuery,
  STATUSES,
  statusColor,
  prioColor,
  TIPOS_SOLICITACAO,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/_gestao/solicitacoes")({
  head: () => ({
    meta: [{ title: "Solicitações — Gestão de Projetos" }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tarefasQuery("solicitacao")),
  component: SolicitacoesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Sem solicitações.</div>,
});

function SolicitacoesPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery("solicitacao"));
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroSolicitante, setFiltroSolicitante] = useState<string>("todos");
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const solicitantes = useMemo(() => {
    const set = new Set<string>();
    tarefas.forEach((t) => {
      const s = (t.solicitante ?? "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [tarefas]);

  const filtered = tarefas.filter((t) => {
    if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
    if (filtroSolicitante !== "todos" && t.solicitante !== filtroSolicitante)
      return false;
    return true;
  });

  return (
    <div className="p-8 max-w-[1600px]">
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos recebidos: reuniões, treinamentos, desenhos, estudos de caso
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
            <Plus className="w-4 h-4 mr-1" /> Nova solicitação
          </Button>
        </div>
      </header>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_SOLICITACAO.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroSolicitante} onValueChange={setFiltroSolicitante}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Solicitante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os solicitantes</SelectItem>
            {solicitantes.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
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
        defaultCategoria="solicitacao"
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
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[status]}`}>
                {status}
              </span>
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
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {t.tipo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {t.tipo}
                      </span>
                    )}
                    {t.prioridade && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${prioColor[t.prioridade]}`}>
                        {t.prioridade}
                      </span>
                    )}
                  </div>
                  {t.solicitante && (
                    <div className="text-xs text-muted-foreground truncate">
                      Solicitante: {t.solicitante}
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
            <th className="text-left px-4 py-3 font-medium">Tipo</th>
            <th className="text-left px-4 py-3 font-medium">Solicitante</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
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
              <td className="px-4 py-3 text-muted-foreground">{t.tipo ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.solicitante ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}>
                  {t.status}
                </span>
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
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Nenhuma solicitação
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
