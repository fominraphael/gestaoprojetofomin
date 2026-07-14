import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const comprasModule = MODULES.find((m) => m.id === "compras")!;

export const Route = createFileRoute("/_authenticated/_compras")({
  errorComponent: ModuleErrorBoundary,
  component: ComprasLayout,
});

function ComprasLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];
  if (!userCanAccess(comprasModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={comprasModule.label} />;
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
