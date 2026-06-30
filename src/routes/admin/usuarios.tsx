import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  type UsuarioSistema,
  obterUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
} from "@/lib/usuarios";
import {
  type Empresa,
  type DocumentoTipo,
  type DocumentoArquivo,
  obterEmpresas,
  criarEmpresa,
  excluirEmpresa,
  obterDocumentosTipo,
  criarDocumentoTipo,
  excluirDocumentoTipo,
  obterArquivos,
  uploadArquivo,
  excluirArquivo,
} from "@/lib/empresas";
import { ModuleBadge } from "@/components/ModuleBadge";
import {
  Users,
  Check,
  X,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldX,
  Plus,
  Key,
  ToggleLeft,
  ToggleRight,
  Upload,
  Building,
  FileSpreadsheet,
  FileText,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Painel Administrativo" }] }),
  component: AdminUsuariosPage,
});

function cleanCnpj(val: string) {
  return val.replace(/\D/g, "");
}

function formatCnpj(val: string) {
  const clean = cleanCnpj(val);
  if (clean.length !== 14) return val;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function AdminUsuariosPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"users" | "import" | "companies" | "doctypes">("users");

  // General state
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [docTipos, setDocTipos] = useState<DocumentoTipo[]>([]);
  const [arquivos, setArquivos] = useState<DocumentoArquivo[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Forms states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<UsuarioSistema | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    cnpj: "",
    empresa_id: "",
    modulos: [] as string[],
    active: true,
  });
  
  const [editPassword, setEditPassword] = useState("");

  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ cnpj: "", nome: "" });

  const [showCreateDocType, setShowCreateDocType] = useState(false);
  const [newDocType, setNewDocType] = useState({ nome: "", descricao: "" });

  // Company management view states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");

  // Import states
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Load all system data
  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [u, emp, dt, arr] = await Promise.all([
        obterUsuarios(),
        obterEmpresas(),
        obterDocumentosTipo(),
        obterArquivos(),
      ]);
      setUsuarios(u);
      setEmpresas(emp);
      setDocTipos(dt);
      setArquivos(arr);
    } catch {
      setFeedback({ type: "error", msg: "Erro ao sincronizar dados com o banco." });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
      else loadAllData();
    }
  }, [isAuthenticated, isAdmin, loading, navigate, loadAllData]);

  const showToast = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username) return showToast("error", "Nome de usuário é obrigatório.");
    if (!newUser.password) return showToast("error", "Senha inicial é obrigatória.");

    setActionLoading("create-user");
    try {
      await criarUsuario({
        username: newUser.username,
        password: newUser.password,
        role: "user",
        status: "approved",
        cnpj: cleanCnpj(newUser.cnpj),
        empresa_id: newUser.empresa_id || null,
        modulos: newUser.modulos,
        active: newUser.active,
      });
      showToast("success", `Usuário "${newUser.username}" criado com sucesso.`);
      setShowCreateUser(false);
      setNewUser({ username: "", password: "", cnpj: "", empresa_id: "", modulos: [], active: true });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao criar usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async (userObj: UsuarioSistema) => {
    setActionLoading(userObj.id);
    try {
      const updates: any = {
        cnpj: userObj.cnpj ? cleanCnpj(userObj.cnpj) : null,
        empresa_id: userObj.empresa_id || null,
        modulos: userObj.modulos || [],
        active: userObj.active,
        status: userObj.status,
      };
      if (editPassword) {
        updates.password = editPassword;
      }
      await atualizarUsuario(userObj.id, updates);
      showToast("success", `Usuário "${userObj.username}" atualizado.`);
      setShowEditUser(null);
      setEditPassword("");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao atualizar usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o usuário "${name}"?`)) return;
    setActionLoading(id);
    try {
      await excluirUsuario(id);
      showToast("success", `Usuário "${name}" excluído.`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao excluir usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  // Company Actions
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.cnpj || !newCompany.nome) return showToast("error", "CNPJ e Nome são obrigatórios.");
    setActionLoading("create-company");
    try {
      await criarEmpresa(newCompany.cnpj, newCompany.nome);
      showToast("success", "Empresa cadastrada com sucesso.");
      setShowCreateCompany(false);
      setNewCompany({ cnpj: "", nome: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao criar empresa.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a empresa "${name}"? Isso removerá todos os seus arquivos anexados.`)) return;
    setActionLoading(id);
    try {
      await excluirEmpresa(id);
      showToast("success", "Empresa excluída.");
      if (selectedCompanyId === id) setSelectedCompanyId(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao excluir empresa.");
    } finally {
      setActionLoading(null);
    }
  };

  // Document Type Actions
  const handleCreateDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocType.nome) return showToast("error", "Nome é obrigatório.");
    setActionLoading("create-doctype");
    try {
      await criarDocumentoTipo(newDocType.nome, newDocType.descricao);
      showToast("success", "Tipo de documento criado.");
      setShowCreateDocType(false);
      setNewDocType({ nome: "", descricao: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao criar tipo de documento.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDocType = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o tipo de documento "${name}"?`)) return;
    setActionLoading(id);
    try {
      await excluirDocumentoTipo(id);
      showToast("success", "Tipo de documento excluído.");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao excluir tipo de documento.");
    } finally {
      setActionLoading(null);
    }
  };

  // File Upload Actions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0 || !selectedCompanyId || !selectedDocTypeId) return;
    setUploadLoading(true);
    try {
      await uploadArquivo(selectedCompanyId, selectedDocTypeId, filesList[0]);
      showToast("success", `Arquivo "${filesList[0].name}" enviado com sucesso.`);
      setSelectedDocTypeId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao enviar arquivo.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteFile = async (id: string, filename: string) => {
    if (!confirm(`Deseja excluir o arquivo "${filename}"?`)) return;
    setActionLoading(id);
    try {
      await excluirArquivo(id);
      showToast("success", "Arquivo removido.");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao excluir arquivo.");
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Excel Import Actions
  const handleExcelImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];
        
        if (rows.length === 0) {
          showToast("error", "A planilha está vazia.");
          return;
        }

        // Validate structure (must have CNPJ, Nome, Senha)
        const first = rows[0];
        const hasCnpj = Object.keys(first).some(k => k.toLowerCase() === "cnpj");
        const hasNome = Object.keys(first).some(k => k.toLowerCase() === "nome");
        const hasSenha = Object.keys(first).some(k => k.toLowerCase() === "senha");

        if (!hasCnpj || !hasNome || !hasSenha) {
          showToast("error", "Planilha inválida. As colunas obrigatórias são: CNPJ, Nome, Senha");
          return;
        }

        setImportRows(rows);
        showToast("success", `${rows.length} registros prontos para importação.`);
      } catch {
        showToast("error", "Erro ao processar planilha Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of importRows) {
      const normalizedRow: any = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.toLowerCase()] = row[k];
      });

      const cnpj = cleanCnpj(String(normalizedRow.cnpj || ""));
      const nome = String(normalizedRow.nome || "").trim();
      const senha = String(normalizedRow.senha || "").trim();
      const rawModulos = String(normalizedRow.modulos || "").toLowerCase();
      
      const modulos = rawModulos
        ? rawModulos.split(",").map(m => m.trim()).filter(Boolean)
        : ["documentos", "gestao"];

      if (cnpj.length < 11 || !nome || !senha) {
        failCount++;
        continue;
      }

      try {
        // Find if company exists for this CNPJ, otherwise create company first
        let companyObj = empresas.find(e => e.cnpj === cnpj);
        if (!companyObj) {
          companyObj = await criarEmpresa(cnpj, nome);
          // Add to local list to prevent repeated creations
          empresas.push(companyObj);
        }

        await criarUsuario({
          username: nome,
          password: senha,
          role: "user",
          status: "approved",
          cnpj,
          empresa_id: companyObj.id,
          modulos,
          active: true,
        });
        successCount++;
      } catch (err) {
        console.error("Failed importing row:", row, err);
        failCount++;
      }
    }

    showToast("success", `Importação finalizada: ${successCount} criados, ${failCount} falhas.`);
    setImportRows([]);
    await loadAllData();
    setImportLoading(false);
  };

  const toggleModuleInNewUser = (module: string) => {
    setNewUser((prev) => {
      const idx = prev.modulos.indexOf(module);
      if (idx !== -1) {
        return { ...prev, modulos: prev.modulos.filter((m) => m !== module) };
      } else {
        return { ...prev, modulos: [...prev.modulos, module] };
      }
    });
  };

  const toggleModuleInEditUser = (module: string) => {
    if (!showEditUser) return;
    const modulos = showEditUser.modulos || [];
    const idx = modulos.indexOf(module);
    let updated;
    if (idx !== -1) {
      updated = modulos.filter((m) => m !== module);
    } else {
      updated = [...modulos, module];
    }
    setShowEditUser({
      ...showEditUser,
      modulos: updated,
    });
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Portal
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Painel Administrativo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white text-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <div>{feedback.msg}</div>
          </div>
        )}

        {/* Custom Tab Selectors */}
        <div className="flex border-b border-slate-800/80 mb-8 gap-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "users"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Gerenciar Lojistas
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "import"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importação em Massa
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "companies"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Building className="w-4 h-4" />
            Empresas & Documentos
          </button>
          <button
            onClick={() => setActiveTab("doctypes")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "doctypes"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Tipos de Documento
          </button>
        </div>

        {/* -------------------- TAB: USERS -------------------- */}
        {activeTab === "users" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Usuários do Sistema</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Cadastre novos lojistas, configure permissões e defina senhas.
                </p>
              </div>
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Novo Usuário
              </button>
            </div>

            {/* Create User Form Box */}
            {showCreateUser && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowCreateUser(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-white mb-4">Adicionar Novo Lojista</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome / Nome de Exibição</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Loja do João"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">CNPJ (Será usado para login)</label>
                    <input
                      type="text"
                      placeholder="Somente números (14 dígitos)"
                      maxLength={18}
                      value={newUser.cnpj}
                      onChange={(e) => setNewUser({ ...newUser, cnpj: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha Inicial</label>
                    <input
                      type="password"
                      required
                      placeholder="Defina a senha do lojista"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Empresa Associada (Opcional)</label>
                    <select
                      value={newUser.empresa_id}
                      onChange={(e) => setNewUser({ ...newUser, empresa_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Nenhuma</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome} ({formatCnpj(emp.cnpj)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-2">Módulos Permitidos</label>
                    <div className="flex flex-wrap gap-4">
                      {["documentos", "gestao", "financeiro", "estoque"].map((mod) => (
                        <label key={mod} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUser.modulos.includes(mod)}
                            onChange={() => toggleModuleInNewUser(mod)}
                            className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 w-4 h-4"
                          />
                          {mod.charAt(0).toUpperCase() + mod.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === "create-user"}
                      className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                    >
                      {actionLoading === "create-user" ? "Criando..." : "Salvar Usuário"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit User Form Box */}
            {showEditUser && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => { setShowEditUser(null); setEditPassword(""); }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Editar Lojista: {showEditUser.username}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">CNPJ</label>
                    <input
                      type="text"
                      placeholder="Somente números (14 dígitos)"
                      maxLength={18}
                      value={showEditUser.cnpj || ""}
                      onChange={(e) => setShowEditUser({ ...showEditUser, cnpj: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Empresa Associada</label>
                    <select
                      value={showEditUser.empresa_id || ""}
                      onChange={(e) => setShowEditUser({ ...showEditUser, empresa_id: e.target.value || null })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Nenhuma</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome} ({formatCnpj(emp.cnpj)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Nova Senha <span className="text-slate-500">(Preencha apenas para alterar)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Defina uma nova senha"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "approved"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "approved" })}
                          className="text-blue-500 focus:ring-0"
                        />
                        Aprovado
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "pending"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "pending" })}
                          className="text-blue-500 focus:ring-0"
                        />
                        Pendente
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "rejected"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "rejected" })}
                          className="text-blue-500 focus:ring-0"
                        />
                        Rejeitado
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Disponibilidade da Conta</label>
                    <button
                      type="button"
                      onClick={() => setShowEditUser({ ...showEditUser, active: !showEditUser.active })}
                      className="flex items-center gap-2 text-sm text-slate-300 hover:text-white mt-2 transition-all"
                    >
                      {showEditUser.active ? (
                        <ToggleRight className="w-9 h-6 text-blue-500" />
                      ) : (
                        <ToggleLeft className="w-9 h-6 text-slate-600" />
                      )}
                      {showEditUser.active ? "Conta Ativa" : "Conta Inativa"}
                    </button>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-2">Módulos Permitidos</label>
                    <div className="flex flex-wrap gap-4">
                      {["documentos", "gestao", "financeiro", "estoque"].map((mod) => (
                        <label key={mod} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(showEditUser.modulos || []).includes(mod)}
                            onChange={() => toggleModuleInEditUser(mod)}
                            className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 w-4 h-4"
                          />
                          {mod.charAt(0).toUpperCase() + mod.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => { setShowEditUser(null); setEditPassword(""); }}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(showEditUser)}
                      disabled={actionLoading === showEditUser.id}
                      className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/10"
                    >
                      {actionLoading === showEditUser.id ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                    <th className="px-6 py-4">Lojista / CNPJ</th>
                    <th className="px-6 py-4 hidden md:table-cell">Empresa Associada</th>
                    <th className="px-6 py-4">Módulos</th>
                    <th className="px-6 py-4 text-center">Acesso</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-all ${
                        !u.active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {u.username}
                            {u.role === "admin" && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {u.cnpj ? formatCnpj(u.cnpj) : "Nenhum CNPJ informado"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {u.empresa_id ? (
                          <div className="text-slate-300">
                            {empresas.find((e) => e.id === u.empresa_id)?.nome || "Carregando..."}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.modulos && u.modulos.length > 0 ? (
                            u.modulos.map((m) => <ModuleBadge key={m} moduleKey={m} />)
                          ) : (
                            <span className="text-xs text-slate-600">Nenhum</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.active
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                          }`}
                        >
                          {u.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShowEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar usuário"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        Nenhum usuário lojista cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* -------------------- TAB: IMPORT -------------------- */}
        {activeTab === "import" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Importação em Massa</h2>
              <p className="text-sm text-slate-400 mt-1">
                Suba um arquivo Excel (.xlsx) para cadastrar lojistas e criar suas empresas em segundos.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Selecione sua planilha Excel</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Certifique-se de que a planilha contenha as colunas: <strong className="text-slate-200">CNPJ</strong>, <strong className="text-slate-200">Nome</strong>, <strong className="text-slate-200">Senha</strong> e a coluna opcional <strong className="text-slate-200">Modulos</strong> (separados por vírgula).
              </p>

              <div className="flex flex-col items-center gap-4">
                <label className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/20">
                  <Plus className="w-4 h-4 inline-block mr-2" />
                  Procurar Arquivo
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Import instructions preview */}
              <div className="mt-8 pt-6 border-t border-slate-800 text-left">
                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">Exemplo de Formato da Planilha:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-400 border border-slate-800 rounded-lg">
                    <thead>
                      <tr className="bg-slate-950 text-slate-300">
                        <th className="px-3 py-1.5 border border-slate-800">CNPJ</th>
                        <th className="px-3 py-1.5 border border-slate-800">Nome</th>
                        <th className="px-3 py-1.5 border border-slate-800">Senha</th>
                        <th className="px-3 py-1.5 border border-slate-800">Modulos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-1 border border-slate-800">12345678000199</td>
                        <td className="px-3 py-1 border border-slate-800">Supermercado Silva</td>
                        <td className="px-3 py-1 border border-slate-800">silva123</td>
                        <td className="px-3 py-1 border border-slate-800">documentos,gestao</td>
                      </tr>
                      <tr className="bg-slate-900/30">
                        <td className="px-3 py-1 border border-slate-800">98765432000100</td>
                        <td className="px-3 py-1 border border-slate-800">Padaria Pão de Mel</td>
                        <td className="px-3 py-1 border border-slate-800">temp9876</td>
                        <td className="px-3 py-1 border border-slate-800">documentos</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Imported Rows Preview */}
            {importRows.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl animate-scale-up max-w-4xl mx-auto">
                <h3 className="text-md font-semibold text-white mb-4 flex items-center justify-between">
                  <span>Visualizando Registros da Planilha ({importRows.length})</span>
                  <button
                    onClick={() => setImportRows([])}
                    className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                  >
                    Limpar
                  </button>
                </h3>
                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl mb-6">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
                        <th className="px-4 py-2">CNPJ</th>
                        <th className="px-4 py-2">Nome</th>
                        <th className="px-4 py-2">Senha</th>
                        <th className="px-4 py-2">Módulos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-800/40">
                          <td className="px-4 py-2 text-slate-300 font-mono">
                            {r.CNPJ || r.cnpj || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-300">
                            {r.Nome || r.nome || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-300 font-mono">
                            {r.Senha || r.senha || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-300">
                            {r.Modulos || r.modulos || "documentos,gestao"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setImportRows([])}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleProcessImport}
                    disabled={importLoading}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Iniciar Importação"
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* -------------------- TAB: COMPANIES -------------------- */}
        {activeTab === "companies" && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Companies List */}
            <div className="space-y-6 lg:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Empresas</h2>
                <button
                  onClick={() => setShowCreateCompany(true)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/50 px-3 py-1.5 rounded-lg font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Add Company Form */}
              {showCreateCompany && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-scale-up">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-white">Nova Empresa</h3>
                    <button onClick={() => setShowCreateCompany(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateCompany} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Razão Social / Nome Fantasia"
                        required
                        value={newCompany.nome}
                        onChange={(e) => setNewCompany({ ...newCompany, nome: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CNPJ (14 dígitos)"
                        required
                        value={newCompany.cnpj}
                        onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateCompany(false)}
                        className="px-3 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Cadastrar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Companies Cards List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {empresas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      selectedCompanyId === c.id
                        ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5 text-white"
                        : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/30 text-slate-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.nome}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{formatCnpj(c.cnpj)}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full">
                        {arquivos.filter((f) => f.empresa_id === c.id).length} files
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(c.id, c.nome);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
                {empresas.length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-sm">
                    Nenhuma empresa cadastrada.
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Documents inside Selected Company */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCompanyId ? (
                (() => {
                  const company = empresas.find((e) => e.id === selectedCompanyId);
                  const companyFiles = arquivos.filter((f) => f.empresa_id === selectedCompanyId);
                  return (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-6 animate-fade-in">
                      {/* Top Header */}
                      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{company?.nome}</h3>
                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            CNPJ: {company ? formatCnpj(company.cnpj) : ""}
                          </p>
                        </div>
                        <span className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full font-medium">
                          {companyFiles.length} Documentos Anexados
                        </span>
                      </div>

                      {/* Upload Box */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Upload className="w-4 h-4 text-blue-400" />
                          Anexar Novo Arquivo
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-400 mb-1">
                              Tipo do Documento
                            </label>
                            <select
                              value={selectedDocTypeId}
                              onChange={(e) => setSelectedDocTypeId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                            >
                              <option value="">Selecione o Tipo...</option>
                              {docTipos.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label
                              className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-all text-xs font-semibold text-slate-300 ${
                                !selectedDocTypeId || uploadLoading
                                  ? "opacity-50 cursor-not-allowed bg-slate-950"
                                  : "bg-slate-900 hover:bg-slate-800"
                              }`}
                            >
                              {uploadLoading ? (
                                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              {uploadLoading ? "Enviando..." : "Selecionar e Upload"}
                              <input
                                ref={fileInputRef}
                                type="file"
                                disabled={!selectedDocTypeId || uploadLoading}
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Attached Documents List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white">Documentos Disponibilizados</h4>
                        <div className="space-y-2">
                          {companyFiles.map((file) => {
                            const typeObj = docTipos.find((t) => t.id === file.tipo_id);
                            return (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/60 transition-all flex-wrap sm:flex-nowrap gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-slate-200 text-xs font-semibold uppercase tracking-wide">
                                      {typeObj?.nome || "Tipo Desconhecido"}
                                    </div>
                                    <div className="text-slate-400 text-xs truncate mt-0.5">
                                      {file.arquivo_nome}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                  <a
                                    href={file.arquivo_url}
                                    download={file.arquivo_nome}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Visualizar/Baixar"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFile(file.id, file.arquivo_nome)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Remover documento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {companyFiles.length === 0 && (
                            <div className="text-center py-10 text-slate-600 text-xs bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                              Nenhum arquivo anexado a esta empresa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-96 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <Building className="w-10 h-10 text-slate-700 mb-3" />
                  Selecione uma empresa na lista ao lado para gerenciar seus documentos.
                </div>
              )}
            </div>
          </section>
        )}

        {/* -------------------- TAB: DOCTYPES -------------------- */}
        {activeTab === "doctypes" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Tipos de Documento</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Defina os tipos de documentos que a sua equipe jurídica e administrativa solicita.
                </p>
              </div>
              <button
                onClick={() => setShowCreateDocType(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Novo Tipo
              </button>
            </div>

            {/* Create DocType Form */}
            {showCreateDocType && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl max-w-xl mx-auto animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowCreateDocType(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-md font-semibold text-white mb-4">Novo Tipo de Documento</h3>
                <form onSubmit={handleCreateDocType} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do Tipo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CERTIDÃO NEGATIVA SIMPLIFICADA"
                      value={newDocType.nome}
                      onChange={(e) => setNewDocType({ ...newDocType, nome: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição / Observações</label>
                    <textarea
                      placeholder="Breve descrição do documento..."
                      value={newDocType.descricao}
                      onChange={(e) => setNewDocType({ ...newDocType, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateDocType(false)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all"
                    >
                      Criar Tipo
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DocTypes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docTipos.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Documento
                      </div>
                      <button
                        onClick={() => handleDeleteDocType(t.id, t.nome)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                        title="Excluir tipo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-white font-semibold text-sm truncate uppercase">{t.nome}</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {t.descricao || "Sem descrição informada."}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-4 border-t border-slate-850 pt-3">
                    ID: {t.id}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
