import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Expand, Minimize, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { dashboardQuery } from "@/lib/prep-dashboard";
import { filtrarDashboard, resumirDashboard, inicioHistorico, dataReferencia, INDICADORES_DASH } from "@/lib/prep-dashboard-calculo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraficoAging, GraficoEvolucao, GraficoPendencias } from "./DashboardGraficos";
import { cn } from "@/lib/utils";

interface FiltroProps { label: string; valor: string; opcoes: string[]; alterar: (v: string) => void }
function Filtro({ label, valor, opcoes, alterar }: FiltroProps) {
  return <Select value={valor || "__todos"} onValueChange={v => alterar(v === "__todos" ? "" : v)}>
    <SelectTrigger className="w-full md:w-60" aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
    <SelectContent><SelectItem value="__todos">{label}: todos</SelectItem>{opcoes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
  </Select>;
}
export function DashboardPreparacao() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const [filtros, setFiltros] = useState({ regional: "", loja: "", gestor: "" });
  const [aging, setAging] = useState<"regional" | "loja">("regional");
  const [periodo, setPeriodo] = useState("3"); const [telaCheia, setTelaCheia] = useState(false);
  const painel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mudar = () => setTelaCheia(document.fullscreenElement === painel.current);
    document.addEventListener("fullscreenchange", mudar); return () => document.removeEventListener("fullscreenchange", mudar);
  }, []);
  const expandir = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (painel.current?.requestFullscreen) await painel.current.requestFullscreen(); else toast.error("Tela cheia indisponível neste navegador."); }
    catch { toast.error("Não foi possível ativar tela cheia neste navegador."); }
  };
  const linhas = filtrarDashboard(data.dimensoes, filtros); const totais = resumirDashboard(linhas);
  const pct = (n: number) => `${(totais.ativos ? n/totais.ativos*100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const gestores = [...new Set(linhas.map(l => l.gestor))].sort();
  const inicio = periodo === "7" ? dataReferencia(new Date(Date.now()-6*86400000)) : inicioHistorico(Number(periodo));
  const evolucao = data.historico.filter(h => h.data >= inicio).map(h => ({ data: h.data, pendentes: resumirDashboard(filtrarDashboard(h.dimensoes,filtros)).pendentes }));
  return <div ref={painel} className="bg-background p-4 md:p-6 space-y-6 min-h-screen overflow-y-auto">
    <header className="flex items-center justify-between gap-3 pr-12"><h1 className="text-2xl font-semibold">Dashboard · Preparação/Anúncios</h1>
      <Button variant="outline" size="icon" className="fixed right-5 top-5 z-40" title={telaCheia ? "Sair da tela cheia" : "Tela cheia"} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={expandir}>{telaCheia ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</Button>
    </header>
    <div className="flex flex-wrap gap-2 pr-10">
      {(["regional", "loja", "gestor"] as const).map(chave => <Filtro key={chave} label={chave === "gestor" ? "Gestor Regional" : chave === "loja" ? "Loja" : "Regional"} valor={filtros[chave]} opcoes={[...new Set(data.dimensoes.map(l => l[chave]))].sort()} alterar={v => setFiltros(f => ({ ...f, [chave]: v }))} />)}
      <Button variant="ghost" size="icon" title="Limpar filtros" aria-label="Limpar filtros" onClick={() => setFiltros({ regional: "", loja: "", gestor: "" })}><RotateCcw className="h-4 w-4" /></Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[{ label: "Veículos ativos", n: totais.ativos, classe: "text-foreground", percentual: "" }, { label: "Veículos pendentes", n: totais.pendentes, classe: "text-destructive", percentual: pct(totais.pendentes) }, { label: "Veículos OK", n: totais.ativos-totais.pendentes, classe: "text-status-done", percentual: pct(totais.ativos-totais.pendentes) }].map(c => <Card key={c.label} className="rounded-lg p-5"><h2 className="text-sm text-muted-foreground">{c.label}</h2><div className={cn("text-4xl font-semibold mt-2 tabular-nums",c.classe)}>{c.n.toLocaleString("pt-BR")}</div><div className="h-6 mt-1 text-sm text-muted-foreground">{c.percentual}</div></Card>)}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{INDICADORES_DASH.map(i => <Card key={i.id} className="rounded-lg p-4"><h2 className="text-sm text-muted-foreground">{i.label}</h2><div className="text-2xl font-semibold text-destructive tabular-nums mt-1">{totais[i.id]}</div></Card>)}</div>
    <GraficoPendencias titulo="Veículos pendentes por Regional" linhas={linhas} dimensao="regional" />
    <h2 className="text-xl font-semibold">Pendências por Loja · Gestor Regional</h2>
    {gestores.map(g => <GraficoPendencias key={g} titulo={g} linhas={linhas.filter(l => l.gestor === g)} dimensao="loja" />)}
    <section className="border-t pt-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Aging de pendências · Dias em Estoque</h2><Filtro label="Aging por" valor={aging} opcoes={["regional","loja"]} alterar={v => setAging(v === "loja" ? "loja" : "regional")} /></div><GraficoAging linhas={linhas} dimensao={aging} /></section>
    <section className="border-t pt-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Evolução diária de veículos pendentes</h2><Select value={periodo} onValueChange={setPeriodo}><SelectTrigger className="w-48" aria-label="Período do histórico"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">Últimos 3 meses</SelectItem><SelectItem value="1">Último mês</SelectItem><SelectItem value="7">Última semana</SelectItem></SelectContent></Select></div><GraficoEvolucao dados={evolucao} /></section>
  </div>;
}