import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import {
  MODULES,
  userCanAccess,
  perfilFromTipoUsuario,
  perfilPodeAcessarRota,
} from "@/lib/modules";

const toyotaModule = MODULES.find((m) => m.id === "toyota")!;

export const Route = createFileRoute("/_authenticated/_toyota")({
  errorComponent: ModuleErrorBoundary,
  component: ToyotaLayout,
});

function ToyotaLayout() {
  const { user, isAdmin } = useAuth();
  const userModules = user?.modulos ?? [];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const perfil = perfilFromTipoUsuario(user?.tipo_usuario);

  if (!userCanAccess(toyotaModule, isAdmin, userModules)) {
    return <ModuleAccessDenied label={toyotaModule.label} />;
  }

  if (!perfilPodeAcessarRota(pathname, isAdmin, perfil)) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-2">
            <h1 className="text-xl font-semibold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground">
              Seu perfil ({perfil}) não tem permissão para acessar esta tela.
              Fale com um Administrador se precisar liberar o acesso.
            </p>
          </div>
        </main>
      </div>
    );
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
