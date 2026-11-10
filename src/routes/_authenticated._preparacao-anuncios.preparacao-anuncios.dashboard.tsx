import { createFileRoute } from "@tanstack/react-router";
import { DashboardPreparacao } from "@/components/preparacao/DashboardPreparacao";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { dashboardQuery } from "@/lib/prep-dashboard";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: DashboardPreparacao,
  errorComponent: ModuleErrorBoundary,
  pendingComponent: () => <div className="p-6 space-y-4" role="status"><p>Carregando Dashboard…</p><div className="h-40 animate-pulse bg-muted rounded-lg" /></div>,
  head: () => ({ meta: [
    { title: "Dashboard — Pendências Preparação/Anúncios" },
    { name: "description", content: "Indicadores de preparação e anúncios por loja, regional e gestor, com aging e evolução diária de pendências." },
    { property: "og:title", content: "Dashboard — Preparação/Anúncios" },
    { property: "og:description", content: "Visão das pendências, aging e evolução diária de preparação por loja, regional e gestor." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});