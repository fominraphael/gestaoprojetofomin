import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  todasTarefasQuery,
  statusColor,
  statusDot,
  prioColor,
  isEmRisco,
  STATUSES,
  PRIORIDADES,
  type Tarefa,
  type Status,
  type Prioridade,
  type Categoria,
} from "@/lib/tarefas";
import { useMemo, useState } from "react";
import { TarefaModal } from "@/components/TarefaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_gestao/projetos")({
  head: () => ({
    meta: [{ title: "Projetos — Gestão de Projetos" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todasTarefasQuery()),
  component: ProjetosPage,
  errorComponent: ModuleErrorBoundary,
});

type SortKey = "sequencia" | "updated_at" | "titulo" | "status" | "prioridade" | "fim_previsto" | "categoria";
type SortDir = "asc" | "desc";

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "roadmap", label: "Roadmap" },
  { value: "solicitacao", label: "Solicitação" },
  { value: "historico", label: "Lixeira" },
];

/**
 * Sequência de execução: ordena tarefas "Não iniciada" para responder
 * "qual devo começar primeiro?". Critérios em cascata:
 *   1. Prioridade (Alta > Média > Baixa > sem prio)
 *   2. Prazo mais próximo (fim_previsto asc, nulos por último)
 *   3. Mais antiga primeiro (created_at asc)
 */
function compararSequencia(a: Tarefa, b: Tarefa): number {
  const pa = a.prioridade ? PRIO_RANK[a.prioridade] : 0;
  const pb = b.prioridade ? PRIO_RANK[b.prioridade] : 0;
  if (pa !== pb) return pb - pa;
  const fa = a.fim_previsto ?? "\uffff";
  const fb = b.fim_previsto ?? "\uffff";
  if (fa !== fb) return fa.localeCompare(fb);
  return a.created_at.localeCompare(b.created_at);
}

const PRIO_RANK: Record<Prioridade, number> = { Alta: 3, Média: 2, Baixa: 1 };
const STATUS_RANK: Record<Status, number> = {
  "Não iniciada": 1,
  "Em andamento": 2,
  Concluído: 3,
};

function ProjetosPage() {
  const { data: tarefas } = useSuspenseQuery(todasTarefasQuery());
  const [modal, setModal] = useState<{ open: boolean; tarefa: Tarefa | null }>({
    open: false,
    tarefa: null,
  });

  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<Status | "all">("all");
  const [fPrio, setFPrio] = useState<Prioridade | "all">("all");
  const [fCat, setFCat] = useState<Categoria | "all">("all");
  const [fProjeto, setFProjeto] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("sequencia");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const projetos = useMemo(() => {
    const set = new Set<string>();
    tarefas.forEach((t) => t.projeto && set.add(t.projeto));
    return Array.from(set).sort();
  }, [tarefas]);

  // Sequência global: posição de cada tarefa "Não iniciada" na fila de execução
  // (independe dos filtros — o #N é uma propriedade da tarefa, não da view).
  const sequenciaPorId = useMemo(() => {
    const naoIniciadas = tarefas
      .filter((t) => t.status === "Não iniciada" && t.categoria !== "historico")
      .sort(compararSequencia);
    const map = new Map<string, number>();
    naoIniciadas.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [tarefas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = tarefas.filter((t) => {
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fPrio !== "all" && t.prioridade !== fPrio) return false;
      if (fCat !== "all" && t.categoria !== fCat) return false;
      if (fProjeto !== "all" && t.projeto !== fProjeto) return false;
      if (q) {
        const hay = [t.titulo, t.projeto, t.codigo, t.responsaveis, t.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "sequencia": {
          // Não iniciadas primeiro (na sequência), depois o resto.
          const sa = sequenciaPorId.get(a.id);
          const sb = sequenciaPorId.get(b.id);
          if (sa && sb) cmp = sa - sb;
          else if (sa) cmp = -1;
          else if (sb) cmp = 1;
          else cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          break;
        }
        case "titulo":
          cmp = a.titulo.localeCompare(b.titulo);
          break;
        case "status":
          cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          break;
        case "prioridade":
          cmp = (a.prioridade ? PRIO_RANK[a.prioridade] : 0) - (b.prioridade ? PRIO_RANK[b.prioridade] : 0);
          break;
        case "fim_previsto":
          cmp = (a.fim_previsto ?? "\uffff").localeCompare(b.fim_previsto ?? "\uffff");
          break;
        case "categoria":
          cmp = a.categoria.localeCompare(b.categoria);
          break;
        case "updated_at":
        default:
          cmp = a.updated_at.localeCompare(b.updated_at);
      }
      return cmp * dir;
    });
    return list;
  }, [tarefas, busca, fStatus, fPrio, fCat, fProjeto, sortKey, sortDir, sequenciaPorId]);

  const contagem = useMemo(() => {
    return {
      total: filtradas.length,
      naoIniciada: filtradas.filter((t) => t.status === "Não iniciada").length,
      andamento: filtradas.filter((t) => t.status === "Em andamento").length,
      concluido: filtradas.filter((t) => t.status === "Concluído").length,
      risco: filtradas.filter(isEmRisco).length,
    };
  }, [filtradas]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "titulo" || k === "categoria" ? "asc" : "desc");
    }
  }

  function limparFiltros() {
    setBusca("");
    setFStatus("all");
    setFPrio("all");
    setFCat("all");
    setFProjeto("all");
  }

  const temFiltro =
    busca || fStatus !== "all" || fPrio !== "all" || fCat !== "all" || fProjeto !== "all";

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as tarefas — backlog, roadmap, solicitações e histórico
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, tarefa: null })}>
          <Plus className="w-4 h-4 mr-1" /> Nova tarefa
        </Button>
      </header>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <ChipMetric label="Total" valor={contagem.total} />
        <ChipMetric label="Não iniciadas" valor={contagem.naoIniciada} cor="text-status-todo" />
        <ChipMetric label="Em andamento" valor={contagem.andamento} cor="text-status-doing" />
        <ChipMetric label="Concluídos" valor={contagem.concluido} cor="text-status-done" />
        <ChipMetric label="Em risco" valor={contagem.risco} cor="text-destructive" />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, projeto, código, responsável…"
              className="pl-9"
            />
          </div>

          <Select value={fCat} onValueChange={(v) => setFCat(v as Categoria | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fStatus} onValueChange={(v) => setFStatus(v as Status | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fPrio} onValueChange={(v) => setFPrio(v as Prioridade | "all")}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prio.</SelectItem>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fProjeto} onValueChange={setFProjeto}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <Th onClick={() => toggleSort("titulo")} active={sortKey === "titulo"} dir={sortDir}>Tarefa</Th>
                <Th onClick={() => toggleSort("categoria")} active={sortKey === "categoria"} dir={sortDir}>Categoria</Th>
                <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Status</Th>
                <Th onClick={() => toggleSort("prioridade")} active={sortKey === "prioridade"} dir={sortDir}>Prioridade</Th>
                <Th onClick={() => toggleSort("fim_previsto")} active={sortKey === "fim_previsto"} dir={sortDir}>Prazo</Th>
                <Th onClick={() => toggleSort("updated_at")} active={sortKey === "updated_at"} dir={sortDir}>Atualizado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              ) : (
                filtradas.map((t) => {
                  const risco = isEmRisco(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setModal({ open: true, tarefa: t })}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot[t.status]}`} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.titulo}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {t.projeto ?? "Sem projeto"}
                              {t.codigo ? ` · ${t.codigo}` : ""}
                            </div>
                          </div>
                          {risco && (
                            <span className="ml-1 shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-semibold">
                              <AlertTriangle className="w-3 h-3" /> Risco
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                        {t.categoria === "solicitacao" ? "solicitação" : t.categoria === "historico" ? "lixeira" : t.categoria}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.prioridade ? (
                          <span className={`text-xs px-2 py-0.5 rounded-md ${prioColor[t.prioridade]}`}>
                            {t.prioridade}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {t.fim_previsto
                          ? new Date(t.fim_previsto + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TarefaModal
        open={modal.open}
        onOpenChange={(o) => setModal({ open: o, tarefa: o ? modal.tarefa : null })}
        tarefa={modal.tarefa}
        defaultCategoria={modal.tarefa?.categoria ?? "backlog"}
      />
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <th
      onClick={onClick}
      className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

function ChipMetric({ label, valor, cor }: { label: string; valor: number; cor?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${cor ?? ""}`}>{valor}</div>
    </div>
  );
}
