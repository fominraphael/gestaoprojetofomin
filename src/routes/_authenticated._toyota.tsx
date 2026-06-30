import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const toyotaModule = MODULES.find((m) => m.id === "toyota")!;

export const Route = createFileRoute("/_authenticated/_toyota")({
  errorComponent: ModuleErrorBoundary,
  component: ToyotaLayout,
});

function ToyotaLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];

  if (!userCanAccess(toyotaModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={toyotaModule.label} />;
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
