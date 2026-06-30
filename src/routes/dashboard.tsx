import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { todasTarefasQuery, statusColor, statusDot, type Tarefa, type Categoria } from "@/lib/tarefas";
import { CheckCircle2, Clock, Circle, ListTodo, CalendarClock, Timer, Target } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestão de Projetos" },
      { name: "description", content: "Visão geral das tarefas e entregas" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todasTarefasQuery()),
  component: Dashboard,
  pendingComponent: DashboardSkeleton,
  pendingMs: 0,
  pendingMinMs: 200,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Sem dados.</div>,
});

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-md bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-xl bg-muted" />
        <div className="h-72 rounded-xl bg-muted" />
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}

function Dashboard() {
  const { data: tarefas } = useSuspenseQuery(todasTarefasQuery());

  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "Concluído").length;
  const andamento = tarefas.filter((t) => t.status === "Em andamento").length;
  const naoIniciadas = tarefas.filter((t) => t.status === "Não iniciada").length;
  const pctConcluidas = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const entregasRecentes = tarefas
    .filter((t) => t.status === "Concluído")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);

  const proximasEntregas = tarefas
    .filter((t) => t.categoria === "roadmap" && t.fim_previsto && t.status !== "Concluído")
    .sort((a, b) => (a.fim_previsto ?? "").localeCompare(b.fim_previsto ?? ""))
    .slice(0, 6);

  const abertas = tarefas.filter(
    (t) => t.status !== "Concluído" && t.categoria !== "historico",
  );
  const somaPorCategoria = (cat: Categoria) =>
    abertas
      .filter((t) => t.categoria === cat)
      .reduce((acc, t) => acc + (t.estimativa_dias ?? 0), 0);
  const diasBacklog = somaPorCategoria("backlog");
  const diasRoadmap = somaPorCategoria("roadmap");
  const diasSolicitacoes = somaPorCategoria("solicitacao");
  const diasTotal = diasBacklog + diasRoadmap + diasSolicitacoes;
  const dataConclusao = addBusinessDays(new Date(), diasTotal);

  const { pctNoPrazo, totalAvaliadas, noPrazo, tendencia } = useMemo(
    () => computarNoPrazo(tarefas),
    [tarefas],
  );

  const concluidasPorSemana = useMemo(() => computarConcluidasPorSemana(tarefas), [tarefas]);
  const concluidasPorCategoria = useMemo(() => computarConcluidasPorCategoria(tarefas), [tarefas]);
  const estimativaVsReal = useMemo(() => computarEstimativaVsReal(tarefas), [tarefas]);

  const chartData = [
    { name: "Concluído", value: concluidas, color: "oklch(0.55 0.13 155)" },
    { name: "Em andamento", value: andamento, color: "oklch(0.5 0.13 240)" },
    { name: "Não iniciada", value: naoIniciadas, color: "oklch(0.7 0.01 260)" },
  ];




  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral das suas tarefas e entregas
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total de tarefas"
          value={total}
          icon={<ListTodo className="w-4 h-4" />}
        />
        <MetricCard
          label="% concluídas"
          value={`${pctConcluidas}%`}
          icon={<CheckCircle2 className="w-4 h-4 text-status-done" />}
        />
        <MetricCard
          label="Em andamento"
          value={andamento}
          icon={<Clock className="w-4 h-4 text-status-doing" />}
        />
        <MetricCard
          label="Não iniciadas"
          value={naoIniciadas}
          icon={<Circle className="w-4 h-4 text-status-todo" />}
        />
      </div>

      <div className="mb-8 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Timer className="w-3.5 h-3.5" />
              Esforço estimado em aberto
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{diasTotal}</span>
              <span className="text-sm text-muted-foreground">
                {diasTotal === 1 ? "dia" : "dias"} no total
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-6 max-w-xl">
              <EstimativaItem label="Backlog" valor={diasBacklog} />
              <EstimativaItem label="Roadmap" valor={diasRoadmap} />
              <EstimativaItem label="Solicitações" valor={diasSolicitacoes} />
            </div>
          </div>
          <div className="rounded-md bg-background/60 border border-border p-4 min-w-[220px]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5" />
              Conclusão projetada
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {dataConclusao.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              hoje + {diasTotal} {diasTotal === 1 ? "dia útil" : "dias úteis"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Target className="w-3.5 h-3.5" />
            Entregas no prazo · últimos 30 dias
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">
              {totalAvaliadas === 0 ? "—" : `${pctNoPrazo}%`}
            </span>
            {totalAvaliadas > 0 && (
              <span className="text-sm text-muted-foreground">
                {noPrazo}/{totalAvaliadas} no prazo
              </span>
            )}
          </div>
          {totalAvaliadas === 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              Nenhuma entrega concluída com prazo nos últimos 30 dias.
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Tendência mensal — % no prazo
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencia} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "No prazo"]}
                  labelFormatter={(l) => l}
                />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="oklch(0.55 0.13 155)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Distribuição por status
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground mb-4">Entregas recentes</h2>
          {entregasRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma entrega ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entregasRecentes.map((t) => (
                <TarefaRow key={t.id} t={t} mostrarData />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Próximas entregas</h2>
        {proximasEntregas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem prazos definidos no roadmap.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {proximasEntregas.map((t) => (
              <TarefaRow key={t.id} t={t} mostrarPrazo />
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Concluídas por semana · últimas 8 semanas
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={concluidasPorSemana} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="oklch(0.55 0.13 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Concluídas por categoria
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={concluidasPorCategoria}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {concluidasPorCategoria.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {concluidasPorCategoria.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 mt-8">
        <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-sm font-medium text-foreground">
            Estimativa vs. duração real
          </h2>
          <div className="text-xs text-muted-foreground">
            Pontos acima da linha = subestimado · abaixo = sobrestimado
          </div>
        </div>
        {estimativaVsReal.pontos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes (precisa de estimativa, início real e fim real).
          </p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" />
                  <XAxis
                    type="number"
                    dataKey="estimado"
                    name="Estimado"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Estimado (dias)", position: "insideBottom", offset: -8, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="real"
                    name="Real"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Real (dias)", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <ZAxis range={[80, 80]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { titulo: string; estimado: number; real: number };
                      return (
                        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-md">
                          <div className="font-medium mb-1">{p.titulo}</div>
                          <div className="text-muted-foreground">Estimado: {p.estimado} d</div>
                          <div className="text-muted-foreground">Real: {p.real} d</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 0 },
                      { x: estimativaVsReal.max, y: estimativaVsReal.max },
                    ]}
                    stroke="oklch(0.6 0.02 260)"
                    strokeDasharray="4 4"
                  />
                  <Scatter data={estimativaVsReal.pontos} fill="oklch(0.5 0.13 240)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
              <ResumoEstimativa
                label="No alvo (±1d)"
                valor={estimativaVsReal.noAlvo}
                total={estimativaVsReal.pontos.length}
                cor="text-status-done"
              />
              <ResumoEstimativa
                label="Subestimadas"
                valor={estimativaVsReal.sub}
                total={estimativaVsReal.pontos.length}
                cor="text-destructive"
              />
              <ResumoEstimativa
                label="Sobrestimadas"
                valor={estimativaVsReal.sobre}
                total={estimativaVsReal.pontos.length}
                cor="text-status-doing"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TarefaRow({
  t,
  mostrarData,
  mostrarPrazo,
}: {
  t: Tarefa;
  mostrarData?: boolean;
  mostrarPrazo?: boolean;
}) {
  return (
    <li className="py-3 flex items-center gap-4">
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{t.titulo}</div>
        <div className="text-xs text-muted-foreground truncate">
          {t.projeto ?? "Sem projeto"}
          {t.codigo && ` · ${t.codigo}`}
        </div>
      </div>
      <span
        className={`text-xs px-2 py-1 rounded-md font-medium ${statusColor[t.status]}`}
      >
        {t.status}
      </span>
      {mostrarData && (
        <div className="text-xs text-muted-foreground w-24 text-right">
          {new Date(t.updated_at).toLocaleDateString("pt-BR")}
        </div>
      )}
      {mostrarPrazo && t.fim_previsto && (
        <div className="text-xs text-muted-foreground w-24 text-right">
          {new Date(t.fim_previsto + "T00:00:00").toLocaleDateString("pt-BR")}
        </div>
      )}
    </li>
  );
}

function EstimativaItem({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">
        {valor}
        <span className="text-xs text-muted-foreground font-normal ml-1">
          {valor === 1 ? "dia" : "dias"}
        </span>
      </div>
    </div>
  );
}

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  let restantes = Math.max(0, Math.floor(days));
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

const NOMES_MES_CURTO = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function computarNoPrazo(tarefas: Tarefa[]) {
  // Avaliáveis: concluídas, com fim_real e fim_previsto, fora da lixeira.
  const avaliaveis = tarefas.filter(
    (t) =>
      t.categoria !== "historico" &&
      t.status === "Concluído" &&
      !!t.fim_real &&
      !!t.fim_previsto,
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite30 = new Date(hoje);
  limite30.setDate(limite30.getDate() - 30);

  const ultimas30 = avaliaveis.filter((t) => {
    const d = new Date(t.fim_real! + "T00:00:00");
    return d.getTime() >= limite30.getTime();
  });
  const noPrazo = ultimas30.filter((t) => t.fim_real! <= t.fim_previsto!).length;
  const totalAvaliadas = ultimas30.length;
  const pctNoPrazo = totalAvaliadas === 0 ? 0 : Math.round((noPrazo / totalAvaliadas) * 100);

  // Tendência: últimos 6 meses (incluindo o atual), agrupado por mês do fim_real.
  const buckets: { key: string; label: string; ano: number; mes: number; total: number; ok: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`,
      label: `${NOMES_MES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      ano: d.getFullYear(),
      mes: d.getMonth(),
      total: 0,
      ok: 0,
    });
  }
  avaliaveis.forEach((t) => {
    const d = new Date(t.fim_real! + "T00:00:00");
    const b = buckets.find((x) => x.ano === d.getFullYear() && x.mes === d.getMonth());
    if (!b) return;
    b.total++;
    if (t.fim_real! <= t.fim_previsto!) b.ok++;
  });
  const tendencia = buckets.map((b) => ({
    label: b.label,
    pct: b.total === 0 ? null : Math.round((b.ok / b.total) * 100),
  }));

  return { pctNoPrazo, totalAvaliadas, noPrazo, tendencia };
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0=dom
  const diff = dow === 0 ? -6 : 1 - dow; // semana começa segunda
  out.setDate(out.getDate() + diff);
  return out;
}

function computarConcluidasPorSemana(tarefas: Tarefa[]) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioSemanaAtual = startOfWeek(hoje);

  const buckets: { key: string; label: string; inicio: Date; total: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const inicio = new Date(inicioSemanaAtual);
    inicio.setDate(inicio.getDate() - i * 7);
    buckets.push({
      key: inicio.toISOString().slice(0, 10),
      label: `${String(inicio.getDate()).padStart(2, "0")}/${String(inicio.getMonth() + 1).padStart(2, "0")}`,
      inicio,
      total: 0,
    });
  }
  tarefas.forEach((t) => {
    if (t.categoria === "historico") return;
    if (t.status !== "Concluído") return;
    const ref = t.fim_real ?? t.updated_at.slice(0, 10);
    if (!ref) return;
    const d = new Date(ref + (ref.length === 10 ? "T00:00:00" : ""));
    if (Number.isNaN(d.getTime())) return;
    const ini = startOfWeek(d);
    const b = buckets.find((x) => x.inicio.getTime() === ini.getTime());
    if (b) b.total++;
  });
  return buckets.map(({ label, total }) => ({ label, total }));
}

function computarConcluidasPorCategoria(tarefas: Tarefa[]) {
  const cores: Record<string, string> = {
    Backlog: "oklch(0.55 0.13 240)",
    Roadmap: "oklch(0.55 0.13 155)",
    Solicitações: "oklch(0.65 0.13 60)",
  };
  const mapa: Record<string, number> = { Backlog: 0, Roadmap: 0, Solicitações: 0 };
  tarefas.forEach((t) => {
    if (t.status !== "Concluído") return;
    const origem = t.categoria === "historico" ? t.categoria_origem : t.categoria;
    if (origem === "backlog") mapa.Backlog++;
    else if (origem === "roadmap") mapa.Roadmap++;
    else if (origem === "solicitacao") mapa["Solicitações"]++;
  });
  return Object.entries(mapa).map(([name, value]) => ({ name, value, color: cores[name] }));
}

function computarEstimativaVsReal(tarefas: Tarefa[]) {
  type Ponto = { titulo: string; estimado: number; real: number };
  const pontos: Ponto[] = [];
  tarefas.forEach((t) => {
    if (t.status !== "Concluído") return;
    if (!t.estimativa_dias || !t.inicio_real || !t.fim_real) return;
    const ini = new Date(t.inicio_real + "T00:00:00");
    const fim = new Date(t.fim_real + "T00:00:00");
    const real = Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (real < 0) return;
    pontos.push({ titulo: t.titulo, estimado: t.estimativa_dias, real });
  });
  const max = pontos.reduce((m, p) => Math.max(m, p.estimado, p.real), 1);
  const noAlvo = pontos.filter((p) => Math.abs(p.real - p.estimado) <= 1).length;
  const sub = pontos.filter((p) => p.real - p.estimado > 1).length;
  const sobre = pontos.filter((p) => p.estimado - p.real > 1).length;
  return { pontos, max, noAlvo, sub, sobre };
}

function ResumoEstimativa({
  label,
  valor,
  total,
  cor,
}: {
  label: string;
  valor: number;
  total: number;
  cor: string;
}) {
  const pct = total === 0 ? 0 : Math.round((valor / total) * 100);
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-lg font-semibold ${cor}`}>{valor}</span>
        <span className="text-muted-foreground">/ {total} · {pct}%</span>
      </div>
    </div>
  );
}



