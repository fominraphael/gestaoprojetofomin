import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { INDICADORES_DASH, FAIXAS_AGING, type DimensaoDashboard } from "@/lib/prep-dashboard-calculo";

const CORES = ["var(--destructive)", "var(--prio-med)", "var(--status-doing)", "var(--status-done)", "var(--prio-low)"];
export interface GraficoPendenciasProps { titulo: string; linhas: DimensaoDashboard[]; dimensao: "loja" | "regional" }
export function GraficoPendencias({ titulo, linhas, dimensao }: GraficoPendenciasProps) {
  const grupos = new Map<string, { nome: string; pendentes: number; os: number; foto: number; tcuv: number; auditoria: number; anuncio: number }>();
  for (const l of linhas) {
    const nome = l[dimensao]; const g = grupos.get(nome) ?? { nome, pendentes: 0, os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0 };
    g.pendentes += l.pendentes; INDICADORES_DASH.forEach(i => { g[i.id] += l[i.id]; }); grupos.set(nome,g);
  }
  const dados = [...grupos.values()].sort((a,b) => b.pendentes-a.pendentes || a.nome.localeCompare(b.nome));
  const altura = Math.max(220, dados.length*44+50);
  return <section className="space-y-3 border-t pt-5">
    <h2 className="text-lg font-semibold">{titulo}</h2>
    <div className="max-h-[720px] overflow-y-auto"><ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
        <CartesianGrid stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" />
        <YAxis dataKey="nome" type="category" width={165} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval={0} />
        <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--foreground)" }} />
        <Legend />
        <Bar dataKey="pendentes" name="Veículos pendentes" fill="var(--destructive)" />
        {dimensao === "loja" && INDICADORES_DASH.map((i,n) => <Bar key={i.id} dataKey={i.id} name={i.label} stackId="indicadores" fill={CORES[n]} />)}
      </BarChart>
    </ResponsiveContainer></div>
  </section>;
}
export interface AgingProps { linhas: DimensaoDashboard[]; dimensao: "loja" | "regional" }
export function GraficoAging({ linhas, dimensao }: AgingProps) {
  const nomes = [...new Set(linhas.map(l => l[dimensao]))].sort();
  const dados = nomes.flatMap(nome => FAIXAS_AGING.map(faixa => {
    const valores = { nome: `${nome} · ${faixa}`, os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0 };
    linhas.filter(l => l[dimensao] === nome).forEach(l => INDICADORES_DASH.forEach(i => { valores[i.id] += l.aging[faixa]?.[i.id] ?? 0; }));
    return valores;
  })).filter(d => INDICADORES_DASH.some(i => d[i.id] > 0));
  if (!dados.length) return <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p>;
  return <div className="max-h-[640px] overflow-y-auto"><ResponsiveContainer width="100%" height={Math.max(260,dados.length*38+60)}>
    <BarChart data={dados} layout="vertical" margin={{ right: 20 }}>
      <CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" />
      <YAxis type="category" dataKey="nome" width={180} interval={0} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
      <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--foreground)" }} /><Legend />
      {INDICADORES_DASH.map((i,n) => <Bar key={i.id} dataKey={i.id} name={i.label} stackId="aging" fill={CORES[n]} />)}
    </BarChart>
  </ResponsiveContainer></div>;
}
export interface EvolucaoProps { dados: { data: string; pendentes: number }[] }
export function GraficoEvolucao({ dados }: EvolucaoProps) {
  if (!dados.length) return <p className="py-8 text-muted-foreground">Histórico disponível após a próxima importação de Estoque BI.</p>;
  return <ResponsiveContainer width="100%" height={300}>
    <LineChart data={dados} margin={{ right: 20, left: 0, top: 15 }}>
      <CartesianGrid stroke="var(--border)" /><XAxis dataKey="data" tickFormatter={d => String(d).slice(5).split("-").reverse().join("/")} stroke="var(--muted-foreground)" />
      <YAxis allowDecimals={false} stroke="var(--muted-foreground)" /><Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--foreground)" }} />
      <Line type="monotone" dataKey="pendentes" name="Veículos pendentes" stroke="var(--destructive)" strokeWidth={2} dot />
    </LineChart>
  </ResponsiveContainer>;
}