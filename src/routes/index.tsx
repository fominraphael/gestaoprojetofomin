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

import { MODULES, userCanAccess } from "@/lib/modules";

export function PortalPage() {
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Documents state for merchants
  const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
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

  // Load all companies and document types
  useEffect(() => {
    async function loadInitialData() {
      if (!user) return;
      setLoadingDocs(true);
      try {
        const [allEmps, allTipos] = await Promise.all([
          obterEmpresas(),
          obterDocumentosTipo(),
        ]);
        setTodasEmpresas(allEmps);
        setDocTipos(allTipos);

        // Select default company: first in the list
        if (allEmps.length > 0) {
          setSelectedEmpresa(allEmps[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      } finally {
        setLoadingDocs(false);
      }
    }

    if (isAuthenticated && !loading) {
      loadInitialData();
    }
  }, [isAuthenticated, loading, user]);

  // Fetch documents whenever the selected company changes
  useEffect(() => {
    async function loadDocumentsForCompany() {
      if (!selectedEmpresa) {
        setArquivos([]);
        return;
      }
      setLoadingDocs(true);
      try {
        const files = await obterArquivos(selectedEmpresa.id);
        setArquivos(files);
      } catch (err) {
        console.error("Erro ao carregar arquivos da empresa:", err);
      } finally {
        setLoadingDocs(false);
      }
    }

    if (selectedEmpresa) {
      loadDocumentsForCompany();
    }
  }, [selectedEmpresa]);

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
      link.download = `KIT_DOCUMENTOS_${selectedEmpresa?.nome || "LOJISTA"}.zip`.replace(/\s+/g, "_");
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
      <div className="min-h-screen bg-card flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Filter modules/apps shown to user
  const userModules = user?.modulos || [];
  const activeApps = MODULES.filter((m) => userCanAccess(m, isAdmin, userModules));

  // Documents listing filter: "so deve aparecer para o usuário os tipos que tiverem arquivos anexados na empresa para não poluir a visão dele"
  const docTypesWithFiles = docTipos.filter((type) =>
    arquivos.some((file) => file.tipo_id === type.id)
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border bg-card backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-md shadow-primary/20">
              <Layers className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground leading-tight">Portal de Aplicações</div>
              <div className="text-xs text-muted-foreground">Painel Principal</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin only: user management panel */}
            {isAdmin && (
              <Link
                to="/admin/usuarios"
                id="link-admin-usuarios"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground hover:text-foreground hover:bg-accent text-sm transition-all border border-transparent hover:border-border"
                title="Acessar Painel Admin"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Link>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-foreground text-xs font-bold shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-foreground hidden sm:inline">{user?.username}</span>
              {isAdmin && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={logout}
              id="btn-logout"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 text-sm transition-all"
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
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Bem-vindo,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-slate-600 to-foreground">
              {user?.username}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
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
                className={`group relative rounded-2xl border transition-all duration-300 bg-card backdrop-blur-sm overflow-hidden ${
                  isActive
                    ? "border-border hover:border-primary/40 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
                    : "border-border opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="p-6">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${app.iconBg} mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>

                  {!isActive && (
                    <span className="absolute top-4 right-4 text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-medium">
                      Em breve
                    </span>
                  )}

                  <h2 className="text-lg font-semibold text-foreground mb-2">{app.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">{app.description}</p>

                  {isActive ? (
                    <Link
                      to={app.href as any}
                      id={`btn-app-${app.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground group-hover:gap-2.5 transition-all"
                    >
                      Acessar Módulo
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" />
                      Indisponível
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>

        {/* Documentos module is accessed via its dedicated route (/documentos). */}
      </main>
    </div>
  );
}
