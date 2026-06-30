import {
  LayoutDashboard,
  KanbanSquare,
  Map,
  Inbox,
  Archive,
  FileText,
  Car,
  Settings,
  type LucideIcon,
} from "lucide-react";


export interface ModuleNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface ModuleDef {
  /** Stable id, also used as the key in `user.modulos` */
  id: string;
  /** Display label (portal card title / sidebar header) */
  label: string;
  /** Short description shown on the portal card */
  description: string;
  /** Main icon (portal card + sidebar header) */
  icon: LucideIcon;
  /** Entry route — clicked from the portal */
  href: string;
  /** Permission key checked against `user.modulos` (admins bypass) */
  requiredModule: string;
  /** Optional sidebar nav items shown when inside the module */
  navItems?: ModuleNavItem[];
  /** Tailwind gradient used by the portal card */
  gradient?: string;
  iconBg?: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: "gestao",
    label: "Gestão de Projetos",
    description:
      "Dashboard, backlog, roadmap e acompanhamento de tarefas e atividades.",
    icon: LayoutDashboard,
    href: "/dashboard",
    requiredModule: "gestao",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
    navItems: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/backlog", label: "Backlog", icon: KanbanSquare },
      { to: "/roadmap", label: "Roadmap", icon: Map },
      { to: "/solicitacoes", label: "Solicitações", icon: Inbox },
      { to: "/historico", label: "Lixeira", icon: Archive },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    description:
      "Gestão de empresas, tipos de documentos e arquivos anexados por lojista.",
    icon: FileText,
    href: "/documentos",
    requiredModule: "documentos",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
  },
];

/** All routes owned by registered modules (entry + sidebar nav items). */
export const MODULE_ROUTES: string[] = Array.from(
  new Set(
    MODULES.flatMap((m) => [m.href, ...(m.navItems?.map((n) => n.to) ?? [])]),
  ),
);

/** Always-on app routes (public + portal + admin). */
export const CORE_ROUTES = ["/", "/login", "/registrar", "/admin/usuarios"];

/** Allowlist used by the router to detect unknown URLs (404s). */
export const KNOWN_ROUTES = [...CORE_ROUTES, ...MODULE_ROUTES];

export function isKnownRoute(pathname: string): boolean {
  return KNOWN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

/** Find the module that owns a given pathname, if any. */
export function findModuleByPath(pathname: string): ModuleDef | undefined {
  return MODULES.find((m) =>
    [m.href, ...(m.navItems?.map((n) => n.to) ?? [])].some(
      (r) => pathname === r || pathname.startsWith(r + "/"),
    ),
  );
}

/** Returns true if the user can access the given module. Admins bypass. */
export function userCanAccess(
  mod: ModuleDef,
  isAdmin: boolean,
  userModules: string[],
): boolean {
  return isAdmin || userModules.includes(mod.requiredModule);
}
