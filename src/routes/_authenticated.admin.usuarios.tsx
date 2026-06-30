import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  type UsuarioSistema,
  obterUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  type TipoUsuarioConfig,
  obterTiposUsuarioConfig,
  criarTipoUsuarioConfig,
  atualizarTipoUsuarioConfig,
  excluirTipoUsuarioConfig,
} from "@/lib/usuarios";
import {
  type Empresa,
  type DocumentoTipo,
  type DocumentoArquivo,
  obterEmpresas,
  criarEmpresa,
  atualizarEmpresa,
  excluirEmpresa,
  obterDocumentosTipo,
  criarDocumentoTipo,
  atualizarDocumentoTipo,
  excluirDocumentoTipo,
  obterArquivos,
  uploadArquivo,
  excluirArquivo,
} from "@/lib/empresas";
import { Search, Edit3 } from "lucide-react";
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
  Settings,
  Shield,
} from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Painel Administrativo" }] }),
  component: AdminUsuariosPage,
});

function formatCnpj(val: string) {
  // Display CNPJ as-is (no formatting/validation).
  return val;
}

export function AdminUsuariosPage() {
  const { user: currentUser, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"users" | "import" | "companies" | "doctypes" | "usertypes">("users");

  // General state
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [docTipos, setDocTipos] = useState<DocumentoTipo[]>([]);
  const [arquivos, setArquivos] = useState<DocumentoArquivo[]>([]);
  const [userTypes, setUserTypes] = useState<TipoUsuarioConfig[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Forms states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<UsuarioSistema | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    tipo_usuario: "Lojista",
    pode_criar_admin: false,
    modulos: [] as string[],
    active: true,
    campos_customizados: {} as Record<string, any>,
  });
  
  const [editPassword, setEditPassword] = useState("");

  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ cnpj: "", nome: "" });

  const [showCreateDocType, setShowCreateDocType] = useState(false);
  const [newDocType, setNewDocType] = useState({ nome: "", descricao: "" });

  // User Types form state
  const [showCreateUserType, setShowCreateUserType] = useState(false);
  const [newUserType, setNewUserType] = useState({
    nome: "",
    role: "user" as "admin" | "user",
    campos_schema: [] as { nome: string; label: string; tipo: "text" | "number" | "boolean"; obrigatorio: boolean }[],
  });
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "boolean">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Company management view states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");

  // Import states
  const [selectedUserTypeImportId, setSelectedUserTypeImportId] = useState("Lojista");
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Search state for users
  const [userSearch, setUserSearch] = useState("");

  // Edit modal states
  const [editingCompany, setEditingCompany] = useState<Empresa | null>(null);
  const [editingDocType, setEditingDocType] = useState<DocumentoTipo | null>(null);
  const [editingUserType, setEditingUserType] = useState<TipoUsuarioConfig | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldType, setEditFieldType] = useState<"text" | "number" | "boolean">("text");
  const [editFieldRequired, setEditFieldRequired] = useState(false);

  // Load all system data
  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [u, emp, dt, arr, ut] = await Promise.all([
        obterUsuarios(),
        obterEmpresas(),
        obterDocumentosTipo(),
        obterArquivos(),
        obterTiposUsuarioConfig(),
      ]);
      setUsuarios(u);
      setEmpresas(emp);
      setDocTipos(dt);
      setArquivos(arr);
      setUserTypes(ut);
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
    if (!newUser.username) return showToast("error", "Login de acesso é obrigatório.");
    if (!newUser.password) return showToast("error", "Senha inicial é obrigatória.");

    // Dynamic field validation
    const selectedType = userTypes.find((t) => t.nome === newUser.tipo_usuario);
    if (selectedType) {
      // Security Check: if this type is admin but currentUser has no pode_criar_admin permissions (and isn't root)
      const isRoot = currentUser?.username === "root";
      const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
      if (selectedType.role === "admin" && !canCreateAdmin) {
        return showToast("error", "Você não tem permissão para cadastrar usuários do tipo Administrador.");
      }

      for (const field of selectedType.campos_schema) {
        if (field.obrigatorio && !newUser.campos_customizados[field.nome]) {
          return showToast("error", `O campo "${field.label}" é obrigatório.`);
        }
      }
    }

    setActionLoading("create-user");
    try {
      await criarUsuario({
        username: newUser.username,
        password: newUser.password,
        role: selectedType?.role || "user",
        status: "approved",
        cnpj: newUser.campos_customizados.cnpj ? ((v: string) => v.trim())(newUser.campos_customizados.cnpj) : null,
        empresa_id: null,
        modulos: newUser.modulos,
        active: newUser.active,
        tipo_usuario: newUser.tipo_usuario,
        pode_criar_admin: newUser.pode_criar_admin,
        campos_customizados: newUser.campos_customizados,
      });
      showToast("success", `Usuário "${newUser.username}" criado com sucesso.`);
      setShowCreateUser(false);
      setNewUser({ username: "", password: "", tipo_usuario: "Lojista", pode_criar_admin: false, modulos: [], active: true, campos_customizados: {} });
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
      const selectedType = userTypes.find((t) => t.nome === userObj.tipo_usuario);
      
      // Security Check: if changing/saving type admin but has no permissions
      const isRoot = currentUser?.username === "root";
      const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
      if (selectedType?.role === "admin" && !canCreateAdmin) {
        return showToast("error", "Você não tem permissão para cadastrar ou editar usuários Administradores.");
      }

      // Dynamic field validation
      if (selectedType) {
        for (const field of selectedType.campos_schema) {
          if (field.obrigatorio && !userObj.campos_customizados?.[field.nome]) {
            return showToast("error", `O campo "${field.label}" é obrigatório.`);
          }
        }
      }

      const updates: any = {
        role: selectedType?.role || "user",
        cnpj: userObj.campos_customizados?.cnpj ? ((v: string) => v.trim())(userObj.campos_customizados.cnpj) : null,
        empresa_id: null,
        modulos: userObj.modulos || [],
        active: userObj.active,
        status: userObj.status,
        tipo_usuario: userObj.tipo_usuario,
        pode_criar_admin: userObj.pode_criar_admin || false,
        campos_customizados: userObj.campos_customizados || {},
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

  // User Type Config Actions
  const handleCreateUserType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserType.nome) return showToast("error", "Nome do tipo é obrigatório.");
    setActionLoading("create-usertype");
    try {
      await criarTipoUsuarioConfig({
        nome: newUserType.nome,
        role: newUserType.role,
        campos_schema: newUserType.campos_schema,
      });
      showToast("success", `Tipo de usuário "${newUserType.nome}" criado.`);
      setShowCreateUserType(false);
      setNewUserType({ nome: "", role: "user", campos_schema: [] });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao criar tipo de usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUserType = async (id: string, name: string) => {
    if (["Administrador", "Lojista", "ADM de loja"].includes(name)) {
      return showToast("error", "Não é permitido excluir os tipos de usuário padrão.");
    }
    if (!confirm(`Deseja realmente excluir o tipo de usuário "${name}"?`)) return;
    setActionLoading(id);
    try {
      await excluirTipoUsuarioConfig(id);
      showToast("success", `Tipo de usuário "${name}" excluído.`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao excluir tipo de usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddFieldToNewType = () => {
    if (!newFieldName || !newFieldLabel) return showToast("error", "Nome do campo e Rótulo são obrigatórios.");
    const fieldNameClean = newFieldName.toLowerCase().replace(/\s+/g, "_").replace(/\W/g, "");
    
    if (newUserType.campos_schema.some(f => f.nome === fieldNameClean)) {
      return showToast("error", "Já existe um campo com este nome técnico.");
    }

    setNewUserType(prev => ({
      ...prev,
      campos_schema: [
        ...prev.campos_schema,
        {
          nome: fieldNameClean,
          label: newFieldLabel,
          tipo: newFieldType,
          obrigatorio: newFieldRequired,
        }
      ]
    }));

    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
  };

  const handleRemoveFieldFromNewType = (index: number) => {
    setNewUserType(prev => ({
      ...prev,
      campos_schema: prev.campos_schema.filter((_, i) => i !== index)
    }));
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

  const handleEditCompany = (c: Empresa) => {
    setEditingCompany({ ...c });
  };

  const handleSaveEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setActionLoading(editingCompany.id);
    try {
      await atualizarEmpresa(editingCompany.id, {
        nome: editingCompany.nome.trim(),
        cnpj: editingCompany.cnpj.trim(),
        ativo: editingCompany.ativo,
      });
      showToast("success", "Empresa atualizada.");
      setEditingCompany(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao atualizar empresa.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditDocType = (t: DocumentoTipo) => {
    setEditingDocType({ ...t });
  };

  const handleSaveEditDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocType) return;
    setActionLoading(editingDocType.id);
    try {
      await atualizarDocumentoTipo(editingDocType.id, {
        nome: editingDocType.nome.trim(),
        descricao: (editingDocType.descricao ?? "").trim(),
        ativo: editingDocType.ativo,
      });
      showToast("success", "Tipo de documento atualizado.");
      setEditingDocType(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao atualizar tipo de documento.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUserType = (t: TipoUsuarioConfig) => {
    setEditingUserType({ ...t, campos_schema: [...(t.campos_schema || [])] });
    setEditFieldName("");
    setEditFieldLabel("");
    setEditFieldType("text");
    setEditFieldRequired(false);
  };

  const handleAddFieldToEditType = () => {
    if (!editingUserType) return;
    if (!editFieldName.trim() || !editFieldLabel.trim()) {
      showToast("error", "Identificador e rótulo são obrigatórios.");
      return;
    }
    setEditingUserType({
      ...editingUserType,
      campos_schema: [
        ...editingUserType.campos_schema,
        {
          nome: editFieldName.trim(),
          label: editFieldLabel.trim(),
          tipo: editFieldType,
          obrigatorio: editFieldRequired,
        },
      ],
    });
    setEditFieldName("");
    setEditFieldLabel("");
    setEditFieldType("text");
    setEditFieldRequired(false);
  };

  const handleRemoveFieldFromEditType = (idx: number) => {
    if (!editingUserType) return;
    setEditingUserType({
      ...editingUserType,
      campos_schema: editingUserType.campos_schema.filter((_, i) => i !== idx),
    });
  };

  const handleSaveEditUserType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserType) return;
    setActionLoading(editingUserType.id);
    try {
      await atualizarTipoUsuarioConfig(editingUserType.id, {
        nome: editingUserType.nome.trim(),
        role: editingUserType.role,
        campos_schema: editingUserType.campos_schema,
        ativo: editingUserType.ativo,
      });
      showToast("success", "Perfil atualizado.");
      setEditingUserType(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao atualizar perfil.");
    } finally {
      setActionLoading(null);
    }
  };


  const handleToggleUserTypeAtivo = async (t: TipoUsuarioConfig) => {
    setActionLoading(t.id);
    try {
      await atualizarTipoUsuarioConfig(t.id, { ativo: !(t.ativo ?? true) });
      showToast("success", `Perfil ${t.ativo === false ? "ativado" : "inativado"}.`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao alterar status do perfil.");
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

    const selectedType = userTypes.find((t) => t.nome === selectedUserTypeImportId);
    if (!selectedType) {
      showToast("error", "Selecione um tipo de usuário válido primeiro.");
      return;
    }

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

        // Validate structure (must have "Login de acesso" or "Username" and "Senha" or "Password")
        const first = rows[0];
        const keys = Object.keys(first);
        
        const hasLogin = keys.some(k => ["login de acesso", "login", "username", "usuario"].includes(k.toLowerCase().trim()));
        const hasSenha = keys.some(k => ["senha", "password", "key"].includes(k.toLowerCase().trim()));

        if (!hasLogin || !hasSenha) {
          showToast("error", 'Planilha inválida. As colunas obrigatórias são: "Login de acesso" e "Senha"');
          return;
        }

        // Validate required custom fields for the selected user type
        const missingFields: string[] = [];
        selectedType.campos_schema.forEach((field) => {
          if (field.obrigatorio) {
            const hasField = keys.some(k => 
              k.toLowerCase().trim() === field.label.toLowerCase().trim() || 
              k.toLowerCase().trim() === field.nome.toLowerCase().trim()
            );
            if (!hasField) {
              missingFields.push(field.label);
            }
          }
        });

        if (missingFields.length > 0) {
          showToast("error", `Planilha inválida. Faltam as seguintes colunas obrigatórias para o tipo ${selectedType.nome}: ${missingFields.join(", ")}`);
          return;
        }

        setImportRows(rows);
        showToast("success", `${rows.length} registros do tipo "${selectedType.nome}" prontos para importação.`);
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

    const selectedType = userTypes.find((t) => t.nome === selectedUserTypeImportId);
    if (!selectedType) {
      showToast("error", "Erro ao recuperar as configurações do tipo de usuário.");
      setImportLoading(false);
      return;
    }

    for (const row of importRows) {
      // Find Login de acesso (username)
      const usernameKey = Object.keys(row).find(k => ["login de acesso", "login", "username", "usuario"].includes(k.toLowerCase().trim()));
      // Find password
      const passwordKey = Object.keys(row).find(k => ["senha", "password", "key"].includes(k.toLowerCase().trim()));

      const username = usernameKey ? String(row[usernameKey]).trim() : "";
      const password = passwordKey ? String(row[passwordKey]).trim() : "";

      if (!username || !password) {
        failCount++;
        continue;
      }

      // Map dynamic fields from row columns
      const campos_customizados: Record<string, any> = {};
      selectedType.campos_schema.forEach((field) => {
        const colKey = Object.keys(row).find(k => 
          k.toLowerCase().trim() === field.label.toLowerCase().trim() || 
          k.toLowerCase().trim() === field.nome.toLowerCase().trim()
        );
        
        if (colKey !== undefined) {
          const val = row[colKey];
          if (field.tipo === "number") {
            campos_customizados[field.nome] = Number(val);
          } else if (field.tipo === "boolean") {
            campos_customizados[field.nome] = String(val).toLowerCase() === "true" || val === true || String(val).toLowerCase() === "sim";
          } else {
            campos_customizados[field.nome] = String(val).trim();
          }
        }
      });

      // Special action: if CNPJ is a field, create/find the company automatically
      const cnpj = campos_customizados.cnpj ? ((v: string) => v.trim())(String(campos_customizados.cnpj)) : "";
      
      try {
        if (cnpj) {
          let companyObj = empresas.find(e => ((v: string) => v.trim())(e.cnpj) === ((v: string) => v.trim())(cnpj));
          if (!companyObj) {
            // Find a name for the company or use username
            const razaoSocialKey = Object.keys(row).find(k => ["razão social", "razao social", "empresa", "nome da empresa"].includes(k.toLowerCase().trim()));
            const companyName = razaoSocialKey ? String(row[razaoSocialKey]).trim() : `Empresa de ${username}`;
            companyObj = await criarEmpresa(cnpj, companyName);
            empresas.push(companyObj);
          }
        }

        await criarUsuario({
          username,
          password,
          role: selectedType.role,
          status: "approved",
          cnpj: cnpj || null,
          empresa_id: null,
          modulos: ["gestao", "documentos"], // default active modules
          active: true,
          tipo_usuario: selectedType.nome,
          pode_criar_admin: false,
          campos_customizados,
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
      <div className="min-h-screen bg-card flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header */}
      <header className="border-b border-border bg-card backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Portal
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Painel Administrativo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-muted border border-border text-foreground hover:text-foreground text-sm transition-all"
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
        <div className="flex border-b border-border mb-8 gap-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "users"
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "companies"
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Building className="w-4 h-4" />
            Empresas & Documentos
          </button>
          <button
            onClick={() => setActiveTab("doctypes")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "doctypes"
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Tipos de Documento
          </button>
          <button
            onClick={() => setActiveTab("usertypes")}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === "usertypes"
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuração de Perfis
          </button>
        </div>

        {/* -------------------- TAB: USERS -------------------- */}
        {activeTab === "users" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Usuários do Sistema</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Cadastre novos lojistas, configure permissões e defina senhas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("import")}
                  className="flex items-center gap-2 bg-muted/70 hover:bg-muted text-foreground border border-border px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Importação em Massa
                </button>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" /> Novo Usuário
                </button>
              </div>
            </div>

            {/* Create User Form Box */}
            {showCreateUser && (
              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowCreateUser(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Adicionar Novo Usuário</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Login de acesso</label>
                    <input
                      type="text"
                      required
                      placeholder="Identificador do usuário para login"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Senha Inicial</label>
                    <input
                      type="password"
                      required
                      placeholder="Defina a senha inicial"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Tipo de Usuário</label>
                    <select
                      value={newUser.tipo_usuario}
                      onChange={(e) => {
                        const selectedType = userTypes.find((t) => t.nome === e.target.value);
                        setNewUser({
                          ...newUser,
                          tipo_usuario: e.target.value,
                          pode_criar_admin: false,
                          campos_customizados: {},
                        });
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    >
                      {userTypes.map((t) => {
                        // Security check: only users with pode_criar_admin (or root) can choose admin user types
                        const isRoot = currentUser?.username === "root";
                        const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
                        if (t.role === "admin" && !canCreateAdmin) return null;
                        return (
                          <option key={t.id} value={t.nome}>
                            {t.nome}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Render Dynamic Fields */}
                  {(() => {
                    const selectedType = userTypes.find((t) => t.nome === newUser.tipo_usuario);
                    return selectedType?.campos_schema.map((field) => (
                      <div key={field.nome}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">
                          {field.label} {field.obrigatorio && <span className="text-red-400">*</span>}
                        </label>
                        {field.tipo === "boolean" ? (
                          <select
                            value={newUser.campos_customizados[field.nome] ? "true" : "false"}
                            onChange={(e) => setNewUser({
                              ...newUser,
                              campos_customizados: {
                                ...newUser.campos_customizados,
                                [field.nome]: e.target.value === "true",
                              }
                            })}
                            className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                          >
                            <option value="false">Não</option>
                            <option value="true">Sim</option>
                          </select>
                        ) : (
                          <input
                            type={field.tipo === "number" ? "number" : "text"}
                            required={field.obrigatorio}
                            placeholder={`Preencha o campo ${field.label}`}
                            value={newUser.campos_customizados[field.nome] || ""}
                            onChange={(e) => setNewUser({
                              ...newUser,
                              campos_customizados: {
                                ...newUser.campos_customizados,
                                [field.nome]: field.tipo === "number" ? Number(e.target.value) : e.target.value,
                              }
                            })}
                            className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                          />
                        )}
                      </div>
                    ));
                  })()}

                  {/* pode_criar_admin Flag check */}
                  {(() => {
                    const selectedType = userTypes.find((t) => t.nome === newUser.tipo_usuario);
                    const isRoot = currentUser?.username === "root";
                    const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
                    
                    if (selectedType?.role === "admin" && canCreateAdmin) {
                      return (
                        <div className="flex items-center gap-2 md:col-span-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setNewUser({ ...newUser, pode_criar_admin: !newUser.pode_criar_admin })}
                            className="flex items-center gap-2 text-xs text-foreground hover:text-foreground transition-all"
                          >
                            {newUser.pode_criar_admin ? (
                              <ToggleRight className="w-8 h-5 text-primary" />
                            ) : (
                              <ToggleLeft className="w-8 h-5 text-muted-foreground" />
                            )}
                            Permitir que este administrador cadastre outros administradores
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-2 font-semibold">Módulos Permitidos</label>
                    <div className="flex flex-wrap gap-4">
                      {["documentos", "gestao"].map((mod) => (
                        <label key={mod} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUser.modulos.includes(mod)}
                            onChange={() => toggleModuleInNewUser(mod)}
                            className="rounded border-border bg-background text-primary focus:ring-0 w-4 h-4"
                          />
                          {mod === "gestao" ? "Gestão de Projetos" : "Documentos"}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === "create-user"}
                      className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md disabled:opacity-50"
                    >
                      {actionLoading === "create-user" ? "Criando..." : "Salvar Usuário"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit User Form Box */}
            {showEditUser && (
              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => { setShowEditUser(null); setEditPassword(""); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Editar Usuário: {showEditUser.username}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Login de acesso</label>
                    <input
                      type="text"
                      disabled
                      value={showEditUser.username}
                      className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border text-muted-foreground cursor-not-allowed text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">
                      Alterar Senha <span className="text-muted-foreground">(Opcional)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Preencha apenas para alterar"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Tipo de Usuário</label>
                    <select
                      value={showEditUser.tipo_usuario || "Lojista"}
                      onChange={(e) => {
                        const selectedType = userTypes.find((t) => t.nome === e.target.value);
                        setShowEditUser({
                          ...showEditUser,
                          tipo_usuario: e.target.value,
                          role: selectedType?.role || "user",
                          pode_criar_admin: false,
                          campos_customizados: {},
                        });
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    >
                      {userTypes.map((t) => {
                        const isRoot = currentUser?.username === "root";
                        const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
                        if (t.role === "admin" && !canCreateAdmin) return null;
                        return (
                          <option key={t.id} value={t.nome}>
                            {t.nome}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Render Dynamic Fields for Edit */}
                  {(() => {
                    const selectedType = userTypes.find((t) => t.nome === (showEditUser.tipo_usuario || "Lojista"));
                    const customFields = showEditUser.campos_customizados || {};
                    return selectedType?.campos_schema.map((field) => (
                      <div key={field.nome}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">
                          {field.label} {field.obrigatorio && <span className="text-red-400">*</span>}
                        </label>
                        {field.tipo === "boolean" ? (
                          <select
                            value={customFields[field.nome] ? "true" : "false"}
                            onChange={(e) => setShowEditUser({
                              ...showEditUser,
                              campos_customizados: {
                                ...customFields,
                                [field.nome]: e.target.value === "true",
                              }
                            })}
                            className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                          >
                            <option value="false">Não</option>
                            <option value="true">Sim</option>
                          </select>
                        ) : (
                          <input
                            type={field.tipo === "number" ? "number" : "text"}
                            required={field.obrigatorio}
                            placeholder={`Preencha o campo ${field.label}`}
                            value={customFields[field.nome] || ""}
                            onChange={(e) => setShowEditUser({
                              ...showEditUser,
                              campos_customizados: {
                                ...customFields,
                                [field.nome]: field.tipo === "number" ? Number(e.target.value) : e.target.value,
                              }
                            })}
                            className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                          />
                        )}
                      </div>
                    ));
                  })()}

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Status de Aprovação</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "approved"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "approved" })}
                          className="text-primary focus:ring-0"
                        />
                        Aprovado
                      </label>
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "pending"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "pending" })}
                          className="text-primary focus:ring-0"
                        />
                        Pendente
                      </label>
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="edit-status"
                          checked={showEditUser.status === "rejected"}
                          onChange={() => setShowEditUser({ ...showEditUser, status: "rejected" })}
                          className="text-primary focus:ring-0"
                        />
                        Rejeitado
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Status da Conta</label>
                    <button
                      type="button"
                      onClick={() => setShowEditUser({ ...showEditUser, active: !showEditUser.active })}
                      className="flex items-center gap-2 text-sm text-foreground hover:text-foreground mt-2 transition-all"
                    >
                      {showEditUser.active ? (
                        <ToggleRight className="w-9 h-6 text-primary" />
                      ) : (
                        <ToggleLeft className="w-9 h-6 text-muted-foreground" />
                      )}
                      {showEditUser.active ? "Conta Ativa" : "Conta Inativa"}
                    </button>
                  </div>

                  {/* pode_criar_admin Flag check for edit */}
                  {(() => {
                    const selectedType = userTypes.find((t) => t.nome === (showEditUser.tipo_usuario || "Lojista"));
                    const isRoot = currentUser?.username === "root";
                    const canCreateAdmin = isRoot || currentUser?.pode_criar_admin;
                    
                    if (selectedType?.role === "admin" && canCreateAdmin) {
                      return (
                        <div className="flex items-center gap-2 md:col-span-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowEditUser({ ...showEditUser, pode_criar_admin: !showEditUser.pode_criar_admin })}
                            className="flex items-center gap-2 text-xs text-foreground hover:text-foreground transition-all"
                          >
                            {showEditUser.pode_criar_admin ? (
                              <ToggleRight className="w-8 h-5 text-primary" />
                            ) : (
                              <ToggleLeft className="w-8 h-5 text-muted-foreground" />
                            )}
                            Permitir que este administrador cadastre outros administradores
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-2 font-semibold">Módulos Permitidos</label>
                    <div className="flex flex-wrap gap-4">
                      {["documentos", "gestao"].map((mod) => (
                        <label key={mod} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(showEditUser.modulos || []).includes(mod)}
                            onChange={() => toggleModuleInEditUser(mod)}
                            className="rounded border-border bg-background text-primary focus:ring-0 w-4 h-4"
                          />
                          {mod === "gestao" ? "Gestão de Projetos" : "Documentos"}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => { setShowEditUser(null); setEditPassword(""); }}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(showEditUser)}
                      disabled={actionLoading === showEditUser.id}
                      className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold transition-all shadow-md shadow-primary/10"
                    >
                      {actionLoading === showEditUser.id ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por login, tipo, CNPJ..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
              />
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-card text-muted-foreground font-medium">
                    <th className="px-6 py-4">Login de acesso</th>
                    <th className="px-6 py-4">Tipo de Usuário</th>
                    <th className="px-6 py-4">Módulos</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios
                    .filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        u.username?.toLowerCase().includes(q) ||
                        u.tipo_usuario?.toLowerCase().includes(q) ||
                        u.cnpj?.toLowerCase().includes(q) ||
                        u.status?.toLowerCase().includes(q) ||
                        JSON.stringify(u.campos_customizados || {}).toLowerCase().includes(q)
                      );
                    })
                    .map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-border hover:bg-muted/20 transition-all ${
                        !u.active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-foreground font-medium flex items-center gap-2">
                            {u.username}
                            {u.pode_criar_admin && (
                              <span className="text-[9px] bg-primary/20 text-muted-foreground border border-border/30 px-1.5 py-0.2 rounded-full font-semibold">
                                Criador de Admin
                              </span>
                            )}
                          </div>
                          {/* Render dynamic metadata summary */}
                          {u.campos_customizados && Object.keys(u.campos_customizados).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {Object.keys(u.campos_customizados).map((k) => {
                                const val = u.campos_customizados?.[k];
                                if (val === undefined || val === null || val === "") return null;
                                return (
                                  <span key={k} className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                                    <strong className="text-muted-foreground font-medium uppercase text-[9px] mr-1">{k}:</strong>
                                    {typeof val === "boolean" ? (val ? "Sim" : "Não") : String(val)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                            : "bg-muted border border-border text-foreground"
                        }`}>
                          {u.tipo_usuario || (u.role === "admin" ? "Administrador" : "Lojista")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.modulos && u.modulos.length > 0 ? (
                            u.modulos.map((m) => <ModuleBadge key={m} moduleKey={m} />)
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">Nenhum</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Editar usuário"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {u.username !== "root" && u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/15 transition-colors"
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
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        Nenhum usuário cadastrado.
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Importação em Massa</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Suba uma planilha Excel (.xlsx) para cadastrar múltiplos usuários de forma estruturada.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("users")}
                className="flex items-center gap-2 bg-muted/70 hover:bg-muted text-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Usuários
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm text-center max-w-2xl mx-auto space-y-6">
              {/* User Type Selection for Import */}
              <div className="max-w-xs mx-auto text-left">
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Tipo de Usuário para Importar
                </label>
                <select
                  value={selectedUserTypeImportId}
                  onChange={(e) => {
                    setSelectedUserTypeImportId(e.target.value);
                    setImportRows([]); // reset preview when type changes
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs font-semibold"
                >
                  {userTypes.map((t) => (
                    <option key={t.id} value={t.nome}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-muted-foreground mx-auto border border-border/20">
                <Upload className="w-6 h-6" />
              </div>
              
              <h3 className="text-base font-semibold text-foreground">Selecione sua planilha Excel</h3>
              
              {/* Dynamic instruction text based on selected user type */}
              {(() => {
                const selectedType = userTypes.find(t => t.nome === selectedUserTypeImportId);
                const reqFields = selectedType ? selectedType.campos_schema.filter(f => f.obrigatorio).map(f => f.label) : [];
                const optFields = selectedType ? selectedType.campos_schema.filter(f => !f.obrigatorio).map(f => f.label) : [];
                return (
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
                    A planilha para importar <strong className="text-foreground font-semibold">{selectedUserTypeImportId}</strong> deve conter as colunas:{" "}
                    <strong className="text-foreground">Login de acesso</strong> e <strong className="text-foreground">Senha</strong>.
                    {reqFields.length > 0 && (
                      <>
                        {" "}Mais os campos obrigatórios:{" "}
                        <span className="text-red-400 font-semibold">{reqFields.map(f => `"${f}"`).join(", ")}</span>.
                      </>
                    )}
                    {optFields.length > 0 && (
                      <>
                        {" "}E campos opcionais: <span className="text-foreground">{optFields.map(f => `"${f}"`).join(", ")}</span>.
                      </>
                    )}
                  </p>
                );
              })()}

              <div className="flex flex-col items-center gap-4 pt-2">
                <label className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary text-foreground font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-muted/20">
                  <Plus className="w-4 h-4 inline-block mr-2" />
                  Procurar Planilha
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Import instructions preview */}
              <div className="mt-8 pt-6 border-t border-border text-left">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Exemplo de Estrutura da Planilha:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-muted-foreground border border-border rounded-lg">
                    <thead>
                      <tr className="bg-background text-foreground">
                        <th className="px-3 py-1.5 border border-border">Login de acesso</th>
                        <th className="px-3 py-1.5 border border-border">Senha</th>
                        {(() => {
                          const selectedType = userTypes.find(t => t.nome === selectedUserTypeImportId);
                          return selectedType?.campos_schema.map(f => (
                            <th key={f.nome} className="px-3 py-1.5 border border-border">
                              {f.label} {f.obrigatorio && <span className="text-red-400 font-bold">*</span>}
                            </th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-1 border border-border font-medium text-foreground">usuario123</td>
                        <td className="px-3 py-1 border border-border">senhaSegura123</td>
                        {(() => {
                          const selectedType = userTypes.find(t => t.nome === selectedUserTypeImportId);
                          return selectedType?.campos_schema.map(f => (
                            <td key={f.nome} className="px-3 py-1 border border-border italic text-muted-foreground">
                              {f.tipo === "number" ? "123" : f.tipo === "boolean" ? "Sim / Não" : `Exemplo ${f.label}`}
                            </td>
                          ));
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Imported Rows Preview */}
            {importRows.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-xl animate-scale-up max-w-4xl mx-auto">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center justify-between">
                  <span>Visualizando Registros da Planilha ({importRows.length})</span>
                  <button
                    onClick={() => setImportRows([])}
                    className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 font-semibold"
                  >
                    Limpar
                  </button>
                </h3>
                <div className="max-h-60 overflow-y-auto border border-border rounded-xl mb-6">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border bg-background text-muted-foreground">
                        {/* Dynamic headers list based on spreadsheet keys */}
                        {Object.keys(importRows[0]).map((key) => (
                          <th key={key} className="px-4 py-2 uppercase text-[10px] font-bold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/10">
                          {Object.keys(row).map((key) => (
                            <td key={key} className="px-4 py-2 text-foreground">
                              {typeof row[key] === "boolean" ? (row[key] ? "Sim" : "Não") : String(row[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setImportRows([])}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleProcessImport}
                    disabled={importLoading}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
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
                <h2 className="text-xl font-semibold text-foreground">Empresas</h2>
                <button
                  onClick={() => setShowCreateCompany(true)}
                  className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted text-foreground border border-border px-3 py-1.5 rounded-lg font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Add Company Form */}
              {showCreateCompany && (
                <div className="bg-card border border-border rounded-xl p-4 animate-scale-up">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Nova Empresa</h3>
                    <button onClick={() => setShowCreateCompany(false)} className="text-muted-foreground hover:text-foreground">
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
                        className="w-full px-3 py-1.5 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CNPJ"
                        required
                        value={newCompany.cnpj}
                        onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateCompany(false)}
                        className="px-3 py-1 text-xs rounded-md bg-muted hover:bg-muted text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs rounded-md bg-primary hover:bg-primary text-foreground"
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
                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5 text-foreground"
                        : "bg-card border-border hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{formatCnpj(c.cnpj)}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                        {arquivos.filter((f) => f.empresa_id === c.id).length} files
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompany(c);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar empresa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(c.id, c.nome);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                        title="Excluir empresa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
                {empresas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
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
                    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm space-y-6 animate-fade-in">
                      {/* Top Header */}
                      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{company?.nome}</h3>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            CNPJ: {company ? formatCnpj(company.cnpj) : ""}
                          </p>
                        </div>
                        <span className="text-xs bg-primary/10 border border-border/30 text-muted-foreground px-3 py-1 rounded-full font-medium">
                          {companyFiles.length} Documentos Anexados
                        </span>
                      </div>

                      {/* Upload Box */}
                      <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Upload className="w-4 h-4 text-foreground" />
                          Anexar Novo Arquivo
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                              Tipo do Documento
                            </label>
                            <select
                              value={selectedDocTypeId}
                              onChange={(e) => setSelectedDocTypeId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none"
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
                              className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-border hover:border-border rounded-lg cursor-pointer transition-all text-xs font-semibold text-foreground ${
                                !selectedDocTypeId || uploadLoading
                                  ? "opacity-50 cursor-not-allowed bg-background"
                                  : "bg-card hover:bg-muted"
                              }`}
                            >
                              {uploadLoading ? (
                                <span className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
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
                        <h4 className="text-sm font-semibold text-foreground">Documentos Disponibilizados</h4>
                        <div className="space-y-2">
                          {companyFiles.map((file) => {
                            const typeObj = docTipos.find((t) => t.id === file.tipo_id);
                            return (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3.5 rounded-xl bg-background/40 border border-border hover:border-border transition-all flex-wrap sm:flex-nowrap gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-foreground shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-foreground text-xs font-semibold uppercase tracking-wide">
                                      {typeObj?.nome || "Tipo Desconhecido"}
                                    </div>
                                    <div className="text-muted-foreground text-xs truncate mt-0.5">
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
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title="Visualizar/Baixar"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFile(file.id, file.arquivo_nome)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Remover documento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {companyFiles.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-xs bg-background/20 border border-dashed border-border rounded-xl">
                              Nenhum arquivo anexado a esta empresa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-96 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-sm">
                  <Building className="w-10 h-10 text-muted-foreground mb-3" />
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
                <h2 className="text-xl font-semibold text-foreground">Tipos de Documento</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Defina os tipos de documentos que a sua equipe jurídica e administrativa solicita.
                </p>
              </div>
              <button
                onClick={() => setShowCreateDocType(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> Novo Tipo
              </button>
            </div>

            {/* Create DocType Form */}
            {showCreateDocType && (
              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl max-w-xl mx-auto animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowCreateDocType(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-md font-semibold text-foreground mb-4">Novo Tipo de Documento</h3>
                <form onSubmit={handleCreateDocType} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome do Tipo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CERTIDÃO NEGATIVA SIMPLIFICADA"
                      value={newDocType.nome}
                      onChange={(e) => setNewDocType({ ...newDocType, nome: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrição / Observações</label>
                    <textarea
                      placeholder="Breve descrição do documento..."
                      value={newDocType.descricao}
                      onChange={(e) => setNewDocType({ ...newDocType, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateDocType(false)}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold transition-all"
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
                  className="bg-card border border-border rounded-xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs bg-primary/15 text-muted-foreground border border-border/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Documento
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditDocType(t)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar tipo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocType(t.id, t.nome)}
                          className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                          title="Excluir tipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-foreground font-semibold text-sm truncate uppercase">{t.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {t.descricao || "Sem descrição informada."}
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-4 border-t border-border pt-3">
                    ID: {t.id}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {/* -------------------- TAB: USERTYPES -------------------- */}
        {activeTab === "usertypes" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Configuração de Perfis (Tipos de Usuários)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie perfis personalizados de usuários e configure campos dinâmicos obrigatórios ou opcionais.
                </p>
              </div>
              <button
                onClick={() => setShowCreateUserType(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> Novo Perfil
              </button>
            </div>

            {/* Create UserType Form */}
            {showCreateUserType && (
              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl max-w-2xl mx-auto animate-scale-up">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowCreateUserType(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-md font-semibold text-foreground mb-4">Novo Tipo de Usuário</h3>
                
                <form onSubmit={handleCreateUserType} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Nome do Tipo / Perfil</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Fornecedor, ADM de loja"
                        value={newUserType.nome}
                        onChange={(e) => setNewUserType({ ...newUserType, nome: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5 font-semibold">Nível de Permissão Padrão</label>
                      <select
                        value={newUserType.role}
                        onChange={(e) => setNewUserType({ ...newUserType, role: e.target.value as "admin" | "user" })}
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                      >
                        <option value="user">Usuário Comum (Lojistas, etc.)</option>
                        <option value="admin">Administrador (Gestão Geral)</option>
                      </select>
                    </div>
                  </div>

                  {/* Fields Creator Section */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Campos Personalizados (Schema)</h4>
                    
                    <div className="bg-muted/60 p-4 rounded-xl border border-border mb-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Identificador Técnico</label>
                          <input
                            type="text"
                            placeholder="Ex: razao_social, cnpj"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Rótulo (Label de Exibição)</label>
                          <input
                            type="text"
                            placeholder="Ex: Razão Social, CNPJ"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Tipo de Dado</label>
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as any)}
                            className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="boolean">Sim/Não (Booleano)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={newFieldRequired}
                            onChange={(e) => setNewFieldRequired(e.target.checked)}
                            className="rounded border-border bg-card text-primary focus:ring-0 w-3.5 h-3.5"
                          />
                          Este campo é obrigatório no cadastro
                        </label>

                        <button
                          type="button"
                          onClick={handleAddFieldToNewType}
                          className="px-3 py-1 bg-muted hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-all border border-border"
                        >
                          Adicionar Campo
                        </button>
                      </div>
                    </div>

                    {/* Added fields list */}
                    {newUserType.campos_schema.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground">Campos adicionados:</label>
                        <div className="flex flex-wrap gap-2">
                          {newUserType.campos_schema.map((f, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg text-xs text-foreground">
                              <span className="font-semibold text-foreground">{f.label}</span>
                              <span className="text-[10px] text-muted-foreground">({f.tipo}{f.obrigatorio ? ", obrigatório" : ""})</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFieldFromNewType(idx)}
                                className="text-muted-foreground hover:text-red-400 ml-1 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhum campo personalizado adicionado a este perfil ainda.</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserType(false)}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === "create-usertype"}
                      className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold transition-all"
                    >
                      {actionLoading === "create-usertype" ? "Salvando..." : "Salvar Perfil"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* UserTypes Profiles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTypes.map((t) => (
                <div
                  key={t.id}
                  className="bg-card border border-border rounded-xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        t.role === "admin"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                          : "bg-primary/15 text-muted-foreground border-border/20"
                      }`}>
                        {t.role === "admin" ? "Administrador" : "Usuário Comum"}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditUserType(t)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar perfil"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleUserTypeAtivo(t)}
                          className={`p-1 rounded transition-colors ${
                            t.ativo === false
                              ? "text-emerald-400 hover:text-emerald-300"
                              : "text-muted-foreground hover:text-amber-400"
                          }`}
                          title={t.ativo === false ? "Ativar perfil" : "Inativar perfil"}
                        >
                          {t.ativo === false ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                        </button>
                        {!["Administrador", "Lojista", "ADM de loja"].includes(t.nome) && (
                          <button
                            onClick={() => handleDeleteUserType(t.id, t.nome)}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                            title="Excluir perfil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-foreground font-semibold text-sm uppercase">{t.nome}</h3>
                    
                    <div className="mt-3 space-y-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Campos do Perfil:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {t.campos_schema && t.campos_schema.length > 0 ? (
                          t.campos_schema.map((f, idx) => (
                            <span key={idx} className="text-[10px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border">
                              {f.label} {f.obrigatorio && <span className="text-red-500">*</span>}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Apenas Login e Senha</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-4 border-t border-border pt-3">
                    ID: {t.id}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* -------- Edit Company Modal -------- */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted/80 backdrop-blur-sm p-4" onClick={() => setEditingCompany(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditingCompany(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-foreground mb-4">Editar Empresa</h3>
            <form onSubmit={handleSaveEditCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Razão Social / Nome</label>
                <input
                  type="text"
                  required
                  value={editingCompany.nome}
                  onChange={(e) => setEditingCompany({ ...editingCompany, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">CNPJ</label>
                <input
                  type="text"
                  required
                  value={editingCompany.cnpj}
                  onChange={(e) => setEditingCompany({ ...editingCompany, cnpj: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCompany.ativo ?? true}
                  onChange={(e) => setEditingCompany({ ...editingCompany, ativo: e.target.checked })}
                  className="rounded border-border bg-card text-primary"
                />
                Empresa ativa
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCompany(null)} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm">Cancelar</button>
                <button type="submit" disabled={actionLoading === editingCompany.id} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold disabled:opacity-50">
                  {actionLoading === editingCompany.id ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------- Edit DocType Modal -------- */}
      {editingDocType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted/80 backdrop-blur-sm p-4" onClick={() => setEditingDocType(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditingDocType(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-foreground mb-4">Editar Tipo de Documento</h3>
            <form onSubmit={handleSaveEditDocType} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome</label>
                <input
                  type="text"
                  required
                  value={editingDocType.nome}
                  onChange={(e) => setEditingDocType({ ...editingDocType, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrição</label>
                <textarea
                  rows={3}
                  value={editingDocType.descricao ?? ""}
                  onChange={(e) => setEditingDocType({ ...editingDocType, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingDocType.ativo ?? true}
                  onChange={(e) => setEditingDocType({ ...editingDocType, ativo: e.target.checked })}
                  className="rounded border-border bg-card text-primary"
                />
                Tipo ativo
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingDocType(null)} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm">Cancelar</button>
                <button type="submit" disabled={actionLoading === editingDocType.id} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold disabled:opacity-50">
                  {actionLoading === editingDocType.id ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------- Edit UserType Modal -------- */}
      {editingUserType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setEditingUserType(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl relative animate-scale-up my-8" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditingUserType(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-foreground mb-4">Editar Perfil de Usuário</h3>
            <form onSubmit={handleSaveEditUserType} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome do Perfil</label>
                  <input
                    type="text"
                    required
                    value={editingUserType.nome}
                    onChange={(e) => setEditingUserType({ ...editingUserType, nome: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nível de Permissão</label>
                  <select
                    value={editingUserType.role}
                    onChange={(e) => setEditingUserType({ ...editingUserType, role: e.target.value as "admin" | "user" })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingUserType.ativo ?? true}
                  onChange={(e) => setEditingUserType({ ...editingUserType, ativo: e.target.checked })}
                  className="rounded border-border bg-card text-primary"
                />
                Perfil ativo
              </label>

              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Campos Personalizados</h4>

                <div className="bg-muted/60 p-4 rounded-xl border border-border mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Identificador (ex: cnpj)"
                      value={editFieldName}
                      onChange={(e) => setEditFieldName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Rótulo (ex: CNPJ)"
                      value={editFieldLabel}
                      onChange={(e) => setEditFieldLabel(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none text-xs"
                    />
                    <select
                      value={editFieldType}
                      onChange={(e) => setEditFieldType(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none text-xs"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="boolean">Sim/Não</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFieldRequired}
                        onChange={(e) => setEditFieldRequired(e.target.checked)}
                        className="rounded border-border bg-card text-primary w-3.5 h-3.5"
                      />
                      Obrigatório
                    </label>
                    <button
                      type="button"
                      onClick={handleAddFieldToEditType}
                      className="px-3 py-1 bg-muted hover:bg-muted text-foreground text-xs font-semibold rounded-lg border border-border"
                    >
                      Adicionar Campo
                    </button>
                  </div>
                </div>

                {editingUserType.campos_schema.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editingUserType.campos_schema.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg text-xs text-foreground">
                        <span className="font-semibold text-foreground">{f.label}</span>
                        <span className="text-[10px] text-muted-foreground">({f.tipo}{f.obrigatorio ? ", obrigatório" : ""})</span>
                        <button type="button" onClick={() => handleRemoveFieldFromEditType(idx)} className="text-muted-foreground hover:text-red-400 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhum campo personalizado.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingUserType(null)} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm">Cancelar</button>
                <button type="submit" disabled={actionLoading === editingUserType.id} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary text-foreground text-sm font-semibold disabled:opacity-50">
                  {actionLoading === editingUserType.id ? "Salvando..." : "Salvar Perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
