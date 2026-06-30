import { supabase } from "@/integrations/supabase/client";

export interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  ativo?: boolean;
  created_at?: string;
}

export interface DocumentoTipo {
  id: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  created_at?: string;
}

export interface DocumentoArquivo {
  id: string;
  empresa_id: string;
  tipo_id: string;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tamanho?: number | null;
  storage_path?: string | null;
  uploaded_at?: string;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// ============================================================
// EMPRESAS
// ============================================================
export async function obterEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from("empresas").select("*").order("nome");
  if (error) throw error;
  return (data as Empresa[]) || [];
}

export async function criarEmpresa(cnpj: string, nome: string): Promise<Empresa> {
  const { data, error } = await supabase
    .from("empresas")
    .insert([{ cnpj: cnpj.trim(), nome }])
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Uma empresa com este CNPJ já está cadastrada.");
    throw error;
  }
  return data as Empresa;
}

export async function atualizarEmpresa(
  id: string,
  updates: { cnpj?: string; nome?: string; ativo?: boolean }
): Promise<void> {
  const payload: any = { ...updates };
  if (payload.cnpj !== undefined) payload.cnpj = String(payload.cnpj).trim();
  const { error } = await supabase.from("empresas").update(payload).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Uma empresa com este CNPJ já está cadastrada.");
    throw error;
  }
}

export async function excluirEmpresa(id: string): Promise<void> {
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// TIPOS DE DOCUMENTO
// ============================================================
export async function obterDocumentosTipo(): Promise<DocumentoTipo[]> {
  const { data, error } = await supabase.from("documentos_tipo").select("*").order("nome");
  if (error) throw error;
  return (data as DocumentoTipo[]) || [];
}

export async function criarDocumentoTipo(nome: string, descricao: string): Promise<DocumentoTipo> {
  const upperNome = nome.toUpperCase().trim();
  const { data, error } = await supabase
    .from("documentos_tipo")
    .insert([{ nome: upperNome, descricao }])
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Um tipo de documento com este nome já existe.");
    throw error;
  }
  return data as DocumentoTipo;
}

export async function atualizarDocumentoTipo(
  id: string,
  updates: { nome?: string; descricao?: string | null; ativo?: boolean }
): Promise<void> {
  const payload: any = { ...updates };
  if (payload.nome) payload.nome = String(payload.nome).toUpperCase().trim();
  const { error } = await supabase.from("documentos_tipo").update(payload).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Um tipo de documento com este nome já existe.");
    throw error;
  }
}

export async function excluirDocumentoTipo(id: string): Promise<void> {
  const { error } = await supabase.from("documentos_tipo").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// ARQUIVOS
// ============================================================
export async function obterArquivos(empresaId?: string): Promise<DocumentoArquivo[]> {
  let query = supabase.from("documentos_arquivo").select("*");
  if (empresaId) query = query.eq("empresa_id", empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as DocumentoArquivo[]) || [];
}

export async function uploadArquivo(
  empresaId: string,
  tipoId: string,
  file: File
): Promise<DocumentoArquivo> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Limite: 10 MB.`
    );
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${empresaId}/${tipoId}/${Date.now()}_${safeName}`;

  // Remove existing file of the same type for this company (one file per type)
  const { data: existing } = await supabase
    .from("documentos_arquivo")
    .select("id, storage_path")
    .eq("empresa_id", empresaId)
    .eq("tipo_id", tipoId);
  if (existing && existing.length > 0) {
    const paths = existing.map((e: any) => e.storage_path).filter(Boolean);
    if (paths.length > 0) await supabase.storage.from("documentos").remove(paths);
    await supabase
      .from("documentos_arquivo")
      .delete()
      .in("id", existing.map((e: any) => e.id));
  }

  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(storagePath, file, { cacheControl: "3600", upsert: true });
  if (upErr) throw new Error(upErr.message);

  // Private bucket → use signed URL with long TTL for display/download (1 hour);
  // for archival we store the storage_path and re-sign on demand if needed.
  const { data: signed } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
  const arquivo_url = signed?.signedUrl ?? "";

  const { data: rec, error: insErr } = await supabase
    .from("documentos_arquivo")
    .insert([{
      empresa_id: empresaId,
      tipo_id: tipoId,
      arquivo_url,
      arquivo_nome: file.name,
      arquivo_tamanho: file.size,
      storage_path: storagePath,
    }])
    .select("*")
    .single();
  if (insErr) throw insErr;
  return rec as DocumentoArquivo;
}

export async function excluirArquivo(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("documentos_arquivo")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (error) throw error;
  if ((data as any)?.storage_path) {
    await supabase.storage.from("documentos").remove([(data as any).storage_path]);
  }
  const { error: delErr } = await supabase.from("documentos_arquivo").delete().eq("id", id);
  if (delErr) throw delErr;
}
