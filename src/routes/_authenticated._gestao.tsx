import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const gestaoModule = MODULES.find((m) => m.id === "gestao")!;

export const Route = createFileRoute("/_authenticated/_gestao")({
  errorComponent: ModuleErrorBoundary,
  component: GestaoLayout,
});

function GestaoLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];

  if (!userCanAccess(gestaoModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={gestaoModule.label} />;
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
