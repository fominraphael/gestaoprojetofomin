import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { ListagemVeiculos } from "@/components/preparacao/ListagemVeiculos";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/inativos")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Inativos — Pendências Preparação/Anúncios" },
      { name: "description", content: "Veículos que saíram do Estoque BI, com histórico preservado." },
      { property: "og:title", content: "Veículos inativos — Preparação/Anúncios" },
      { property: "og:description", content: "Veículos que saíram do Estoque BI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Veículos inativos</h1>
        <p className="text-sm text-muted-foreground">Placas que não vieram na última importação do Estoque BI.</p>
      </div>
      <ListagemVeiculos ativos={false} />
    </div>
  ),
});
