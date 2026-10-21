import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { ListagemVeiculos } from "@/components/preparacao/ListagemVeiculos";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Pendências Preparação/Anúncios — Veículos" },
      { name: "description", content: "Pendências de preparação por veículo e loja: OS, fotos, TCUV e auditoria." },
      { property: "og:title", content: "Pendências Preparação/Anúncios" },
      { property: "og:description", content: "Pendências de preparação por veículo e loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pendências de Preparação</h1>
        <p className="text-sm text-muted-foreground">Veículos ativos do Estoque BI e o status de cada indicador.</p>
      </div>
      <ListagemVeiculos ativos />
    </div>
  ),
});
