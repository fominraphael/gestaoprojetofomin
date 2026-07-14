import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Layers,
  Building,
  FileText,
  Download,
  Eye,
  Eye,
  X,
} from "lucide-react";
import JSZip from "jszip";
import {
  obterArquivos,
  obterDocumentosTipo,
  obterEmpresas,
  type DocumentoArquivo,
  type DocumentoTipo,
  type Empresa,
} from "@/lib/empresas";

export const Route = createFileRoute("/_authenticated/_documentos/documentos")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({ meta: [{ title: "Documentos — Portal" }] }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [arquivos, setArquivos] = useState<DocumentoArquivo[]>([]);
  const [docTipos, setDocTipos] = useState<DocumentoTipo[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [zipProgress, setZipProgress] = useState(false);
  const [zipPercent, setZipPercent] = useState("");
  const [preview, setPreview] = useState<DocumentoArquivo | null>(null);

  const handleDownload = async (f: DocumentoArquivo) => {
    try {
      let blobUrl: string;
      let revoke = false;
      if (f.arquivo_url.startsWith("data:")) {
        blobUrl = f.arquivo_url;
      } else {
        const res = await fetch(f.arquivo_url);
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        revoke = true;
      }
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = f.arquivo_nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      alert("Erro ao baixar arquivo.");
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/login" });
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoadingDocs(true);
      try {
        const [emps, tipos] = await Promise.all([obterEmpresas(), obterDocumentosTipo()]);
        setEmpresas(emps);
        setDocTipos(tipos);
        if (emps.length > 0) setSelectedEmpresa(emps[0]);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    if (isAuthenticated && !loading) load();
  }, [isAuthenticated, loading, user]);

  useEffect(() => {
    async function loadFiles() {
      if (!selectedEmpresa) {
        setArquivos([]);
        return;
      }
      setLoadingDocs(true);
      try {
        const files = await obterArquivos(selectedEmpresa.id);
        setArquivos(files);
      } catch (err) {
        console.error("Erro ao carregar arquivos:", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    if (selectedEmpresa) loadFiles();
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
        setZipPercent(`Adicionando ${i + 1}/${arquivos.length}`);
        if (file.arquivo_url.startsWith("data:")) {
          const base64Data = file.arquivo_url.split(",")[1];
          zip.file(`${folderName}/${file.arquivo_nome}`, base64Data, { base64: true });
        } else {
          const res = await fetch(file.arquivo_url);
          const blob = await res.blob();
          zip.file(`${folderName}/${file.arquivo_nome}`, blob);
        }
      }
      setZipPercent("Finalizando...");
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `KIT_${(selectedEmpresa?.nome || "EMPRESA").replace(/\s+/g, "_")}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar ZIP.");
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

  const userModules = user?.modulos || [];
  if (!isAdmin && !userModules.includes("documentos")) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center text-foreground text-sm">
        Você não tem acesso ao módulo de Documentos.
      </div>
    );
  }

  const docTypesWithFiles = docTipos.filter((t) => arquivos.some((f) => f.tipo_id === t.id));

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <header className="border-b border-border bg-card backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Portal
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-foreground" /> Documentos
            </span>
          </div>
          {isAdmin && (
            <Link
              to="/admin/usuarios"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground hover:text-foreground hover:bg-accent text-sm transition-all border border-border"
            >
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">Gerenciar</span>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Módulo de Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione uma empresa na lista para visualizar e baixar os arquivos.
          </p>
        </div>

        {empresas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            Nenhuma empresa cadastrada no banco de dados.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> Empresas Cadastradas
              </div>
              <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {empresas.map((emp) => {
                  const isSelected = selectedEmpresa?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmpresa(emp)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all border ${
                        isSelected
                          ? "bg-emerald-600/10 border-emerald-500/30 text-foreground font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <div className="font-semibold truncate">{emp.nome}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">CNPJ: {emp.cnpj}</div>
                      {emp.email_notificacao && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">✉ {emp.email_notificacao}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Documents Panel */}
            <section className="flex-1 min-w-0 space-y-6">
              {selectedEmpresa && (
                <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedEmpresa.nome}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {selectedEmpresa.cnpj}</p>
                  </div>
                  {arquivos.length > 0 && (
                    <button
                      onClick={handleDownloadAll}
                      disabled={zipProgress}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-55"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {zipProgress ? zipPercent : "Baixar Kit Completo (ZIP)"}
                    </button>
                  )}
                </div>
              )}

              {loadingDocs ? (
                <div className="text-center py-16">
                  <span className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin inline-block" />
                </div>
              ) : docTypesWithFiles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                  Nenhum arquivo disponibilizado para esta empresa ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {docTypesWithFiles.map((type) => {
                    const typeFiles = arquivos.filter((f) => f.tipo_id === type.id);
                    return (
                      <div key={type.id} className="bg-card border border-border rounded-xl p-4 hover:border-border transition-all">
                        <span className="text-[10px] bg-primary/10 border border-primary/25 text-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {type.nome}
                        </span>
                        <h4 className="text-foreground font-semibold text-sm mt-2.5">{type.descricao || "Documentação"}</h4>
                        <div className="mt-3 space-y-1.5">
                          {typeFiles.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between gap-2 text-xs text-foreground px-2 py-1.5 rounded-lg bg-muted/50 border border-border transition-all"
                            >
                              <span className="truncate flex-1">{f.arquivo_nome}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setPreview(f)}
                                  className="p-1.5 rounded-md hover:bg-accent text-foreground transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDownload(f)}
                                  className="p-1.5 rounded-md hover:bg-accent text-foreground transition-colors"
                                  title="Baixar"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border gap-2">
              <div className="text-sm font-semibold text-foreground truncate">{preview.arquivo_nome}</div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(preview)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="p-1.5 rounded-md hover:bg-accent text-foreground transition-colors"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-muted/30">
              {/\.(png|jpe?g|gif|webp|svg)$/i.test(preview.arquivo_nome) ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img src={preview.arquivo_url} alt={preview.arquivo_nome} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <iframe
                  src={preview.arquivo_url}
                  title={preview.arquivo_nome}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
