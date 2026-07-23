import {
  LayoutDashboard,
  KanbanSquare,
  Map,
  Inbox,
  Archive,
  FileText,
  Car,
  Settings,
  Upload,
  ShieldCheck,
  ListChecks,
  GitBranch,
  Wrench,
  Truck,
  FolderKanban,
  ShoppingCart,
  ClipboardList,
  PlusCircle,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Perfis específicos do módulo Toyota (definidos em `profiles.tipo_usuario`).
 * Administrador tem acesso a tudo; demais perfis são restritos por rota.
 */
export type PerfilToyota =
  | "Administrador"
  | "Preparador"
  | "Consultor Pós-Vendas"
  | "Gestor de Seminovos"
  | "Vendedor de Seminovos"
  | "Mecânico Toyota"
  | "Outro";

export function perfilFromTipoUsuario(tipo: string | null | undefined): PerfilToyota {
  const t = (tipo ?? "").trim().toLowerCase();
  if (t === "administrador") return "Administrador";
  if (t === "preparador") return "Preparador";
  if (t === "gestor de seminovos") return "Gestor de Seminovos";
  if (t === "vendedor de seminovos") return "Vendedor de Seminovos";
  if (t === "mecânico toyota" || t === "mecanico toyota") return "Mecânico Toyota";
  if (
    t === "consultor pós-vendas" ||
    t === "consultor pos-vendas" ||
    t === "consultor de pós-vendas" ||
    t === "consultor de pos-vendas" ||
    t === "gestor de pós vendas" ||
    t === "gestor de pos vendas"
  )
    return "Consultor Pós-Vendas";
  return "Outro";
}

export interface ModuleNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Perfis Toyota que podem enxergar este item. Admin do sistema (isAdmin) ignora. */
  perfis?: PerfilToyota[];
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
    description: "Dashboard, backlog, roadmap e acompanhamento de tarefas e atividades.",
    icon: LayoutDashboard,
    href: "/projetos",
    requiredModule: "gestao",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
    navItems: [
      { to: "/projetos", label: "Projetos", icon: FolderKanban },
      { to: "/historico", label: "Lixeira", icon: Archive },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    description: "Gestão de empresas, tipos de documentos e arquivos anexados por lojista.",
    icon: FileText,
    href: "/documentos",
    requiredModule: "documentos",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
  },
  {
    id: "toyota",
    label: "Certificação Toyota",
    description:
      "Gestão de filiais, vínculos de usuários e configurações do programa de certificação.",
    icon: Car,
    href: "/toyota/configuracoes",
    requiredModule: "toyota",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
    navItems: [
      {
        to: "/toyota/painel",
        label: "Dashboard",
        icon: GitBranch,
        perfis: ["Administrador", "Preparador", "Consultor Pós-Vendas"],
      },
      {
        to: "/toyota/painel-geral",
        label: "Processos",
        icon: LayoutDashboard,
        perfis: ["Administrador", "Preparador", "Consultor Pós-Vendas"],
      },
      {
        to: "/toyota/estoque/importar",
        label: "Importações",
        icon: Upload,
        perfis: ["Administrador"],
      },
      {
        to: "/toyota/elegiveis",
        label: "Análise Central",
        icon: ShieldCheck,
        perfis: ["Administrador"],
      },
      {
        to: "/toyota/fila-preparador",
        label: "Fila do Preparador",
        icon: Truck,
        perfis: ["Administrador", "Preparador"],
      },
      {
        to: "/toyota/fila-posvendas",
        label: "Fila do Pós-Vendas",
        icon: Wrench,
        perfis: ["Administrador", "Consultor Pós-Vendas", "Mecânico Toyota"],
      },
      {
        to: "/toyota/revisoes",
        label: "Revisão de Seminovos",
        icon: ClipboardCheck,
        perfis: ["Administrador", "Gestor de Seminovos", "Mecânico Toyota", "Vendedor de Seminovos"],
      },
      {
        to: "/toyota/regras",
        label: "Regras do Sistema",
        icon: ListChecks,
        perfis: ["Administrador"],
      },
      {
        to: "/toyota/configuracoes",
        label: "Configurações",
        icon: Settings,
        perfis: ["Administrador"],
      },
    ],
  },
  {
    id: "compras",
    label: "Compras Seminovos",
    description:
      "Chamados de compra de seminovos: formulário, documentação por estado, análise Central e aprovações.",
    icon: ShoppingCart,
    href: "/compras",
    requiredModule: "compras",
    gradient: "from-slate-500/15 to-slate-700/15",
    iconBg: "from-slate-500 to-slate-700",
    navItems: [
      { to: "/compras", label: "Chamados", icon: ClipboardList },
      { to: "/compras/novo", label: "Novo chamado", icon: PlusCircle },
      {
        to: "/compras/configuracoes",
        label: "Configurações",
        icon: Settings,
        perfis: ["Administrador"],
      },
    ],
  },
];

/** All routes owned by registered modules (entry + sidebar nav items). */
export const MODULE_ROUTES: string[] = Array.from(
  new Set(MODULES.flatMap((m) => [m.href, ...(m.navItems?.map((n) => n.to) ?? [])])),
);

/** Always-on app routes (public + portal + admin). */
export const CORE_ROUTES = ["/", "/login", "/registrar", "/recuperar-senha", "/admin/usuarios"];

/** Allowlist used by the router to detect unknown URLs (404s). */
export const KNOWN_ROUTES = [...CORE_ROUTES, ...MODULE_ROUTES];

export function isKnownRoute(pathname: string): boolean {
  return KNOWN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/** Find the module that owns a given pathname, if any. */
export function findModuleByPath(pathname: string): ModuleDef | undefined {
  return MODULES.find((m) =>
    [m.href, ...(m.navItems?.map((n) => n.to) ?? [])].some(
      (r) => pathname === r || pathname.startsWith(r + "/"),
    ),
  );
}

/**
 * Access rule:
 * - If the user has an explicit non-empty `modulos` list, respect it strictly
 *   (including for admins — a scoped admin sees only the listed modules).
 * - Otherwise, admins bypass and see everything; regular users see nothing.
 */
export function userCanAccess(mod: ModuleDef, isAdmin: boolean, userModules: string[]): boolean {
  if (userModules && userModules.length > 0) {
    return userModules.includes(mod.requiredModule);
  }
  return isAdmin;
}

/**
 * Retorna os nav items visíveis dado o perfil Toyota do usuário.
 * Administradores do sistema (`isAdmin`) veem tudo, independente do perfil.
 */
export function navItemsForPerfil(
  mod: ModuleDef,
  isAdmin: boolean,
  perfil: PerfilToyota,
): ModuleNavItem[] {
  const items = mod.navItems ?? [];
  if (isAdmin || perfil === "Administrador") return items;
  return items.filter((it) => !it.perfis || it.perfis.includes(perfil));
}

/** Retorna true se o perfil pode acessar a rota exata (usado por route guards). */
export function perfilPodeAcessarRota(
  pathname: string,
  isAdmin: boolean,
  perfil: PerfilToyota,
): boolean {
  if (isAdmin || perfil === "Administrador") return true;
  const mod = findModuleByPath(pathname);
  if (!mod) return true;
  const item = (mod.navItems ?? []).find(
    (n) => pathname === n.to || pathname.startsWith(n.to + "/"),
  );
  if (!item || !item.perfis) return true;
  return item.perfis.includes(perfil);
}
