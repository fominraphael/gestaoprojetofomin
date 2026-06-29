import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, KanbanSquare, Map, Inbox, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/backlog", label: "Backlog", icon: KanbanSquare },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/solicitacoes", label: "Solicitações", icon: Inbox },
  { to: "/historico", label: "Lixeira", icon: Archive },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  return (
    <aside className={cn(
      "shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300",
      isCollapsed ? "w-[70px]" : "w-60"
    )}>
      <div className={cn(
        "px-5 py-5 border-b border-sidebar-border flex items-center justify-between gap-2",
        isCollapsed && "px-3 justify-center"
      )}>
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isCollapsed ? "justify-center px-2" : "",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={cn(
        "px-5 py-4 border-t border-sidebar-border text-xs text-muted-foreground",
        isCollapsed && "px-3 text-center"
      )}>
        {isCollapsed ? "v1" : "v1.0"}
      </div>
    </aside>
  );
}

