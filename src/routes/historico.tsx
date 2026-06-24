import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tarefasQuery, STATUSES, statusColor, type Tarefa, type Status } from "@/lib/tarefas";
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
import { ArchiveRestore, Search } from "lucide-react";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [{ title: "Histórico — Gestão de Projetos" }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tarefasQuery("historico")),
  component: HistoricoPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Sem histórico.</div>,
});

function HistoricoPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery("historico"));
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return tarefas.filter((t) => {
      if (filtroStatus !== "todos" && t.status !== filtroStatus) return false;
      if (!q) return true;
      return (
        t.titulo.toLowerCase().includes(q) ||
        (t.projeto ?? "").toLowerCase().includes(q) ||
        (t.codigo ?? "").toLowerCase().includes(q) ||
        (t.responsaveis ?? "").toLowerCase().includes(q)
      );
    });
  }, [tarefas, busca, filtroStatus]);

  const restaurar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tarefas")
        .update({ categoria: "backlog" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Restaurada para o Backlog");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tarefas arquivadas — somente leitura, com opção de restaurar
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
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-56">
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
              <th className="text-left px-4 py-3 font-medium">Projeto</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium w-32">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((t) => (
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
                </td>
                <td
                  className="px-4 py-3 text-muted-foreground cursor-pointer"
                  onClick={() => setModal({ open: true, tarefa: t })}
                >
                  {t.projeto ?? "—"}
                </td>
                <td
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => setModal({ open: true, tarefa: t })}
                >
                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status as Status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => restaurar.mutate(t.id)}
                    className="text-xs"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                    Restaurar
                  </Button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-10">
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground mt-3">
        {filtradas.length} {filtradas.length === 1 ? "tarefa" : "tarefas"}
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
