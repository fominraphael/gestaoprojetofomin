import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { agruparPor, type DimensaoDashboard } from "@/lib/prep-dashboard-calculo";
export interface GraficoPendenciasProps { titulo: string; linhas: DimensaoDashboard[]; dimensao: "loja" | "regional"; limite?: number; grande?: boolean }
/** Horizontal bars with the absolute value printed on each bar; zero-pending items are purged. */
export function GraficoPendencias({ titulo, linhas, dimensao, limite, grande }: GraficoPendenciasProps) {
  const todos = agruparPor(linhas, dimensao).map(g => ({ nome: g.nome, pendentes: g.pendentes }))
    .sort((a,b) => b.pendentes-a.pendentes || a.nome.localeCompare(b.nome));
  const dados = limite ? todos.slice(0, limite) : todos;
  const linha = grande ? 52 : 34; const altura = Math.max(160, dados.length*linha+40);
  return <section className="space-y-3 rounded-lg border p-4 min-w-0">
    <h2 className={grande ? "text-2xl font-semibold" : "text-lg font-semibold"}>{titulo}</h2>
    {!dados.length ? <p className="text-muted-foreground">Nenhuma pendência neste recorte.</p> :
    <div className={grande ? "" : "max-h-[460px] overflow-y-auto"}><ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 45, top: 5, bottom: 5 }}>
        <CartesianGrid stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" hide={grande} />
        <YAxis dataKey="nome" type="category" width={grande ? 260 : 160} tick={{ fontSize: grande ? 18 : 11, fill: "var(--foreground)" }} stroke="var(--muted-foreground)" interval={0} />
        <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--foreground)" }} />
        <Bar dataKey="pendentes" name="Veículos pendentes" fill="var(--destructive)" radius={[0,4,4,0]}>
          <LabelList dataKey="pendentes" position="right" fill="var(--foreground)" fontSize={grande ? 22 : 12} fontWeight={600} />
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>}
  </section>;
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