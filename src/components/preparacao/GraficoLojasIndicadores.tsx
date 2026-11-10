import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { agruparPor, INDICADORES_DASH, type DimensaoDashboard } from "@/lib/prep-dashboard-calculo";
import type { IndicadorId } from "@/lib/preparacao-anuncios";

/** Fixed CSS token per indicator so every dashboard view uses the same color. */
export const COR_INDICADOR: Record<IndicadorId, string> = {
  os: "var(--ind-os)", foto: "var(--ind-foto)", tcuv: "var(--ind-tcuv)", auditoria: "var(--ind-auditoria)", anuncio: "var(--ind-anuncio)",
};

export interface GraficoLojasIndicadoresProps { linhas: DimensaoDashboard[]; indicadores: IndicadorId[]; limite?: number }
/** TV mode: Top-N stores as stacked bars split by indicator, with a visible legend and the store total at the end. */
export function GraficoLojasIndicadores({ linhas, indicadores, limite = 10 }: GraficoLojasIndicadoresProps) {
  const ativos = INDICADORES_DASH.filter(i => indicadores.includes(i.id));
  const dados = agruparPor(linhas, "loja")
    .sort((a, b) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome)).slice(0, limite)
    .map(g => ({ nome: g.nome, ...g.valores, total: ativos.reduce((s, i) => s + g.valores[i.id], 0) }));
  const ultimo = ativos[ativos.length - 1]?.id;
  return <section className="h-full flex flex-col gap-2 rounded-lg border p-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">Top {limite} lojas com mais pendências</h2>
      <ul className="flex flex-wrap gap-5 text-lg" aria-label="Legenda dos indicadores">
        {ativos.map(i => <li key={i.id} className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm" style={{ background: COR_INDICADOR[i.id] }} aria-hidden />{i.label}
        </li>)}
      </ul>
    </div>
    {!dados.length ? <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p> :
    <div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 60, top: 5, bottom: 5 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis dataKey="nome" type="category" width={260} tick={{ fontSize: 18, fill: "var(--foreground)" }} stroke="var(--muted-foreground)" interval={0} />
        {ativos.map(i => <Bar key={i.id} dataKey={i.id} name={i.label} stackId="ind" fill={COR_INDICADOR[i.id]} isAnimationActive={false}>
          <LabelList dataKey={i.id} position="center" fill="var(--background)" fontSize={16} fontWeight={600}
            formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")} />
          {i.id === ultimo && <LabelList dataKey="total" position="right" fill="var(--foreground)" fontSize={22} fontWeight={700} />}
        </Bar>)}
      </BarChart>
    </ResponsiveContainer></div>}
  </section>;
}
