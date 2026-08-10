import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { SetorPage } from "@/components/rotina/SetorPage";

export type SetorTab = "rotina" | "tarefas" | "historico";

export const Route = createFileRoute("/_authenticated/_rotina/rotina/$setorId")({
  errorComponent: ModuleErrorBoundary,
  validateSearch: (search: Record<string, unknown>): { tab: SetorTab } => {
    const tab = search["tab"];
    return {
      tab:
        tab === "tarefas" || tab === "historico" || tab === "rotina"
          ? (tab as SetorTab)
          : "rotina",
    };
  },
  component: SetorPage,
});
