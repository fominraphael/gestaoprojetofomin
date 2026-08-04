import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { TarefaDetalhe } from "@/components/rotina/TarefaDetalhe";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/tarefa/$id")({
  errorComponent: ModuleErrorBoundary,
  component: TarefaDetalhe,
});
