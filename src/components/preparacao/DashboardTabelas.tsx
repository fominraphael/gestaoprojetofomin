import { Check, ChevronDown } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agruparPor, FAIXAS_AGING, INDICADORES_DASH, type DimensaoDashboard } from "@/lib/prep-dashboard-calculo";
import type { IndicadorId } from "@/lib/preparacao-anuncios";
import { cn } from "@/lib/utils";

export interface MultiFiltroProps { label: string; valores: string[]; opcoes: { valor: string; label: string }[]; alterar: (v: string[]) => void }
/** Multi-select filter; an empty selection means "all". */
export function MultiFiltro({ label, valores, opcoes, alterar }: MultiFiltroProps) {
  const alternar = (v: string) => alterar(valores.includes(v) ? valores.filter(x => x !== v) : [...valores, v]);
  const resumo = !valores.length ? "todos" : valores.length === 1 ? (opcoes.find(o => o.valor === valores[0])?.label ?? valores[0]) : `${valores.length} selecionados`;
  return <Popover>
    <PopoverTrigger asChild><Button variant="outline" className="w-full md:w-60 justify-between font-normal" aria-label={label}>
      <span className="truncate">{label}: {resumo}</span><ChevronDown className="h-4 w-4 opacity-60" /></Button></PopoverTrigger>
    <PopoverContent className="w-64 p-1" align="start">
      <button type="button" className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent text-muted-foreground" onClick={() => alterar([])}>Limpar seleção</button>
      <div className="max-h-72 overflow-y-auto">{opcoes.map(o => <button type="button" key={o.valor} onClick={() => alternar(o.valor)}
        className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded hover:bg-accent">
        <Check className={cn("h-4 w-4 shrink-0", valores.includes(o.valor) ? "opacity-100" : "opacity-0")} />{o.label}</button>)}</div>
    </PopoverContent>
  </Popover>;
}

const th = "px-2 py-2 text-xs font-medium text-muted-foreground text-center whitespace-nowrap";
const td = "px-2 py-1.5 text-center tabular-nums";
const celula = (n: number) => <span className={n ? "text-destructive font-medium" : "text-muted-foreground"}>{n || "–"}</span>;

export interface TabelaProps { linhas: DimensaoDashboard[]; indicadores: IndicadorId[] }
const colunas = (ids: IndicadorId[]) => INDICADORES_DASH.filter(i => ids.includes(i.id));

export function TabelaRegional({ linhas, indicadores }: TabelaProps) {
  const dados = agruparPor(linhas, "regional").sort((a, b) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome));
  const cols = colunas(indicadores);
  if (!dados.length) return <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p>;
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm">
    <thead className="bg-muted/50"><tr><th className={cn(th, "text-left")}>Regional</th><th className={th}>Veículos pendentes</th>{cols.map(c => <th key={c.id} className={th}>{c.label}</th>)}</tr></thead>
    <tbody>{dados.map(d => <tr key={d.nome} className="border-t"><td className="px-2 py-1.5">{d.nome}</td><td className={cn(td, "font-semibold")}>{d.pendentes}</td>{cols.map(c => <td key={c.id} className={td}>{celula(d.valores[c.id])}</td>)}</tr>)}</tbody>
  </table></div>;
}

/** Stores grouped by Gestor Regional (section rows), purging stores without pending vehicles. */
function lojasPorGestor(linhas: DimensaoDashboard[]) {
  const lojas = agruparPor(linhas, "loja");
  const gestores = [...new Set(lojas.map(l => l.gestor))].sort((a, b) => a.localeCompare(b));
  return gestores.map(g => ({ gestor: g, lojas: lojas.filter(l => l.gestor === g).sort((a, b) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome)) }));
}

export function TabelaLojas({ linhas, indicadores }: TabelaProps) {
  const grupos = lojasPorGestor(linhas); const cols = colunas(indicadores);
  if (!grupos.length) return <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p>;
  return <div className="overflow-x-auto rounded-lg border max-h-[640px] overflow-y-auto"><table className="w-full text-sm">
    <thead className="bg-muted sticky top-0"><tr><th className={cn(th, "text-left")}>Loja</th><th className={th}>Veículos pendentes</th>{cols.map(c => <th key={c.id} className={th}>{c.label}</th>)}</tr></thead>
    <tbody>{grupos.map(g => <Fragment key={g.gestor}>
      <tr className="bg-primary/10 border-t"><td colSpan={cols.length + 2} className="px-2 py-1.5 font-semibold text-primary">Gestor Regional: {g.gestor}</td></tr>
      {g.lojas.map(l => <tr key={l.nome} className="border-t"><td className="px-2 py-1.5 pl-5">{l.nome}</td><td className={cn(td, "font-semibold")}>{l.pendentes}</td>{cols.map(c => <td key={c.id} className={td}>{celula(l.valores[c.id])}</td>)}</tr>)}
    </Fragment>)}</tbody>
  </table></div>;
}

export function TabelaAging({ linhas, indicadores }: TabelaProps) {
  const cols = colunas(indicadores);
  const faixas = FAIXAS_AGING.filter(f => linhas.some(l => cols.some(c => (l.aging[f]?.[c.id] ?? 0) > 0)));
  const somar = (loja: string, f: string, id: IndicadorId) => linhas.filter(l => l.loja === loja).reduce((t, l) => t + (l.aging[f]?.[id] ?? 0), 0);
  const grupos = lojasPorGestor(linhas);
  if (!grupos.length || !faixas.length) return <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p>;
  return <div className="overflow-auto rounded-lg border max-h-[640px]"><table className="w-full text-sm">
    <thead className="bg-muted sticky top-0">
      <tr><th rowSpan={2} className={cn(th, "text-left align-bottom")}>Loja</th>{faixas.map(f => <th key={f} colSpan={cols.length} className={cn(th, "border-l text-foreground")}>{f === "Sem informação" ? f : `${f} dias`}</th>)}</tr>
      <tr>{faixas.map(f => cols.map((c, n) => <th key={f + c.id} className={cn(th, n === 0 && "border-l")}>{c.label}</th>))}</tr>
    </thead>
    <tbody>{grupos.map(g => <Fragment key={g.gestor}>
      <tr className="bg-primary/10 border-t"><td colSpan={faixas.length * cols.length + 1} className="px-2 py-1.5 font-semibold text-primary">Gestor Regional: {g.gestor}</td></tr>
      {g.lojas.map(l => <tr key={l.nome} className="border-t"><td className="px-2 py-1.5 pl-5 whitespace-nowrap">{l.nome}</td>
        {faixas.map(f => cols.map((c, n) => <td key={f + c.id} className={cn(td, n === 0 && "border-l")}>{celula(somar(l.nome, f, c.id))}</td>))}</tr>)}
    </Fragment>)}</tbody>
  </table></div>;
}
