import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { SetorPage } from "@/components/rotina/SetorPage";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/$setorId")({
  errorComponent: ModuleErrorBoundary,
  component: SetorPage,
});
