import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Layers,
  Building,
  FileText,
  Download,
  ExternalLink,
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

export const Route = createFileRoute("/documentos")({
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const userModules = user?.modulos || [];
  if (!isAdmin && !userModules.includes("documentos")) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 text-sm">
        Você não tem acesso ao módulo de Documentos.
      </div>
    );
  }

  const docTypesWithFiles = docTipos.filter((t) => arquivos.some((f) => f.tipo_id === t.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-16">
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Portal
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Documentos
            </span>
          </div>
          {isAdmin && (
            <Link
              to="/admin/usuarios"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm transition-all border border-slate-800"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Gerenciar</span>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Módulo de Documentos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Selecione uma empresa na lista para visualizar e baixar os arquivos.
          </p>
        </div>

        {empresas.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            Nenhuma empresa cadastrada no banco de dados.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-800/80 pb-6 md:pb-0 md:pr-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
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
                          ? "bg-emerald-600/10 border-emerald-500/30 text-white font-medium"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="font-semibold truncate">{emp.nome}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">CNPJ: {emp.cnpj}</div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Documents Panel */}
            <section className="flex-1 min-w-0 space-y-6">
              {selectedEmpresa && (
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedEmpresa.nome}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">CNPJ: {selectedEmpresa.cnpj}</p>
                  </div>
                  {arquivos.length > 0 && (
                    <button
                      onClick={handleDownloadAll}
                      disabled={zipProgress}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10 disabled:opacity-55"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {zipProgress ? zipPercent : "Baixar Kit Completo (ZIP)"}
                    </button>
                  )}
                </div>
              )}

              {loadingDocs ? (
                <div className="text-center py-16">
                  <span className="w-6 h-6 border-2 border-slate-700 border-t-slate-300 rounded-full animate-spin inline-block" />
                </div>
              ) : docTypesWithFiles.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Nenhum arquivo disponibilizado para esta empresa ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {docTypesWithFiles.map((type) => {
                    const typeFiles = arquivos.filter((f) => f.tipo_id === type.id);
                    return (
                      <div key={type.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {type.nome}
                        </span>
                        <h4 className="text-white font-semibold text-sm mt-2.5">{type.descricao || "Documentação"}</h4>
                        <div className="mt-3 space-y-1.5">
                          {typeFiles.map((f) => (
                            <a
                              key={f.id}
                              href={f.arquivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-2 text-xs text-slate-300 hover:text-blue-400 px-2 py-1.5 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-800/60 transition-all"
                            >
                              <span className="truncate">{f.arquivo_nome}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
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
    </div>
  );
}
