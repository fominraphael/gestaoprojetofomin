import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { ConfigPage } from "@/components/rotina/ConfigPage";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  component: ConfigPage,
});
