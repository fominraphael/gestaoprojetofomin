import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  todasTarefasQuery,
  statusColor,
  statusDot,
  prioColor,
  STATUSES,
  PRIORIDADES,
  type Tarefa,
  type Status,
  type Prioridade,
  type Categoria,
} from "@/lib/tarefas";
import { useEffect, useMemo, useState } from "react";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, Search, X, Columns3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_gestao/projetos")({
  head: () => ({
    meta: [{ title: "Projetos — Gestão de Projetos" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todasTarefasQuery()),
  component: ProjetosPage,
  errorComponent: ModuleErrorBoundary,
});

type ColId =
  | "sequencia"
  | "titulo"
  | "categoria"
  | "status"
  | "prioridade"
  | "responsaveis"
  | "projeto"
  | "codigo"
  | "tags"
  | "tipo"
  | "solicitante"
  | "inicio_previsto"
  | "fim_previsto"
  | "estimativa_dias"
  | "inicio_real"
  | "fim_real"
  | "updated_at"
  | "created_at";

type SortKey = ColId;
type SortDir = "asc" | "desc";

interface Coluna {
  id: ColId;
  label: string;
  sortable?: boolean;
}

const COLUNAS: Coluna[] = [
  { id: "titulo", label: "Tarefa", sortable: true },
  { id: "categoria", label: "Categoria", sortable: true },
  { id: "status", label: "Status", sortable: true },
  { id: "prioridade", label: "Prioridade", sortable: true },
  { id: "responsaveis", label: "Responsáveis" },
  { id: "projeto", label: "Projeto", sortable: true },
  { id: "codigo", label: "Código" },
  { id: "tags", label: "Tags" },
  { id: "tipo", label: "Tipo (solicitação)" },
  { id: "solicitante", label: "Solicitante" },
  { id: "inicio_previsto", label: "Início previsto", sortable: true },
  { id: "fim_previsto", label: "Prazo", sortable: true },
  { id: "estimativa_dias", label: "Estimativa (dias)" },
  { id: "inicio_real", label: "Início real" },
  { id: "fim_real", label: "Fim real" },
  { id: "updated_at", label: "Atualizado", sortable: true },
  { id: "created_at", label: "Criado" },
];

const COLUNAS_PADRAO: ColId[] = [
  "titulo",
  "categoria",
  "status",
  "prioridade",
  "fim_previsto",
  "updated_at",
];

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "roadmap", label: "Roadmap" },
  { value: "solicitacao", label: "Solicitação" },
  { value: "historico", label: "Lixeira" },
];

const PRIO_RANK: Record<Prioridade, number> = { Alta: 3, Média: 2, Baixa: 1 };
const STATUS_RANK: Record<Status, number> = {
  "Não iniciada": 1,
  "Em andamento": 2,
  Concluído: 3,
};

const LS_COLUNAS = "projetos.colunas.v1";

function carregarColunas(): ColId[] {
  if (typeof window === "undefined") return COLUNAS_PADRAO;
  try {
    const raw = localStorage.getItem(LS_COLUNAS);
    if (!raw) return COLUNAS_PADRAO;
    const parsed = JSON.parse(raw) as ColId[];
    const validos = COLUNAS.map((c) => c.id);
    const filtrados = parsed.filter((c) => validos.includes(c));
    return filtrados.length ? filtrados : COLUNAS_PADRAO;
  } catch {
    return COLUNAS_PADRAO;
  }
}

function fmtData(d: string | null | undefined): string {
  if (!d) return "—";
  // Datas puras (YYYY-MM-DD) ou ISO
  const iso = d.length === 10 ? d + "T00:00:00" : d;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}

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
  const [sortKey, setSortKey] = useState<SortKey>("prioridade");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colunasVisiveis, setColunasVisiveis] = useState<ColId[]>(() => carregarColunas());

  useEffect(() => {
    try {
      localStorage.setItem(LS_COLUNAS, JSON.stringify(colunasVisiveis));
    } catch {
      /* ignore */
    }
  }, [colunasVisiveis]);

  // Base para todas as métricas e listagem padrão: exclui a lixeira
  // (a menos que o usuário explicitamente filtre por Lixeira).
  const baseTarefas = useMemo(() => {
    if (fCat === "historico") return tarefas.filter((t) => t.categoria === "historico");
    return tarefas.filter((t) => t.categoria !== "historico");
  }, [tarefas, fCat]);

  const projetos = useMemo(() => {
    const set = new Set<string>();
    baseTarefas.forEach((t) => t.projeto && set.add(t.projeto));
    return Array.from(set).sort();
  }, [baseTarefas]);

  // Sequência manual: ordem asc (nulls por último), depois created_at asc.
  const sequenciaPorId = useMemo(() => {
    const naoIniciadas = baseTarefas
      .filter((t) => t.status === "Não iniciada")
      .sort((a, b) => {
        const oa = a.ordem ?? Number.POSITIVE_INFINITY;
        const ob = b.ordem ?? Number.POSITIVE_INFINITY;
        if (oa !== ob) return oa - ob;
        return a.created_at.localeCompare(b.created_at);
      });
    const map = new Map<string, number>();
    naoIniciadas.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [baseTarefas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = baseTarefas.filter((t) => {
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fPrio !== "all" && t.prioridade !== fPrio) return false;
      if (fCat !== "all" && t.categoria !== fCat) return false;
      if (fProjeto !== "all" && t.projeto !== fProjeto) return false;
      if (q) {
        const hay = [t.titulo, t.subtitulo, t.projeto, t.codigo, t.responsaveis, t.tags]
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
        case "prioridade": {
          const oa = a.ordem ?? Number.POSITIVE_INFINITY;
          const ob = b.ordem ?? Number.POSITIVE_INFINITY;
          cmp = oa - ob;
          break;
        }
        case "fim_previsto":
        case "inicio_previsto":
          cmp = (a[sortKey] ?? "\uffff").localeCompare(b[sortKey] ?? "\uffff");
          break;
        case "categoria":
          cmp = a.categoria.localeCompare(b.categoria);
          break;
        case "projeto":
          cmp = (a.projeto ?? "\uffff").localeCompare(b.projeto ?? "\uffff");
          break;
        case "updated_at":
          cmp = a.updated_at.localeCompare(b.updated_at);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [baseTarefas, busca, fStatus, fPrio, fCat, fProjeto, sortKey, sortDir, sequenciaPorId]);

  const contagem = useMemo(() => {
    return {
      total: baseTarefas.length,
      naoIniciada: baseTarefas.filter((t) => t.status === "Não iniciada").length,
      andamento: baseTarefas.filter((t) => t.status === "Em andamento").length,
      concluido: baseTarefas.filter((t) => t.status === "Concluído").length,
    };
  }, [baseTarefas]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "titulo" || k === "categoria" || k === "prioridade" ? "asc" : "desc");
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
    !!busca || fStatus !== "all" || fPrio !== "all" || fCat !== "all" || fProjeto !== "all";

  function toggleColuna(id: ColId) {
    setColunasVisiveis((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function resetColunas() {
    setColunasVisiveis(COLUNAS_PADRAO);
  }

  // Colunas na ordem canônica de COLUNAS
  const colunasRender = useMemo(
    () => COLUNAS.filter((c) => colunasVisiveis.includes(c.id)),
    [colunasVisiveis],
  );

  function renderCell(t: Tarefa, col: ColId) {
    switch (col) {
      case "sequencia": {
        const seq = sequenciaPorId.get(t.id);
        return seq ? (
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-semibold tabular-nums">
            {seq}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      }
      case "titulo":
        return (
          <div className="flex items-start gap-2">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot[t.status]}`} />
            <div className="min-w-0">
              <div className="font-medium truncate">{t.titulo}</div>
              {t.subtitulo && (
                <div className="text-xs text-foreground/70 truncate mt-0.5">{t.subtitulo}</div>
              )}
              {(t.projeto || t.codigo) && (
                <div className="text-xs text-muted-foreground truncate">
                  {t.projeto ?? "Sem projeto"}
                  {t.codigo ? ` · ${t.codigo}` : ""}
                </div>
              )}
            </div>
          </div>
        );
      case "categoria":
        return (
          <span className="text-xs capitalize text-muted-foreground">
            {t.categoria === "solicitacao"
              ? "solicitação"
              : t.categoria === "historico"
                ? "lixeira"
                : t.categoria}
          </span>
        );
      case "status":
        return (
          <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}>
            {t.status}
          </span>
        );
      case "prioridade":
        return t.ordem != null ? (
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-semibold tabular-nums">
            {t.ordem}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case "responsaveis":
        return <span className="text-xs">{t.responsaveis || "—"}</span>;
      case "projeto":
        return <span className="text-xs">{t.projeto || "—"}</span>;
      case "codigo":
        return <span className="text-xs font-mono">{t.codigo || "—"}</span>;
      case "tags":
        return <span className="text-xs text-muted-foreground">{t.tags || "—"}</span>;
      case "tipo":
        return <span className="text-xs">{t.tipo || "—"}</span>;
      case "solicitante":
        return <span className="text-xs">{t.solicitante || "—"}</span>;
      case "estimativa_dias":
        return (
          <span className="text-xs tabular-nums">
            {t.estimativa_dias != null ? t.estimativa_dias : "—"}
          </span>
        );
      case "inicio_previsto":
      case "fim_previsto":
      case "inicio_real":
      case "fim_real":
        return <span className="text-xs text-muted-foreground">{fmtData(t[col])}</span>;
      case "updated_at":
      case "created_at":
        return <span className="text-xs text-muted-foreground">{fmtData(t[col])}</span>;
      default:
        return null;
    }
  }

  return (
    <div className="p-8 w-full">
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as tarefas — clique nos cartões para filtrar rapidamente
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, tarefa: null })}>
          <Plus className="w-4 h-4 mr-1" /> Nova tarefa
        </Button>
      </header>

      {/* Métricas clicáveis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <ChipMetric
          label="Total"
          valor={contagem.total}
          ativo={fStatus === "all"}
          onClick={() => setFStatus("all")}
        />
        <ChipMetric
          label="Não iniciadas"
          valor={contagem.naoIniciada}
          cor="text-status-todo"
          ativo={fStatus === "Não iniciada"}
          onClick={() => setFStatus(fStatus === "Não iniciada" ? "all" : "Não iniciada")}
        />
        <ChipMetric
          label="Em andamento"
          valor={contagem.andamento}
          cor="text-status-doing"
          ativo={fStatus === "Em andamento"}
          onClick={() => setFStatus(fStatus === "Em andamento" ? "all" : "Em andamento")}
        />
        <ChipMetric
          label="Concluídos"
          valor={contagem.concluido}
          cor="text-status-done"
          ativo={fStatus === "Concluído"}
          onClick={() => setFStatus(fStatus === "Concluído" ? "all" : "Concluído")}
        />
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fStatus} onValueChange={(v) => setFStatus(v as Status | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fPrio} onValueChange={(v) => setFPrio(v as Prioridade | "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prio.</SelectItem>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fProjeto} onValueChange={setFProjeto}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Columns3 className="w-4 h-4 mr-1" /> Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto w-56">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUNAS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={colunasVisiveis.includes(c.id)}
                  onCheckedChange={() => toggleColuna(c.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <button
                onClick={resetColunas}
                className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded"
              >
                Restaurar padrão
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {colunasRender.map((c) => (
                  <Th
                    key={c.id}
                    onClick={c.sortable ? () => toggleSort(c.id) : undefined}
                    active={sortKey === c.id}
                    dir={sortDir}
                  >
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={colunasRender.length || 1}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              ) : (
                filtradas.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setModal({ open: true, tarefa: t })}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    {colunasRender.map((c) => (
                      <td key={c.id} className="px-4 py-3 align-top">
                        {renderCell(t, c.id)}
                      </td>
                    ))}
                  </tr>
                ))
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
  onClick?: () => void;
  active: boolean;
  dir: SortDir;
}) {
  const clickable = !!onClick;
  return (
    <th
      onClick={onClick}
      className={`text-left px-4 py-3 font-medium select-none ${
        clickable ? "cursor-pointer hover:text-foreground" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {clickable &&
          (active ? (
            dir === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          ))}
      </span>
    </th>
  );
}

function ChipMetric({
  label,
  valor,
  cor,
  ativo,
  onClick,
}: {
  label: string;
  valor: number;
  cor?: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-card border rounded-lg px-4 py-3 transition-colors ${
        ativo ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${cor ?? ""}`}>{valor}</div>
    </button>
  );
}
