import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({ meta: [{ title: "Estoque — Análise de Estoque Matriz" }] }),
  component: EstoqueMatrizIndex,
});

function EstoqueMatrizIndex() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Estoque
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização e análise de estoque por filiais.
        </p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Em desenvolvimento</p>
      </div>
    </div>
  );
}
