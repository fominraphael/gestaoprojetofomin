import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AtividadeDetalhe } from "@/components/rotina/AtividadeDetalhe";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/atividade/$id")({
  errorComponent: ModuleErrorBoundary,
  component: AtividadeDetalhe,
});
