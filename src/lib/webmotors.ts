import { supabase } from "@/integrations/supabase/client";

/** Remove espaços/caracteres especiais e converte para maiúsculas. */
export function normalizarPlaca(p: unknown): string {
  return String(p ?? "")
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/** Aceita número ou texto no formato BR ("R$ 75.900,00") ou US ("75900.00"). */
export function parseValor(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[R$\s]/g, "");
  if (!s) return null;
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseData(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "invalida";
}

export type MotivoWm = "sem_campos" | "valor_invalido" | "duplicada" | "nao_localizada" | "data_invalida";
export const ROTULO_MOTIVO: Record<MotivoWm, string> = {
  sem_campos: "Sem placa ou sem valor",
  valor_invalido: "Valor inválido (deve ser número maior que zero)",
  duplicada: "Placa duplicada no arquivo",
  nao_localizada: "Placa não localizada no estoque",
  data_invalida: "Data de referência inválida",
};

export interface LinhaWmValida {
  linha: number;
  placa: string;
  veiculo_id: string;
  valor: number;
  valor_anterior: number | null;
  data_referencia: string | null;
  url: string | null;
  observacao: string | null;
}
export interface Inconsistencia {
  linha: number;
  placa: string;
  motivo: MotivoWm;
}
export interface PreviaWm {
  total: number;
  validas: LinhaWmValida[];
  inconsistencias: Inconsistencia[];
}

const chaveNorm = (k: string) =>
  k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s-]+/g, "_");

/** Valida a planilha contra o estoque atual, sem gravar nada. */
export async function validarPlanilhaWebmotors(linhas: Record<string, unknown>[]): Promise<PreviaWm> {
  const rows = linhas.map((l) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(l)) o[chaveNorm(k)] = v;
    return o;
  });
  const cols = new Set(rows.flatMap((r) => Object.keys(r)));
  if (!cols.has("placa") || !cols.has("valor_webmotors")) {
    throw new Error("A planilha precisa das colunas obrigatórias: placa e valor_webmotors.");
  }

  // Estoque ativo (não excluído) indexado pela placa normalizada.
  const { data, error } = await supabase
    .from("estoque_veiculos")
    .select("id, placa, webmotors_valor")
    .is("deleted_at", null)
    .not("placa", "is", null)
    .limit(20000);
  if (error) throw error;
  const porPlaca = new Map<string, { id: string; valor: number | null }>();
  for (const v of data ?? []) porPlaca.set(normalizarPlaca(v.placa), { id: v.id, valor: v.webmotors_valor });

  const contagem = new Map<string, number>();
  for (const r of rows) {
    const p = normalizarPlaca(r.placa);
    if (p) contagem.set(p, (contagem.get(p) ?? 0) + 1);
  }

  const validas: LinhaWmValida[] = [];
  const inconsistencias: Inconsistencia[] = [];
  rows.forEach((r, i) => {
    const linha = i + 2; // cabeçalho é a linha 1
    const placa = normalizarPlaca(r.placa);
    const bruto = r.valor_webmotors;
    if (!placa || bruto == null || bruto === "") return void inconsistencias.push({ linha, placa, motivo: "sem_campos" });
    const valor = parseValor(bruto);
    if (valor == null || valor <= 0) return void inconsistencias.push({ linha, placa, motivo: "valor_invalido" });
    if ((contagem.get(placa) ?? 0) > 1) return void inconsistencias.push({ linha, placa, motivo: "duplicada" });
    const data_referencia = parseData(r.data_referencia);
    if (data_referencia === "invalida") return void inconsistencias.push({ linha, placa, motivo: "data_invalida" });
    const v = porPlaca.get(placa);
    if (!v) return void inconsistencias.push({ linha, placa, motivo: "nao_localizada" });
    validas.push({
      linha,
      placa,
      veiculo_id: v.id,
      valor,
      valor_anterior: v.valor,
      data_referencia,
      url: r.url_anuncio ? String(r.url_anuncio).trim() : null,
      observacao: r.observacao ? String(r.observacao).trim() : null,
    });
  });
  return { total: rows.length, validas, inconsistencias };
}

/** Grava de forma atômica no banco (tudo ou nada) e registra o histórico. */
export async function confirmarImportacaoWebmotors(validas: LinhaWmValida[], arquivo: string): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  const nome = (u.user?.user_metadata?.["username"] as string | undefined) ?? u.user?.email ?? null;
  const { data, error } = await supabase.rpc("importar_webmotors", {
    _itens: validas.map((v) => ({
      veiculo_id: v.veiculo_id,
      placa: v.placa,
      valor: v.valor,
      data_referencia: v.data_referencia ?? "",
      url: v.url ?? "",
      observacao: v.observacao ?? "",
    })),
    _arquivo: arquivo,
    _usuario_nome: nome ?? "",
  });
  if (error) throw error;
  return data ?? 0;
}

export async function getHistoricoWebmotors(limite = 50) {
  const { data, error } = await supabase
    .from("estoque_webmotors_historico")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}
