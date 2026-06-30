import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import { MODULES, userCanAccess } from "@/lib/modules";

const docsModule = MODULES.find((m) => m.id === "documentos")!;

export const Route = createFileRoute("/_documentos")({
  component: DocumentosLayout,
});

function DocumentosLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];

  if (!userCanAccess(docsModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={docsModule.label} />;
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <Outlet />
    </main>
  );
}
