import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/AppSidebar";
import { VersionWatcher } from "@/components/VersionWatcher";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voltar ao Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Portal de Aplicações" },
      { name: "description", content: "Painel pessoal de gestão de projetos e atividades" },
      { property: "og:title", content: "Portal de Aplicações" },
      { name: "twitter:title", content: "Portal de Aplicações" },
      { property: "og:description", content: "Painel pessoal de gestão de projetos e atividades" },
      { name: "twitter:description", content: "Painel pessoal de gestão de projetos e atividades" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5525a6bd-06d3-4db5-b5b1-9f4e437055ee/id-preview-5d767bb2--358d8cb0-fba0-4a79-b55c-25d29ba4cae9.lovable.app-1782310781905.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5525a6bd-06d3-4db5-b5b1-9f4e437055ee/id-preview-5d767bb2--358d8cb0-fba0-4a79-b55c-25d29ba4cae9.lovable.app-1782310781905.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Routes that do NOT show the sidebar (public pages + portal + standalone modules)
const PUBLIC_ROUTES = ["/login", "/registrar", "/"];
// Sidebar of "Gestão de Projetos" is only shown on its own module routes
const GESTAO_SIDEBAR_ROUTES = ["/dashboard", "/backlog", "/roadmap", "/solicitacoes", "/historico"];

// All valid app routes. Anything outside this list returns 404.
const KNOWN_ROUTES = [
  "/",
  "/login",
  "/registrar",
  "/dashboard",
  "/backlog",
  "/roadmap",
  "/solicitacoes",
  "/historico",
  "/documentos",
  "/admin/usuarios",
];

function isKnownRoute(pathname: string) {
  return KNOWN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VersionWatcher />
        <AppLayout />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RedirectToLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login" });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground font-medium">Redirecionando para o login...</p>
      </div>
    </div>
  );
}

function AccessDenied({ reason }: { reason: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center bg-card border border-border p-8 rounded-2xl shadow-xl shadow-red-950/5 backdrop-blur-md relative overflow-hidden">
        {/* Glowing background light */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-red-600/5 rounded-full blur-2xl" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 shadow-inner shadow-red-500/5">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
          403 - Acesso Negado
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          {reason}
        </p>

        <button
          onClick={() => navigate({ to: "/" })}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-transparent rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-red-900/25 active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Portal
        </button>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // 1. loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 0. Unknown route → always show 404 (no auth leak, no redirect loop)
  if (!isKnownRoute(pathname)) {
    return <NotFoundComponent />;
  }

  const isPublicRoute = ["/login", "/registrar"].includes(pathname);

  // 2. Unauthenticated user
  if (!isAuthenticated) {
    if (isPublicRoute) {
      return <Outlet />;
    }
    return <RedirectToLogin />;
  }

  // 3. Authenticated user logic
  const isAdmin = user?.role === "admin";
  const userModules = user?.modulos || [];

  // Protect Admin Area
  if (pathname.startsWith("/admin") && !isAdmin) {
    return <AccessDenied reason="Você não possui credenciais de administrador para acessar este painel." />;
  }

  // Protect Project Management Module ("gestao")
  const isGestaoRoute = ["/dashboard", "/backlog", "/roadmap", "/solicitacoes", "/historico"].some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isGestaoRoute && !isAdmin && !userModules.includes("gestao")) {
    return <AccessDenied reason="Você não possui permissão para acessar o módulo de Gestão de Projetos." />;
  }

  // Protect Documents Module
  if (pathname.startsWith("/documentos") && !isAdmin && !userModules.includes("documentos")) {
    return <AccessDenied reason="Você não possui permissão para acessar o módulo de Documentos." />;
  }

  const showSidebar = GESTAO_SIDEBAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  return (
    <div className="flex min-h-screen w-full bg-background">
      {showSidebar && <AppSidebar />}
      <main className={showSidebar ? "flex-1 min-w-0 overflow-x-hidden" : "w-full"}>
        <Outlet />
      </main>
    </div>
  );
}

