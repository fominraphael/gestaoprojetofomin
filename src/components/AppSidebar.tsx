import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { findModuleByPath, userCanAccess } from "@/lib/modules";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { logout, isAdmin, user } = useAuth();
  const userModules = user?.modulos || [];
  const activeModule = findModuleByPath(pathname);
  const visibleItems =
    activeModule && userCanAccess(activeModule, isAdmin, userModules)
      ? activeModule.navItems ?? []
      : [];
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", String(newValue));
      return newValue;
    });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0 h-screen self-start",
        isCollapsed ? "w-[70px]" : "w-60"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-5 py-5 border-b border-sidebar-border flex items-center justify-between gap-2",
          isCollapsed && "px-3 justify-center"
        )}
      >
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <div className="text-base font-semibold tracking-tight truncate">Gestão de Projetos</div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">Painel pessoal</div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground transition-colors shrink-0",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const active =
            item.to === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isCollapsed ? "justify-center px-2" : "",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "px-3 py-4 border-t border-sidebar-border space-y-1",
          isCollapsed && "px-2"
        )}
      >
        {/* Back to Portal */}
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Voltar ao Portal" : undefined}
        >
          <Layers className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Portal</span>}
        </Link>

        {isAdmin && (
          <Link
            to="/admin/usuarios"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Painel Admin" : undefined}
          >
            <Users className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Painel Admin</span>}
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Sair</span>}
        </button>

        {!isCollapsed && (
          <div className="px-3 pt-2 text-xs text-muted-foreground">v1.0</div>
        )}
      </div>
    </aside>
  );
}
