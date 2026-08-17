import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { SetorPage } from "@/components/rotina/SetorPage";

export type SetorTab = "rotina" | "tarefas" | "historico" | "lixeira";

const TABS_VALIDAS: SetorTab[] = ["rotina", "tarefas", "historico", "lixeira"];

export const Route = createFileRoute("/_authenticated/_rotina/rotina/$setorId")({
  errorComponent: ModuleErrorBoundary,
  validateSearch: (search: Record<string, unknown>): { tab: SetorTab } => {
    const tab = search["tab"];
    return {
      tab: TABS_VALIDAS.includes(tab as SetorTab) ? (tab as SetorTab) : "rotina",
    };
  },
  component: SetorPage,
});
