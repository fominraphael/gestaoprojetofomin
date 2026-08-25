import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const estoqueMatrizModule = MODULES.find((m) => m.id === "estoque-matriz")!;

export const Route = createFileRoute("/_authenticated/_estoque-matriz")({
  errorComponent: ModuleErrorBoundary,
  component: EstoqueMatrizLayout,
});

function EstoqueMatrizLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];
  if (!userCanAccess(estoqueMatrizModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={estoqueMatrizModule.label} />;
  }
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
