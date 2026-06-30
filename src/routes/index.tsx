import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Lock,
  ChevronRight,
  Layers,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Portal — Aplicações" }],
  }),
  component: PortalPage,
});

interface AppCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: "active" | "coming_soon";
  gradient: string;
  iconBg: string;
}

const apps: AppCard[] = [
  {
    id: "gestao",
    title: "Gestão de Projetos",
    description: "Dashboard, backlog, roadmap e acompanhamento de tarefas e atividades.",
    icon: LayoutDashboard,
    href: "/dashboard",
    status: "active",
    gradient: "from-blue-500/20 to-indigo-500/20",
    iconBg: "from-blue-500 to-indigo-600",
  },
  {
    id: "app2",
    title: "Em Breve",
    description: "Uma nova aplicação está sendo desenvolvida e será disponibilizada em breve.",
    icon: Lock,
    href: "#",
    status: "coming_soon",
    gradient: "from-slate-500/10 to-slate-600/10",
    iconBg: "from-slate-500 to-slate-600",
  },
  {
    id: "app3",
    title: "Em Breve",
    description: "Mais uma aplicação chegando. Fique ligado nas novidades do portal.",
    icon: Lock,
    href: "#",
    status: "coming_soon",
    gradient: "from-slate-500/10 to-slate-600/10",
    iconBg: "from-slate-500 to-slate-600",
  },
];

function PortalPage() {
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">Portal de Aplicações</div>
              <div className="text-xs text-slate-400">Painel principal</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin only: user management */}
            {isAdmin && (
              <Link
                to="/admin/usuarios"
                id="link-admin-usuarios"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm transition-all"
                title="Gerenciar Usuários"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Usuários</span>
              </Link>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/30 border border-slate-700/50">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-slate-300 hidden sm:inline">{user?.username}</span>
              {isAdmin && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={logout}
              id="btn-logout"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{user?.username}</span>
          </h1>
          <p className="text-slate-400">Selecione uma aplicação para começar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = app.status === "active";

            return (
              <div
                key={app.id}
                className={`group relative rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? "border-slate-600/50 hover:border-blue-500/40 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
                    : "border-slate-700/30 opacity-60 cursor-not-allowed"
                } bg-gradient-to-br ${app.gradient} backdrop-blur-sm overflow-hidden`}
              >
                <div className="p-6">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${app.iconBg} mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Badge */}
                  {!isActive && (
                    <span className="absolute top-4 right-4 text-xs bg-slate-600/50 text-slate-400 border border-slate-600/30 px-2 py-0.5 rounded-full">
                      Em breve
                    </span>
                  )}

                  <h2 className="text-lg font-semibold text-white mb-2">{app.title}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">{app.description}</p>

                  {isActive ? (
                    <Link
                      to={app.href as any}
                      id={`btn-app-${app.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 group-hover:gap-2.5 transition-all"
                    >
                      Acessar
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      Indisponível
                    </span>
                  )}
                </div>

                {/* Bottom glow on hover */}
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>

        {/* Admin quick access */}
        {isAdmin && (
          <div className="mt-10 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20">
                  <Settings className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-300">Área do Administrador</div>
                  <div className="text-xs text-amber-400/70">Gerencie os usuários e aprovações do sistema</div>
                </div>
              </div>
              <Link
                to="/admin/usuarios"
                id="btn-admin-panel"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-sm font-medium transition-all"
              >
                <Users className="w-4 h-4" />
                Gerenciar Usuários
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
