import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tarefasQuery, statusColor, statusDot, isEmRisco, type Tarefa } from "@/lib/tarefas";
import { useMemo, useState } from "react";
import { TarefaModal } from "@/components/TarefaModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_gestao/roadmap")({
  head: () => ({
    meta: [{ title: "Roadmap — Gestão de Projetos" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tarefasQuery("roadmap")),
  component: RoadmapPage,
  errorComponent: ModuleErrorBoundary,
  notFoundComponent: () => <div className="p-8">Roadmap vazio.</div>,
});

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function RoadmapPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery("roadmap"));
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const { porMes, semData } = useMemo(() => {
    const comData = tarefas
      .filter((t) => t.fim_previsto)
      .sort((a, b) => (a.fim_previsto ?? "").localeCompare(b.fim_previsto ?? ""));
    const sem = tarefas.filter((t) => !t.fim_previsto);

    const groups: Record<string, { label: string; tarefas: Tarefa[] }> = {};
    comData.forEach((t) => {
      const d = new Date(t.fim_previsto! + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = `${meses[d.getMonth()]} de ${d.getFullYear()}`;
      if (!groups[key]) groups[key] = { label, tarefas: [] };
      groups[key].tarefas.push(t);
    });

    return {
      porMes: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
      semData: sem,
    };
  }, [tarefas]);

  return (
    <div className="p-8 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Próximas entregas e marcos planejados
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, tarefa: null })}>
          <Plus className="w-4 h-4 mr-1" /> Nova tarefa
        </Button>
      </header>

      <div className="space-y-8 mb-10">
        {porMes.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">
            Sem tarefas com prazo definido.
          </div>
        ) : (
          porMes.map(([key, group]) => (
            <section key={key}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold capitalize">{group.label}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {group.tarefas.length} {group.tarefas.length === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.tarefas.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setModal({ open: true, tarefa: t })}
                    className="text-left bg-card border border-border rounded-lg p-4 hover:border-foreground/20 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot[t.status]}`}
                      />
                      <div className="text-sm font-medium flex-1">{t.titulo}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t.projeto ?? "Sem projeto"}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${statusColor[t.status]}`}
                        >
                          {t.status}
                        </span>
                        {isEmRisco(t) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-semibold">
                            Em risco
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.fim_previsto! + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {semData.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Sem data definida</h2>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {semData.map((t) => (
              <button
                key={t.id}
                onClick={() => setModal({ open: true, tarefa: t })}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 flex items-center gap-3"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.projeto ?? "Sem projeto"}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}
                >
                  {t.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <TarefaModal
        open={modal.open}
        onOpenChange={(o) => setModal({ open: o, tarefa: o ? modal.tarefa : null })}
        tarefa={modal.tarefa}
        defaultCategoria="roadmap"
      />
    </div>
  );
}
