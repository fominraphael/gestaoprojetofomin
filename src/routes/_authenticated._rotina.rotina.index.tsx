import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { HubPage } from "@/components/rotina/HubPage";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/")({
  errorComponent: ModuleErrorBoundary,
  component: HubPage,
});
