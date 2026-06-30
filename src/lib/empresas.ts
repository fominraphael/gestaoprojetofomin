import { supabase } from "@/integrations/supabase/client";

export interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  created_at?: string;
}

export interface DocumentoTipo {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
}

export interface DocumentoArquivo {
  id: string;
  empresa_id: string;
  tipo_id: string;
  arquivo_url: string;
  arquivo_nome: string;
  uploaded_at?: string;
}

const LOCAL_EMPRESAS_KEY = "portal_empresas_v1";
const LOCAL_DOC_TIPOS_KEY = "portal_doc_tipos_v1";
const LOCAL_ARQUIVOS_KEY = "portal_arquivos_v1";

function getLocalEmpresas(): Empresa[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_EMPRESAS_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

function saveLocalEmpresas(data: Empresa[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_EMPRESAS_KEY, JSON.stringify(data));
  }
}

function getLocalDocTipos(): DocumentoTipo[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_DOC_TIPOS_KEY);
  if (!stored) {
    const seed = [
      { id: "dt-1", nome: "ALVARÁ BOMBEIRO", descricao: "Alvará do Corpo de Bombeiros" },
      { id: "dt-2", nome: "ALVARÁ FUNCIONAMENTO", descricao: "Alvará de Funcionamento da empresa" },
      { id: "dt-3", nome: "ALVARÁ PUBLICIDADE", descricao: "Alvará de Publicidade/Anúncios" },
      { id: "dt-4", nome: "CARTÃO CNPJ", descricao: "Comprovante de Inscrição e de Situação Cadastral" },
      { id: "dt-5", nome: "CARTÃO MUNICIPAL", descricao: "Inscrição Municipal da empresa" },
      { id: "dt-6", nome: "CARTÃO SINTEGRA", descricao: "Cadastro no Sintegra/ICMS" },
      { id: "dt-7", nome: "CND ESPECIFICA - RIGUEL", descricao: "Certidão Negativa de Débitos Específica" },
      { id: "dt-8", nome: "CND ESTADUAL", descricao: "Certidão Negativa de Débitos Estaduais" },
      { id: "dt-9", nome: "CND FALÊNCIA", descricao: "Certidão Negativa de Falência e Recuperação Judicial" },
      { id: "dt-10", nome: "CND FEDERAL-INSS", descricao: "Certidão Negativa de Débitos Federais e INSS" },
      { id: "dt-11", nome: "CND FGTS", descricao: "Certificado de Regularidade do FGTS (CRF)" },
      { id: "dt-12", nome: "CND MUNICIPAL", descricao: "Certidão Negativa de Débitos Municipais" },
      { id: "dt-13", nome: "CND SIMPLIFICADA", descricao: "Certidão Negativa Simplificada" },
      { id: "dt-14", nome: "CND TRABALHISTA", descricao: "Certidão Negativa de Débitos Trabalhistas (CNDT)" },
      { id: "dt-15", nome: "CONTRATO SOCIAL", descricao: "Contrato Social Consolidado ou Estatuto Social" },
      { id: "dt-16", nome: "HABITE-SE", descricao: "Habite-se do imóvel da empresa" },
      { id: "dt-17", nome: "LICENÇA AMBIENTAL", descricao: "Licença Ambiental de Operação/Instalação" },
      { id: "dt-18", nome: "PROCURACAO - ADMINISTRATIVA", descricao: "Procuração Administrativa" },
      { id: "dt-19", nome: "PROCURACAO - CONTRATOS", descricao: "Procuração para Assinatura de Contratos" },
      { id: "dt-20", nome: "PROCURAÇÃO - DETRAN", descricao: "Procuração DETRAN" },
    ];
    localStorage.setItem(LOCAL_DOC_TIPOS_KEY, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(stored); } catch { return []; }
}

function saveLocalDocTipos(data: DocumentoTipo[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_DOC_TIPOS_KEY, JSON.stringify(data));
  }
}

function getLocalArquivos(): DocumentoArquivo[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_ARQUIVOS_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

function saveLocalArquivos(data: DocumentoArquivo[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_ARQUIVOS_KEY, JSON.stringify(data));
  }
}

// Companies CRUD
export async function obterEmpresas(): Promise<Empresa[]> {
  try {
    const { data, error } = await supabase.from("empresas").select("*").order("nome");
    if (error) throw error;
    return data as Empresa[];
  } catch {
    return getLocalEmpresas();
  }
}

export async function criarEmpresa(cnpj: string, nome: string): Promise<Empresa> {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  try {
    const { data, error } = await supabase
      .from("empresas")
      .insert([{ cnpj: cleanCnpj, nome }])
      .select("*");
    if (error) {
      if (error.code === "23505") throw new Error("Uma empresa com este CNPJ já está cadastrada.");
      throw error;
    }
    return data[0] as Empresa;
  } catch (err: any) {
    if (err.message?.includes("já está cadastrada")) throw err;
    const items = getLocalEmpresas();
    if (items.some((i) => i.cnpj === cleanCnpj)) {
      throw new Error("Uma empresa com este CNPJ já está cadastrada.");
    }
    const created: Empresa = {
      id: crypto.randomUUID(),
      cnpj: cleanCnpj,
      nome,
      created_at: new Date().toISOString(),
    };
    items.push(created);
    saveLocalEmpresas(items);
    return created;
  }
}

export async function excluirEmpresa(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) throw error;
  } catch {
    const items = getLocalEmpresas().filter((i) => i.id !== id);
    saveLocalEmpresas(items);
    // Cascade files delete
    const files = getLocalArquivos().filter((f) => f.empresa_id !== id);
    saveLocalArquivos(files);
  }
}

// Document Types CRUD
export async function obterDocumentosTipo(): Promise<DocumentoTipo[]> {
  try {
    const { data, error } = await supabase.from("documentos_tipo").select("*").order("nome");
    if (error) throw error;
    return data as DocumentoTipo[];
  } catch {
    return getLocalDocTipos();
  }
}

export async function criarDocumentoTipo(nome: string, descricao: string): Promise<DocumentoTipo> {
  const upperNome = nome.toUpperCase().trim();
  try {
    const { data, error } = await supabase
      .from("documentos_tipo")
      .insert([{ nome: upperNome, descricao }])
      .select("*");
    if (error) {
      if (error.code === "23505") throw new Error("Um tipo de documento com este nome já existe.");
      throw error;
    }
    return data[0] as DocumentoTipo;
  } catch (err: any) {
    if (err.message?.includes("já existe")) throw err;
    const items = getLocalDocTipos();
    if (items.some((i) => i.nome === upperNome)) {
      throw new Error("Um tipo de documento com este nome já existe.");
    }
    const created: DocumentoTipo = {
      id: crypto.randomUUID(),
      nome: upperNome,
      descricao,
      created_at: new Date().toISOString(),
    };
    items.push(created);
    saveLocalDocTipos(items);
    return created;
  }
}

export async function excluirDocumentoTipo(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("documentos_tipo").delete().eq("id", id);
    if (error) throw error;
  } catch {
    const items = getLocalDocTipos().filter((i) => i.id !== id);
    saveLocalDocTipos(items);
    // Cascade files delete
    const files = getLocalArquivos().filter((f) => f.tipo_id !== id);
    saveLocalArquivos(files);
  }
}

// Files CRUD
export async function obterArquivos(empresaId?: string): Promise<DocumentoArquivo[]> {
  try {
    let query = supabase.from("documentos_arquivo").select("*");
    if (empresaId) {
      query = query.eq("empresa_id", empresaId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as DocumentoArquivo[];
  } catch {
    const all = getLocalArquivos();
    if (empresaId) {
      return all.filter((f) => f.empresa_id === empresaId);
    }
    return all;
  }
}

export async function uploadArquivo(
  empresaId: string,
  tipoId: string,
  file: File
): Promise<DocumentoArquivo> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const filePath = `${empresaId}/${fileName}`;

  try {
    // Attempt Supabase storage upload (bucket name "documentos")
    const { data: storageData, error: storageErr } = await supabase.storage
      .from("documentos")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (storageErr) throw storageErr;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("documentos")
      .getPublicUrl(filePath);
      
    const fileUrl = publicUrlData.publicUrl;

    // Insert document_arquivo record
    const { data: recordData, error: insertErr } = await supabase
      .from("documentos_arquivo")
      .insert([
        {
          empresa_id: empresaId,
          tipo_id: tipoId,
          arquivo_url: fileUrl,
          arquivo_nome: file.name,
        },
      ])
      .select("*");

    if (insertErr) throw insertErr;
    return recordData[0] as DocumentoArquivo;
  } catch (err) {
    console.warn("Supabase upload failed, falling back to local storage:", err);
    
    // Fallback: Read file as Base64 data url for browser-only download
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        const all = getLocalArquivos();
        
        // Remove existing file of the same type for this company if one exists
        const cleaned = all.filter(f => !(f.empresa_id === empresaId && f.tipo_id === tipoId));

        const newFile: DocumentoArquivo = {
          id: crypto.randomUUID(),
          empresa_id: empresaId,
          tipo_id: tipoId,
          arquivo_url: base64Url,
          arquivo_nome: file.name,
          uploaded_at: new Date().toISOString(),
        };

        cleaned.push(newFile);
        saveLocalArquivos(cleaned);
        resolve(newFile);
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
      reader.readAsDataURL(file);
    });
  }
}

export async function excluirArquivo(id: string): Promise<void> {
  try {
    // Find record first to get the storage path
    const { data, error } = await supabase
      .from("documentos_arquivo")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    
    const fileRecord = data as DocumentoArquivo;
    // Extract file path from URL (usually looks like: .../storage/v1/object/public/documentos/empresa_id/filename)
    const urlParts = fileRecord.arquivo_url.split("/documentos/");
    if (urlParts.length > 1) {
      const storagePath = decodeURIComponent(urlParts[1]);
      // Remove from Supabase Storage
      await supabase.storage.from("documentos").remove([storagePath]);
    }

    // Delete record from DB
    const { error: delError } = await supabase
      .from("documentos_arquivo")
      .delete()
      .eq("id", id);
      
    if (delError) throw delError;
  } catch {
    const all = getLocalArquivos();
    const updated = all.filter((f) => f.id !== id);
    saveLocalArquivos(updated);
  }
}
