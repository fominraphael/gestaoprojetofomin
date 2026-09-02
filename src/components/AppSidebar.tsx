import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Layers,
  Users,
  Circle,
  Database,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  findModuleByPath,
  userCanAccess,
  navItemsForPerfil,
  perfilFromTipoUsuario,
  type ModuleNavItem,
} from "@/lib/modules";
import { APP_VERSION } from "@/lib/version";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { logout, isAdmin, user } = useAuth();
  const userModules = user?.modulos || [];
  const perfil = perfilFromTipoUsuario(user?.tipo_usuario);
  const activeModule = findModuleByPath(pathname);
  const baseItems =
    activeModule && userCanAccess(activeModule, isAdmin, userModules)
      ? navItemsForPerfil(activeModule, isAdmin, perfil)
      : [];

  const [setorItems, setSetorItems] = useState<ModuleNavItem[]>([]);

  useEffect(() => {
    if (activeModule?.id !== "rotina") {
      setSetorItems([]);
      return;
    }
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("rotina_setores")
        .select("id, nome, cor, icone")
        .eq("ativo", true)
        .order("ordem");
      if (cancelled || !data) return;
      const items: ModuleNavItem[] = data.map((s: any) => ({
        to: `/rotina/${s.id}`,
        label: s.nome,
        icon: () => <span className="text-base leading-none">{s.icone || "📋"}</span>,
      }));
      setSetorItems(items);
    }
    load();
    return () => { cancelled = true; };
  }, [activeModule?.id]);

  const visibleItems = [...baseItems.slice(0, 1), ...setorItems, ...baseItems.slice(1)];

  /** Itens sem grupo ficam soltos; itens com `grupo` viram submenus recolhíveis. */
  const soltos = visibleItems.filter((i) => !i.grupo);
  const grupos = Array.from(
    visibleItems
      .filter((i) => !!i.grupo)
      .reduce((map, item) => {
        const nome = item.grupo as string;
        map.set(nome, [...(map.get(nome) ?? []), item]);
        return map;
      }, new Map<string, ModuleNavItem[]>())
      .entries(),
  );

  // Submenus começam minimizados por padrão (preferência persistida por usuário).
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("sidebar-grupos") ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("sidebar-grupos", JSON.stringify(gruposAbertos));
  }, [gruposAbertos]);


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

  const renderItem = (item: ModuleNavItem) => {
    const active =
      item.to === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.to || pathname.startsWith(item.to + "/");
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
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };


  return (
    <aside
      className={cn(
        "shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0 h-screen self-start",
        isCollapsed ? "w-[70px]" : "w-60",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-5 py-5 border-b border-sidebar-border flex items-center justify-between gap-2",
          isCollapsed && "px-3 justify-center",
        )}
      >
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <div className="text-base font-semibold tracking-tight truncate">
              {activeModule?.label ?? "Portal"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {activeModule?.id === "toyota" ? "Programa de certificação" : "Painel pessoal"}
            </div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground transition-colors shrink-0",
            isCollapsed && "mx-auto",
          )}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {soltos.map((item) => renderItem(item))}

        {grupos.map(([nome, itens]) => {
          const aberto = gruposAbertos[nome] === true;
          const algumAtivo = itens.some(
            (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
          );
          return (
            <div key={nome} className="pt-1">
              <button
                type="button"
                onClick={() => setGruposAbertos((p) => ({ ...p, [nome]: !aberto }))}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isCollapsed ? "justify-center px-2" : "",
                  algumAtivo
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
                title={isCollapsed ? nome : undefined}
                aria-expanded={aberto}
              >
                <Database className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{nome}</span>
                    <ChevronDown
                      className={cn("w-4 h-4 shrink-0 transition-transform", aberto && "rotate-180")}
                    />
                  </>
                )}
              </button>
              {aberto && (
                <div className={cn("space-y-1 mt-1", !isCollapsed && "pl-3")}>
                  {itens.map((item) => renderItem(item))}
                </div>
              )}
            </div>
          );
        })}
      </nav>


      {/* Footer */}
      <div
        className={cn("px-3 py-4 border-t border-sidebar-border space-y-1", isCollapsed && "px-2")}
      >
        {/* Back to Portal */}
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-2",
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
              isCollapsed && "justify-center px-2",
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
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Sair</span>}
        </button>

        {!isCollapsed && (
          <div className="px-3 pt-2 text-xs text-muted-foreground">{APP_VERSION}</div>
        )}
      </div>
    </aside>
  );
}
