import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { todasTarefasQuery, statusColor, statusDot, type Tarefa, type Categoria } from "@/lib/tarefas";
import { CheckCircle2, Clock, Circle, ListTodo, CalendarClock, Timer } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestão de Projetos" },
      { name: "description", content: "Visão geral das tarefas e entregas" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todasTarefasQuery()),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Sem dados.</div>,
});

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
