import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const prepModule = MODULES.find((m) => m.id === "preparacao-anuncios")!;

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios")({
  errorComponent: ModuleErrorBoundary,
  component: PreparacaoLayout,
});

function PreparacaoLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];
  if (!userCanAccess(prepModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={prepModule.label} />;
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
