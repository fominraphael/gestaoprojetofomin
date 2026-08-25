import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/regras")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({ meta: [{ title: "Regras — Análise de Estoque Matriz" }] }),
  component: EstoqueMatrizRegras,
});

function EstoqueMatrizRegras() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> Regras
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Regras de controle e configurações de estoque.
        </p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Em desenvolvimento</p>
      </div>
    </div>
  );
}
