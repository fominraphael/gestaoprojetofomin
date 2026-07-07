import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { EnvioToyotaTab } from "./_authenticated._toyota.toyota.elegiveis";

export const Route = createFileRoute(
  "/_authenticated/_toyota/toyota/recusados",
)({
  errorComponent: ModuleErrorBoundary,
  component: RecusadosToyota,
});

function RecusadosToyota() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-[1400px] space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-red-100 p-2">
          <AlertTriangle className="h-5 w-5 text-red-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recusados Toyota</h1>
          <p className="text-sm text-muted-foreground">
            Veículos reprovados no retorno da Toyota. Analise o motivo, ajuste os documentos e
            reenvie com um novo código TCUV — ou arquive o processo.
          </p>
        </div>
      </header>
      <EnvioToyotaTab mode="recusados" />
    </div>
  );
}
