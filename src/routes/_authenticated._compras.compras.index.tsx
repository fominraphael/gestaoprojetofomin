import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { STATUS_LABEL, TIPO_COMPRA_LABEL, type StatusChamado } from "@/lib/compras";
import {
  Plus, Search, ArrowUp, ArrowDown, Columns3,
  ShoppingCart, Clock, AlertTriangle, CheckCircle2, XCircle, Inbox, Loader2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_compras/compras/")({
  errorComponent: ModuleErrorBoundary,
  component: ComprasIndex,
});

interface ChamadoRow {
  id: string;
  placa: string;
  nome: string;
  tipo_pessoa: string;
  tipo_compra: string;
  estado_uf: string;
  status: StatusChamado;
  created_at: string;
  valor_avaliado: number | null;
  loja_estoque: string | null;
  criado_por: string | null;
  assumido_por: string | null;
  ordem: number | null;
}

const STATUS_VARIANT: Record<StatusChamado, string> = {
  documentacao: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  na_fila_central: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  em_analise: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pendenciado: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspenso: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  comprado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelado: "bg-red-500/15 text-red-300 border-red-500/30",
};

type ColId = "ordem" | "placa" | "nome" | "solicitante" | "central" | "loja" | "tipo_pessoa" | "estado_uf" | "tipo_compra" | "valor" | "status" | "criado_em";

const COLUNAS: { id: ColId; label: string }[] = [
  { id: "ordem", label: "#" },
  { id: "placa", label: "Placa" },
  { id: "nome", label: "Cliente" },
  { id: "solicitante", label: "Solicitante" },
  { id: "central", label: "Central" },
  { id: "loja", label: "Loja" },
  { id: "tipo_pessoa", label: "PF/PJ" },
  { id: "estado_uf", label: "UF" },
  { id: "tipo_compra", label: "Tipo compra" },
  { id: "valor", label: "Valor avaliado" },
  { id: "status", label: "Status" },
  { id: "criado_em", label: "Criado em" },
];
const COLUNAS_PADRAO: ColId[] = ["ordem", "placa", "nome", "solicitante", "central", "loja", "estado_uf", "tipo_compra", "valor", "status", "criado_em"];

// Period filter: 'hoje' | 'semana7' | 'mes_atual' | 'YYYY-MM'
type PeriodoFiltro = "hoje" | "semana7" | "mes_atual" | string;

function inicioDoDia(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inicioDoMes(d = new Date()) { const x = inicioDoDia(d); x.setDate(1); return x; }
function seteDiasAtras() { const x = inicioDoDia(); x.setDate(x.getDate() - 6); return x; }
function ymKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
}

function ComprasIndex() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [excluir, setExcluir] = useState<ChamadoRow | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [rows, setRows] = useState<ChamadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("na_fila_central");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes_atual");
  const [reordenando, setReordenando] = useState(false);
  const [sortBy, setSortBy] = useState<"criado_desc" | "criado_asc" | "placa" | "nome" | "valor_desc" | "valor_asc" | "status" | "ordem">("criado_desc");

  // Lookups
  const [lojasMap, setLojasMap] = useState<Record<string, string>>({});
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});

  const [colunasVisiveis, setColunasVisiveis] = useState<ColId[]>(() => {
    if (typeof window === "undefined") return COLUNAS_PADRAO;
    try {
      const raw = localStorage.getItem("compras-colunas-v2");
      if (raw) return JSON.parse(raw);
    } catch {}
    return COLUNAS_PADRAO;
  });

  useEffect(() => {
    try { localStorage.setItem("compras-colunas-v2", JSON.stringify(colunasVisiveis)); } catch {}
  }, [colunasVisiveis]);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("compras_chamados")
      .select("id, placa, nome, tipo_pessoa, tipo_compra, estado_uf, status, created_at, valor_avaliado, loja_estoque, criado_por, assumido_por, ordem")
      .order("created_at", { ascending: false });
    const list = ((data ?? []) as any) as ChamadoRow[];
    setRows(list);

    const userIds = Array.from(new Set(
      list.flatMap((r) => [r.criado_por, r.assumido_por]).filter(Boolean),
    )) as string[];

    const [{ data: cad }, { data: prof }] = await Promise.all([
      supabase.from("compras_cadastros").select("valor,label").eq("categoria", "loja_estoque"),
      userIds.length
        ? supabase.from("profiles").select("id, username, nome_fantasia").in("id", userIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);
    const lm: Record<string, string> = {};
    (cad ?? []).forEach((c: any) => { lm[c.valor] = c.label; });
    setLojasMap(lm);
    const um: Record<string, string> = {};
    (prof ?? []).forEach((p: any) => { um[p.id] = p.nome_fantasia || p.username; });
    setUsuarios(um);

    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // Meses anteriores com registros (exclui mês atual)
  const mesesAnteriores = useMemo(() => {
    const atual = ymKey(new Date());
    const set = new Set<string>();
    for (const r of rows) {
      const k = ymKey(new Date(r.created_at));
      if (k !== atual) set.add(k);
    }
    return Array.from(set).sort().reverse();
  }, [rows]);

  const rowsPorPeriodo = useMemo(() => {
    if (periodo === "hoje") {
      const inicio = inicioDoDia();
      return rows.filter((r) => new Date(r.created_at) >= inicio);
    }
    if (periodo === "semana7") {
      const inicio = seteDiasAtras();
      return rows.filter((r) => new Date(r.created_at) >= inicio);
    }
    if (periodo === "mes_atual") {
      const inicio = inicioDoMes();
      return rows.filter((r) => new Date(r.created_at) >= inicio);
    }
    // mês específico YYYY-MM
    return rows.filter((r) => ymKey(new Date(r.created_at)) === periodo);
  }, [rows, periodo]);

  const kpis = useMemo(() => {
    const total = rowsPorPeriodo.length;
    const emFluxo = rowsPorPeriodo.filter((r) => ["documentacao", "na_fila_central", "em_analise"].includes(r.status)).length;
    const pendenciados = rowsPorPeriodo.filter((r) => r.status === "pendenciado").length;
    const comprados = rowsPorPeriodo.filter((r) => r.status === "comprado").length;
    const cancelados = rowsPorPeriodo.filter((r) => r.status === "cancelado").length;
    const valorComprado = rowsPorPeriodo
      .filter((r) => r.status === "comprado")
      .reduce((s, r) => s + (Number(r.valor_avaliado) || 0), 0);
    return { total, emFluxo, pendenciados, comprados, cancelados, valorComprado };
  }, [rowsPorPeriodo]);

  const filtered = useMemo(() => {
    const base = rowsPorPeriodo.filter((r) => {
      if (status !== "todos" && r.status !== status) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const solic = r.criado_por ? (usuarios[r.criado_por] ?? "") : "";
        const central = r.assumido_por ? (usuarios[r.assumido_por] ?? "") : "";
        const loja = r.loja_estoque ? (lojasMap[r.loja_estoque] ?? r.loja_estoque) : "";
        return (
          r.placa?.toLowerCase().includes(q) ||
          r.nome?.toLowerCase().includes(q) ||
          solic.toLowerCase().includes(q) ||
          central.toLowerCase().includes(q) ||
          loja.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const sorted = [...base];
    const cmpDate = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
    switch (sortBy) {
      case "criado_asc": sorted.sort((a, b) => cmpDate(a.created_at, b.created_at)); break;
      case "placa": sorted.sort((a, b) => (a.placa ?? "").localeCompare(b.placa ?? "")); break;
      case "nome": sorted.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "")); break;
      case "valor_desc": sorted.sort((a, b) => (Number(b.valor_avaliado) || 0) - (Number(a.valor_avaliado) || 0)); break;
      case "valor_asc": sorted.sort((a, b) => (Number(a.valor_avaliado) || 0) - (Number(b.valor_avaliado) || 0)); break;
      case "status": sorted.sort((a, b) => a.status.localeCompare(b.status)); break;
      case "ordem":
        sorted.sort((a, b) => {
          const ao = a.ordem ?? Number.MAX_SAFE_INTEGER;
          const bo = b.ordem ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return cmpDate(b.created_at, a.created_at);
        });
        break;
      case "criado_desc":
      default:
        sorted.sort((a, b) => cmpDate(b.created_at, a.created_at));
    }
    return sorted;
  }, [rowsPorPeriodo, busca, status, usuarios, lojasMap, sortBy]);

  async function mover(id: string, dir: -1 | 1) {
    const idx = filtered.findIndex((r) => r.id === id);
    const alvo = filtered[idx + dir];
    if (!alvo) return;
    setReordenando(true);
    try {
      const list = [...filtered];
      list.forEach((r, i) => { if (r.ordem == null) r.ordem = (i + 1) * 10; });
      const atual = list[idx];
      const outro = list[idx + dir];
      const tmp = atual.ordem!;
      atual.ordem = outro.ordem!;
      outro.ordem = tmp;
      const upd = await Promise.all([
        supabase.from("compras_chamados").update({ ordem: atual.ordem }).eq("id", atual.id),
        supabase.from("compras_chamados").update({ ordem: outro.ordem }).eq("id", outro.id),
      ]);
      if (upd.some((r) => r.error)) throw new Error("Falha ao reordenar");
      setRows((prev) => prev.map((r) => {
        const found = list.find((l) => l.id === r.id);
        return found ? { ...r, ordem: found.ordem } : r;
      }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReordenando(false);
    }
  }

  function toggleColuna(id: ColId) {
    setColunasVisiveis((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function moverColuna(id: ColId, dir: -1 | 1) {
    setColunasVisiveis((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const colsRender = colunasVisiveis
    .map((id) => COLUNAS.find((c) => c.id === id))
    .filter(Boolean) as typeof COLUNAS;

  return (
    <div className="p-6 space-y-4 max-w-none">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Compras Seminovos
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard e chamados de compra</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
            <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana7">Últimos 7 dias</SelectItem>
              <SelectItem value="mes_atual">Mês atual</SelectItem>
              {mesesAnteriores.map((ym) => (
                <SelectItem key={ym} value={ym}>{ymLabel(ym)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/compras/novo" })} title="Novo chamado">
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Inbox} label="Total" valor={kpis.total} onClick={() => setStatus("todos")} ativo={status === "todos"} />
        <KpiCard icon={Loader2} label="Em fluxo" valor={kpis.emFluxo} tint="text-blue-500" onClick={() => setStatus("em_analise")} ativo={status === "em_analise"} />
        <KpiCard icon={AlertTriangle} label="Pendenciados" valor={kpis.pendenciados} tint="text-amber-500" onClick={() => setStatus("pendenciado")} ativo={status === "pendenciado"} />
        <KpiCard icon={CheckCircle2} label="Comprados" valor={kpis.comprados} tint="text-emerald-500" onClick={() => setStatus("comprado")} ativo={status === "comprado"} />
        <KpiCard icon={XCircle} label="Cancelados" valor={kpis.cancelados} tint="text-red-500" onClick={() => setStatus("cancelado")} ativo={status === "cancelado"} />
        <KpiCard icon={Clock} label="Valor comprado" valor={`R$ ${kpis.valorComprado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} tint="text-emerald-500" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, cliente, solicitante, central ou loja"
            className="pl-8 w-96"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusChamado[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-56" title="Ordenar por"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_desc">Mais recentes</SelectItem>
            <SelectItem value="criado_asc">Mais antigos</SelectItem>
            <SelectItem value="placa">Placa (A→Z)</SelectItem>
            <SelectItem value="nome">Cliente (A→Z)</SelectItem>
            <SelectItem value="valor_desc">Valor (maior)</SelectItem>
            <SelectItem value="valor_asc">Valor (menor)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="ordem">Ordem manual (#)</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Configurar colunas">
              <Columns3 className="w-4 h-4 mr-1" /> Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Colunas (visibilidade e ordem)</div>
            <div className="space-y-1">
              {[
                ...colunasVisiveis
                  .map((id) => COLUNAS.find((c) => c.id === id))
                  .filter(Boolean) as typeof COLUNAS,
                ...COLUNAS.filter((c) => !colunasVisiveis.includes(c.id)),
              ].map((c) => {
                const visivel = colunasVisiveis.includes(c.id);
                const idx = colunasVisiveis.indexOf(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={visivel} onCheckedChange={() => toggleColuna(c.id)} />
                    <span className="flex-1">{c.label}</span>
                    <button
                      className="p-0.5 rounded hover:bg-accent disabled:opacity-20"
                      onClick={() => moverColuna(c.id, -1)}
                      disabled={!visivel || idx <= 0}
                      title="Mover para esquerda"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-accent disabled:opacity-20"
                      onClick={() => moverColuna(c.id, 1)}
                      disabled={!visivel || idx < 0 || idx >= colunasVisiveis.length - 1}
                      title="Mover para direita"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {colsRender.map((c) => <TableHead key={c.id}>{c.label}</TableHead>)}
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={colsRender.length + 1} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={colsRender.length + 1} className="text-center py-8 text-muted-foreground">Nenhum chamado.</TableCell></TableRow>
            ) : filtered.map((r, idx) => (
              <TableRow key={r.id}>
                {colsRender.map((c) => (
                  <TableCell key={c.id} className={c.id === "placa" ? "font-medium" : ""}>
                    {renderCell(r, c.id, {
                      lojasMap, usuarios, idx,
                      podeMover: sortBy === "ordem",
                      reordenando,
                      isFirst: idx === 0,
                      isLast: idx === filtered.length - 1,
                      onMover: mover,
                    })}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link to="/compras/$id" params={{ id: r.id }} className="text-primary text-sm hover:underline">
                      Abrir
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => setExcluir(r)}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        title="Excluir chamado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado <b>{excluir?.placa}</b> ({excluir?.nome}) e todos os seus documentos, débitos e histórico serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindo}
              onClick={async (e) => {
                e.preventDefault();
                if (!excluir) return;
                setExcluindo(true);
                const { error } = await supabase.from("compras_chamados").delete().eq("id", excluir.id);
                setExcluindo(false);
                if (error) { toast.error(error.message); return; }
                toast.success("Chamado excluído");
                setRows((prev) => prev.filter((x) => x.id !== excluir.id));
                setExcluir(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CellCtx {
  lojasMap: Record<string, string>;
  usuarios: Record<string, string>;
  idx: number;
  podeMover: boolean;
  reordenando: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMover: (id: string, dir: -1 | 1) => void;
}

function renderCell(r: ChamadoRow, col: ColId, ctx: CellCtx) {
  switch (col) {
    case "ordem":
      return (
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-muted text-xs font-semibold tabular-nums">
            {r.ordem ?? ctx.idx + 1}
          </span>
          {ctx.podeMover && (
            <div className="flex flex-col">
              <button
                className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                onClick={() => ctx.onMover(r.id, -1)}
                disabled={ctx.isFirst || ctx.reordenando}
                title="Subir"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                onClick={() => ctx.onMover(r.id, 1)}
                disabled={ctx.isLast || ctx.reordenando}
                title="Descer"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      );
    case "placa": return r.placa;
    case "nome": return r.nome;
    case "solicitante": return r.criado_por ? (ctx.usuarios[r.criado_por] ?? "—") : "—";
    case "central": return r.assumido_por ? (ctx.usuarios[r.assumido_por] ?? "—") : <span className="text-muted-foreground text-xs">—</span>;
    case "loja": return r.loja_estoque ? (ctx.lojasMap[r.loja_estoque] ?? r.loja_estoque) : "—";
    case "tipo_pessoa": return r.tipo_pessoa;
    case "estado_uf": return r.estado_uf;
    case "tipo_compra": return TIPO_COMPRA_LABEL[r.tipo_compra as keyof typeof TIPO_COMPRA_LABEL] ?? r.tipo_compra;
    case "valor": return r.valor_avaliado != null ? `R$ ${Number(r.valor_avaliado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-";
    case "status": return (
      <Badge variant="outline" className={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
    );
    case "criado_em": return new Date(r.created_at).toLocaleDateString("pt-BR");
    default: return null;
  }
}

function KpiCard({ icon: Icon, label, valor, tint, onClick, ativo }: {
  icon: any; label: string; valor: number | string; tint?: string; onClick?: () => void; ativo?: boolean;
}) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={`p-3 flex items-center gap-3 transition ${clickable ? "cursor-pointer hover:border-primary/50" : ""} ${ativo ? "border-primary/60 ring-1 ring-primary/40" : ""}`}
    >
      <div className={`w-9 h-9 rounded-md bg-muted flex items-center justify-center ${tint ?? "text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-semibold truncate">{valor}</div>
      </div>
    </Card>
  );
}
