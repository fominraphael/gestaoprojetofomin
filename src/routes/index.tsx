import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Lock,
  ChevronRight,
  Layers,
  Users,
  FileText,
  Download,
  Building,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { obterArquivos, obterDocumentosTipo, obterEmpresas, type DocumentoArquivo, type DocumentoTipo, type Empresa } from "@/lib/empresas";
import JSZip from "jszip";

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

const allApps: AppCard[] = [
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
    id: "financeiro",
    title: "Módulo Financeiro",
    description: "Controle de faturamento, pagamentos, recebimentos e conciliação bancária.",
    icon: Lock,
    href: "#",
    status: "coming_soon",
    gradient: "from-emerald-500/10 to-emerald-600/10",
    iconBg: "from-emerald-500 to-emerald-600",
  },
  {
    id: "estoque",
    title: "Controle de Estoque",
    description: "Gestão de entradas, saídas, inventário e alertas de reposição.",
    icon: Lock,
    href: "#",
    status: "coming_soon",
    gradient: "from-amber-500/10 to-amber-600/10",
    iconBg: "from-amber-500 to-amber-600",
  },
];

export function PortalPage() {
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Documents state for merchants
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [arquivos, setArquivos] = useState<DocumentoArquivo[]>([]);
  const [docTipos, setDocTipos] = useState<DocumentoTipo[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [zipProgress, setZipProgress] = useState(false);
  const [zipPercent, setZipPercent] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, loading, navigate]);

  // Load documents for logged-in merchant
  useEffect(() => {
    async function loadMerchantData() {
      if (!user || user.role === "admin") return;
      setLoadingDocs(true);
      try {
        const [allEmps, allTipos, allFiles] = await Promise.all([
          obterEmpresas(),
          obterDocumentosTipo(),
          obterArquivos(user.empresa_id || undefined),
        ]);

        if (user.empresa_id) {
          const empObj = allEmps.find((e) => e.id === user.empresa_id);
          if (empObj) setEmpresa(empObj);
        }
        setDocTipos(allTipos);
        setArquivos(allFiles);
      } catch (err) {
        console.error("Erro ao carregar documentos do lojista:", err);
      } finally {
        setLoadingDocs(false);
      }
    }

    if (isAuthenticated && !loading) {
      loadMerchantData();
    }
  }, [isAuthenticated, loading, user]);

  const handleDownloadAll = async () => {
    if (arquivos.length === 0) return;
    setZipProgress(true);
    setZipPercent("Criando ZIP...");

    try {
      const zip = new JSZip();

      for (let i = 0; i < arquivos.length; i++) {
        const file = arquivos[i];
        const typeObj = docTipos.find((t) => t.id === file.tipo_id);
        const folderName = typeObj?.nome || "OUTROS";
        
        setZipPercent(`Adicionando: ${file.arquivo_nome} (${i + 1}/${arquivos.length})`);

        // Check if data is already base64 dataUrl (from fallback)
        if (file.arquivo_url.startsWith("data:")) {
          const base64Data = file.arquivo_url.split(",")[1];
          zip.file(`${folderName}/${file.arquivo_nome}`, base64Data, { base64: true });
        } else {
          // Fetch remote file and convert to blob
          const res = await fetch(file.arquivo_url);
          const blob = await res.blob();
          zip.file(`${folderName}/${file.arquivo_nome}`, blob);
        }
      }

      setZipPercent("Finalizando pacote...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Trigger download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `KIT_DOCUMENTOS_${empresa?.nome || "LOJISTA"}.zip`.replace(/\s+/g, "_");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao gerar ZIP do kit:", err);
      alert("Ocorreu um erro ao compactar os arquivos.");
    } finally {
      setZipProgress(false);
      setZipPercent("");
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Filter modules/apps shown to user
  const userModules = user?.modulos || [];
  const activeApps = isAdmin
    ? allApps
    : allApps.filter((app) => userModules.includes(app.id));

  // Documents listing filter: "so deve aparecer para o usuário os tipos que tiverem arquivos anexados na empresa para não poluir a visão dele"
  const docTypesWithFiles = docTipos.filter((type) =>
    arquivos.some((file) => file.tipo_id === type.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-16">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">Portal de Aplicações</div>
              <div className="text-xs text-slate-400">Painel Principal</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin only: user management panel */}
            {isAdmin && (
              <Link
                to="/admin/usuarios"
                id="link-admin-usuarios"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm transition-all border border-transparent hover:border-slate-800"
                title="Acessar Painel Admin"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Link>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-slate-300 hidden sm:inline">{user?.username}</span>
              {isAdmin && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold">
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
      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Bem-vindo,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              {user?.username}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isAdmin ? "Gerencie os lojistas ou acesse os módulos." : "Acesse os módulos disponíveis abaixo."}
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeApps.map((app) => {
            const Icon = app.icon;
            const isActive = app.status === "active";

            return (
              <div
                key={app.id}
                className={`group relative rounded-2xl border transition-all duration-300 bg-slate-900/40 backdrop-blur-sm overflow-hidden ${
                  isActive
                    ? "border-slate-800 hover:border-blue-500/40 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
                    : "border-slate-900/30 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="p-6">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${app.iconBg} mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {!isActive && (
                    <span className="absolute top-4 right-4 text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
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
                      Acessar Módulo
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      Indisponível
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>

        {/* -------------------- LOJISTA SECTION: DOCUMENTS -------------------- */}
        {!isAdmin && userModules.includes("documentos") && (
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Meus Documentos
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Empresa: <strong className="text-slate-200">{empresa?.nome || "Sincronizando..."}</strong> (CNPJ: {empresa ? empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : ""})
                </p>
              </div>

              {arquivos.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={zipProgress}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border border-transparent rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-55"
                >
                  <Download className="w-4 h-4" />
                  {zipProgress ? zipPercent : "Baixar Kit Completo (ZIP)"}
                </button>
              )}
            </div>

            {loadingDocs ? (
              <div className="text-center py-12 text-slate-500">
                <span className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin inline-block" />
              </div>
            ) : docTypesWithFiles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                Ainda não há nenhum arquivo disponibilizado para a sua empresa pelo administrador.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docTypesWithFiles.map((type) => {
                  const typeFiles = arquivos.filter((f) => f.tipo_id === type.id);
                  return (
                    <div
                      key={type.id}
                      className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {type.nome}
                        </span>
                        <h3 className="text-white font-semibold text-sm mt-3">{type.descricao || "Documentação Oficial"}</h3>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-900/60 space-y-2">
                        {typeFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between gap-4 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-xs text-slate-300 truncate max-w-[200px]" title={file.arquivo_nome}>
                              {file.arquivo_nome}
                            </span>
                            <a
                              href={file.arquivo_url}
                              download={file.arquivo_nome}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-all flex items-center justify-center shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Admin quick access panel */}
        {isAdmin && (
          <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <Settings className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-300">Área de Administração do Portal</div>
                  <div className="text-xs text-amber-400/70">
                    Gerencie lojistas, importe planilhas, crie empresas e defina tipos de documentos.
                  </div>
                </div>
              </div>
              <Link
                to="/admin/usuarios"
                id="btn-admin-panel"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all"
              >
                <Users className="w-4 h-4" />
                Acessar Painel Admin
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
