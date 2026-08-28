import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getTarefasLead, getVeiculos, marcarTarefa } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/acoes-leads")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Ações de Leads — Análise de Estoque Matriz" },
      {
        name: "description",
        content: "Tarefas de acompanhamento de leads geradas pelas regras de precificação.",
      },
      { property: "og:title", content: "Ações de Leads — Análise de Estoque Matriz" },
      { property: "og:description", content: "Checklist de ações de leads por veículo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcoesLeads,
});

function AcoesLeads() {
  const qc = useQueryClient();
  const { data: tarefas = [] } = useQuery({ queryKey: ["estoque", "tarefas"], queryFn: getTarefasLead });
  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "ativos"],
    queryFn: () => getVeiculos({ repasse: false }),
  });

  const veiculoPorId = useMemo(() => new Map(veiculos.map((v) => [v.id, v])), [veiculos]);

  const alternar = async (id: string, concluido: boolean) => {
    try {
      await marcarTarefa(id, concluido);
      await qc.invalidateQueries({ queryKey: ["estoque", "tarefas"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar tarefa");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Ações de Leads
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tarefas geradas pelas regras da matriz. Marcar como concluída é informativo e não bloqueia a
          evolução do veículo.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {tarefas.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">Nenhuma tarefa gerada até o momento.</p>
        )}
        {tarefas.map((t) => {
          const v = veiculoPorId.get(t.veiculo_id);
          return (
            <label key={t.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30">
              <Checkbox
                checked={t.concluido}
                onCheckedChange={(c) => alternar(t.id, c === true)}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {v ? `${v.modelo ?? "—"} · ${v.chassi}` : "Veículo não disponível"}
                </div>
              </div>
              {t.faixa_nome && <Badge variant="secondary">{t.faixa_nome}</Badge>}
              {t.concluido && <Badge>Concluído</Badge>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
