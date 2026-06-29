import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, KanbanSquare, Map, Inbox, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/backlog", label: "Backlog", icon: KanbanSquare },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/solicitacoes", label: "Solicitações", icon: Inbox },
  { to: "/historico", label: "Histórico", icon: Archive },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="text-base font-semibold tracking-tight">Gestão de Projetos</div>
        <div className="text-xs text-muted-foreground mt-0.5">Painel pessoal</div>
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
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-sidebar-border text-xs text-muted-foreground">
        v1.0
      </div>
    </aside>
  );
}
