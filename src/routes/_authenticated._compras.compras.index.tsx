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
  Plus, Search, Settings2, ArrowUp, ArrowDown, Columns3,
  ShoppingCart, Clock, AlertTriangle, CheckCircle2, XCircle, Inbox, Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
  ordem: number | null;
}

const STATUS_VARIANT: Record<StatusChamado, string> = {
  documentacao: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  na_fila_central: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  em_analise: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pendenciado: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  comprado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelado: "bg-red-500/15 text-red-300 border-red-500/30",
};

type ColId = "ordem" | "placa" | "nome" | "solicitante" | "loja" | "tipo_pessoa" | "estado_uf" | "tipo_compra" | "valor" | "status" | "criado_em";

const COLUNAS: { id: ColId; label: string }[] = [
  { id: "ordem", label: "#" },
  { id: "placa", label: "Placa" },
  { id: "nome", label: "Cliente" },
  { id: "solicitante", label: "Solicitante" },
  { id: "loja", label: "Loja" },
  { id: "tipo_pessoa", label: "PF/PJ" },
  { id: "estado_uf", label: "UF" },
  { id: "tipo_compra", label: "Tipo compra" },
  { id: "valor", label: "Valor avaliado" },
  { id: "status", label: "Status" },
  { id: "criado_em", label: "Criado em" },
];
const COLUNAS_PADRAO: ColId[] = ["ordem", "placa", "nome", "solicitante", "loja", "estado_uf", "tipo_compra", "valor", "status", "criado_em"];

type PeriodoFiltro = "hoje" | "semana" | "mes" | "todos";

function inicioDoDia(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inicioDaSemana(d = new Date()) { const x = inicioDoDia(d); x.setDate(x.getDate() - x.getDay()); return x; }
function inicioDoMes(d = new Date()) { const x = inicioDoDia(d); x.setDate(1); return x; }

function ComprasIndex() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChamadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [reordenando, setReordenando] = useState(false);
  const [sortBy, setSortBy] = useState<"ordem" | "criado_desc" | "criado_asc" | "placa" | "nome" | "valor_desc" | "valor_asc" | "status">("ordem");

  // Lookups
  const [lojasMap, setLojasMap] = useState<Record<string, string>>({});
  const [solicitantes, setSolicitantes] = useState<Record<string, string>>({});

  const [colunasVisiveis, setColunasVisiveis] = useState<ColId[]>(() => {
    if (typeof window === "undefined") return COLUNAS_PADRAO;
    try {
      const raw = localStorage.getItem("compras-colunas");
      if (raw) return JSON.parse(raw);
    } catch {}
    return COLUNAS_PADRAO;
  });

  useEffect(() => {
    try { localStorage.setItem("compras-colunas", JSON.stringify(colunasVisiveis)); } catch {}
  }, [colunasVisiveis]);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("compras_chamados")
      .select("id, placa, nome, tipo_pessoa, tipo_compra, estado_uf, status, created_at, valor_avaliado, loja_estoque, criado_por, ordem")
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    const list = ((data ?? []) as any) as ChamadoRow[];
    setRows(list);

    // Lookups
    const [{ data: cad }, { data: prof }] = await Promise.all([
      supabase.from("compras_cadastros").select("valor,label").eq("categoria", "loja_estoque"),
      supabase.from("profiles").select("id, username").in("id", Array.from(new Set(list.map((r) => r.criado_por).filter(Boolean))) as string[]),
    ]);
    const lm: Record<string, string> = {};
    (cad ?? []).forEach((c: any) => { lm[c.valor] = c.label; });
    setLojasMap(lm);
    const sm: Record<string, string> = {};
    (prof ?? []).forEach((p: any) => { sm[p.id] = p.username; });
    setSolicitantes(sm);

    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const rowsPorPeriodo = useMemo(() => {
    if (periodo === "todos") return rows;
    const inicio =
      periodo === "hoje" ? inicioDoDia() :
      periodo === "semana" ? inicioDaSemana() :
      inicioDoMes();
    return rows.filter((r) => new Date(r.created_at) >= inicio);
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
        const solic = r.criado_por ? (solicitantes[r.criado_por] ?? "") : "";
        const loja = r.loja_estoque ? (lojasMap[r.loja_estoque] ?? r.loja_estoque) : "";
        return (
          r.placa?.toLowerCase().includes(q) ||
          r.nome?.toLowerCase().includes(q) ||
          solic.toLowerCase().includes(q) ||
          loja.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const sorted = [...base];
    const cmpDate = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
    switch (sortBy) {
      case "criado_desc": sorted.sort((a, b) => cmpDate(b.created_at, a.created_at)); break;
      case "criado_asc": sorted.sort((a, b) => cmpDate(a.created_at, b.created_at)); break;
      case "placa": sorted.sort((a, b) => (a.placa ?? "").localeCompare(b.placa ?? "")); break;
      case "nome": sorted.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "")); break;
      case "valor_desc": sorted.sort((a, b) => (Number(b.valor_avaliado) || 0) - (Number(a.valor_avaliado) || 0)); break;
      case "valor_asc": sorted.sort((a, b) => (Number(a.valor_avaliado) || 0) - (Number(b.valor_avaliado) || 0)); break;
      case "status": sorted.sort((a, b) => a.status.localeCompare(b.status)); break;
      case "ordem":
      default:
        sorted.sort((a, b) => {
          const ao = a.ordem ?? Number.MAX_SAFE_INTEGER;
          const bo = b.ordem ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return cmpDate(b.created_at, a.created_at);
        });
    }
    return sorted;
  }, [rowsPorPeriodo, busca, status, solicitantes, lojasMap, sortBy]);

  async function mover(id: string, dir: -1 | 1) {
    const idx = filtered.findIndex((r) => r.id === id);
    const alvo = filtered[idx + dir];
    if (!alvo) return;
    setReordenando(true);
    try {
      // Normalize: se não tem ordem, atribui pela posição atual
      const list = [...filtered];
      list.forEach((r, i) => { if (r.ordem == null) r.ordem = (i + 1) * 10; });
      const atual = list[idx];
      const outro = list[idx + dir];
      const tmp = atual.ordem!;
      atual.ordem = outro.ordem!;
      outro.ordem = tmp;
      // Persistir os dois
      const upd = await Promise.all([
        supabase.from("compras_chamados").update({ ordem: atual.ordem }).eq("id", atual.id),
        supabase.from("compras_chamados").update({ ordem: outro.ordem }).eq("id", outro.id),
      ]);
      if (upd.some((r) => r.error)) throw new Error("Falha ao reordenar");
      // Atualizar estado local com nova ordem para todos
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
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Compras Seminovos
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard e chamados de compra</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/compras/novo" })} title="Novo chamado">
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Inbox} label="Total" valor={kpis.total} onClick={() => setStatus("todos")} ativo={status === "todos"} />
        <KpiCard icon={Loader2} label="Em fluxo" valor={kpis.emFluxo} tint="text-blue-500" onClick={() => setStatus("em_analise")} ativo={status === "em_analise"} />
        <KpiCard icon={AlertTriangle} label="Pendenciados" valor={kpis.pendenciados} tint="text-amber-500" onClick={() => setStatus("pendenciado")} ativo={status === "pendenciado"} />
        <KpiCard icon={CheckCircle2} label="Comprados" valor={kpis.comprados} tint="text-emerald-500" onClick={() => setStatus("comprado")} ativo={status === "comprado"} />
        <KpiCard icon={XCircle} label="Cancelados" valor={kpis.cancelados} tint="text-red-500" onClick={() => setStatus("cancelado")} ativo={status === "cancelado"} />
        <KpiCard icon={Clock} label="Valor comprado" valor={`R$ ${kpis.valorComprado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} tint="text-emerald-500" />
      </div>

      {/* Filtros linha */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, cliente, solicitante ou loja"
            className="pl-8 w-80"
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
            <SelectItem value="ordem">Ordem manual (#)</SelectItem>
            <SelectItem value="criado_desc">Mais recentes</SelectItem>
            <SelectItem value="criado_asc">Mais antigos</SelectItem>
            <SelectItem value="placa">Placa (A→Z)</SelectItem>
            <SelectItem value="nome">Cliente (A→Z)</SelectItem>
            <SelectItem value="valor_desc">Valor (maior)</SelectItem>
            <SelectItem value="valor_asc">Valor (menor)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Configurar colunas">
              <Columns3 className="w-4 h-4 mr-1" /> Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Colunas visíveis</div>
            <div className="space-y-1.5">
              {COLUNAS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={colunasVisiveis.includes(c.id)} onCheckedChange={() => toggleColuna(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabela */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Mover</TableHead>
              {colsRender.map((c) => <TableHead key={c.id}>{c.label}</TableHead>)}
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={colsRender.length + 2} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={colsRender.length + 2} className="text-center py-8 text-muted-foreground">Nenhum chamado.</TableCell></TableRow>
            ) : filtered.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                      onClick={() => mover(r.id, -1)}
                      disabled={idx === 0 || reordenando || sortBy !== "ordem"}
                      title={sortBy !== "ordem" ? "Selecione 'Ordem manual' para reordenar" : "Subir"}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                      onClick={() => mover(r.id, 1)}
                      disabled={idx === filtered.length - 1 || reordenando || sortBy !== "ordem"}
                      title={sortBy !== "ordem" ? "Selecione 'Ordem manual' para reordenar" : "Descer"}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
                {colsRender.map((c) => (
                  <TableCell key={c.id} className={c.id === "placa" ? "font-medium" : ""}>
                    {renderCell(r, c.id, { lojasMap, solicitantes, idx })}
                  </TableCell>
                ))}
                <TableCell>
                  <Link to="/compras/$id" params={{ id: r.id }} className="text-primary text-sm hover:underline">
                    Abrir
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function renderCell(r: ChamadoRow, col: ColId, ctx: { lojasMap: Record<string, string>; solicitantes: Record<string, string>; idx: number }) {
  switch (col) {
    case "ordem":
      return (
        <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-muted text-xs font-semibold tabular-nums">
          {r.ordem ?? ctx.idx + 1}
        </span>
      );
    case "placa": return r.placa;
    case "nome": return r.nome;
    case "solicitante": return r.criado_por ? (ctx.solicitantes[r.criado_por] ?? "—") : "—";
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
