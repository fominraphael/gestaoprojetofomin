import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { INDICADORES_DASH, resumirDashboard, type DimensaoDashboard } from "@/lib/prep-dashboard-calculo";
import type { IndicadorId } from "@/lib/preparacao-anuncios";
import { GraficoPendencias } from "./DashboardGraficos";
import { cn } from "@/lib/utils";

export interface DashboardTVProps { linhas: DimensaoDashboard[]; indicadores: IndicadorId[] }
/** Wall-TV layout: few, large figures meant to fit one screen without scrolling. */
export function DashboardTV({ linhas, indicadores }: DashboardTVProps) {
  const t = resumirDashboard(linhas);
  const pct = (n: number) => `${(t.ativos ? n / t.ativos * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const criticos = linhas.reduce((s, l) => s + (l.aging_veiculos?.["60+"] ?? 0), 0);
  const lojasCriticas = linhas.filter(l => (l.aging_veiculos?.["60+"] ?? 0) > 0)
    .sort((a, b) => (b.aging_veiculos?.["60+"] ?? 0) - (a.aging_veiculos?.["60+"] ?? 0)).slice(0, 4);
  const cards = [
    { label: "Total de veículos", n: t.ativos, p: "", c: "text-foreground" },
    { label: "Pendentes", n: t.pendentes, p: pct(t.pendentes), c: "text-destructive" },
    { label: "OK", n: t.ativos - t.pendentes, p: pct(t.ativos - t.pendentes), c: "text-status-done" },
  ];
  return <div className="h-[calc(100vh-3rem)] flex flex-col gap-4 overflow-hidden">
    <div className="grid grid-cols-3 gap-4">{cards.map(c => <Card key={c.label} className="p-5">
      <h2 className="text-xl text-muted-foreground">{c.label}</h2>
      <div className="flex items-baseline gap-4"><span className={cn("text-7xl font-bold tabular-nums", c.c)}>{c.n.toLocaleString("pt-BR")}</span><span className="text-3xl text-muted-foreground">{c.p}</span></div>
    </Card>)}</div>
    <div className="grid grid-cols-5 gap-3">{INDICADORES_DASH.filter(i => indicadores.includes(i.id)).map(i => <Card key={i.id} className="p-3 text-center">
      <h2 className="text-lg text-muted-foreground">{i.label}</h2><div className="text-4xl font-bold text-destructive tabular-nums">{t[i.id]}</div></Card>)}</div>
    <div className="flex-1 min-h-0 overflow-hidden"><GraficoPendencias titulo="Top 10 lojas com mais pendências" linhas={linhas} dimensao="loja" limite={10} grande /></div>
    <Card className="p-4 flex items-center gap-6 border-destructive bg-destructive/10">
      <AlertTriangle className="h-12 w-12 text-destructive shrink-0" />
      <div><div className="text-xl text-muted-foreground">Pendentes há mais de 60 dias</div><div className="text-5xl font-bold text-destructive tabular-nums">{criticos}</div></div>
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-xl">{lojasCriticas.map(l => <span key={l.loja + l.regional}>{l.loja}: <b className="text-destructive">{l.aging_veiculos?.["60+"]}</b></span>)}</div>
    </Card>
  </div>;
}
