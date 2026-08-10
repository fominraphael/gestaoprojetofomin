import { supabase } from "@/integrations/supabase/client";

export type Frequencia = "semanal" | "mensal" | "sob_demanda";

export type StatusTarefa = "a_fazer" | "fazendo" | "concluido";

export const DIAS_SEMANA = [
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
] as const;


export const DIAS_SEMANA_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export function getDiaSemanaAtual(): number {
  return new Date().getDay();
}

export function formatDiaSemanaCurto(d: number): string {
  return DIAS_SEMANA.find((ds) => ds.valor === d)?.label ?? "";
}

export const FREQUENCIA_LABELS: Record<Frequencia, string> = {
  semanal: "Semanal",
  mensal: "Mensal",
  sob_demanda: "Sob demanda",
};

export const STATUS_TAREFA_LABELS: Record<StatusTarefa, string> = {
  a_fazer: "A fazer",
  fazendo: "Fazendo",
  concluido: "Concluído",
};

export const STATUS_TAREFA_COLORS: Record<StatusTarefa, string> = {
  a_fazer: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  fazendo: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  concluido: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export interface Setor {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Atividade {
  id: string;
  nome: string;
  setor_id: string | null;
  frequencia: Frequencia;
  dias_semana: number[] | null;
  periodo_mensal: string | null;
  descricao: string;
  ordem: number;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tarefa {
  id: string;
  nome: string;
  setor_id: string | null;
  status: StatusTarefa;
  prazo: string | null;
  descricao: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Checkpoint {
  id: string;
  atividade_id: string;
  data: string;
  concluido_por: string | null;
  created_at: string;
}

export interface Anexo {
  id: string;
  entidade: "atividade" | "tarefa";
  entidade_id: string;
  arquivo_path: string;
  nome_original: string;
  tipo_mime: string | null;
  tamanho: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Kpi {
  id: string;
  nome: string;
  unidade: string;
  valor_atual: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface KpiHistorico {
  id: string;
  kpi_id: string;
  mes: string;
  valor: number;
  created_at: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Missao {
  id: string;
  conteudo: string;
  updated_at: string;
}

export function formatDiasSemana(dias: number[] | null): string {
  if (!dias || dias.length === 0) return "—";
  return dias
    .sort()
    .map((d) => DIAS_SEMANA.find((ds) => ds.valor === d)?.label ?? "")
    .filter(Boolean)
    .join(", ");
}

export function formatTamanho(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export async function toggleCheckpoint(
  atividadeId: string,
  data: string,
  userId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("rotina_checkpoints")
    .select("id")
    .eq("atividade_id", atividadeId)
    .eq("data", data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("rotina_checkpoints")
      .delete()
      .eq("id", existing.id);
    return !error;
  } else {
    const { error } = await supabase.from("rotina_checkpoints").insert({
      atividade_id: atividadeId,
      data,
      concluido_por: userId,
    });
    return !error;
  }
}

export async function getCheckpoints(
  atividadeIds: string[],
  data: string,
): Promise<Set<string>> {
  if (atividadeIds.length === 0) return new Set();
  const { data: rows } = await supabase
    .from("rotina_checkpoints")
    .select("atividade_id")
    .in("atividade_id", atividadeIds)
    .eq("data", data);
  return new Set((rows ?? []).map((r: any) => r.atividade_id));
}

export async function uploadAnexo(
  file: File,
  entidade: "atividade" | "tarefa",
  entidadeId: string,
  userId: string,
): Promise<{ path: string; id: string } | null> {
  const ext = file.name.split(".").pop() ?? "";
  const path = `${entidade}/${entidadeId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("rotina-anexos")
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) return null;

  const { data, error: insertError } = await supabase
    .from("rotina_anexos")
    .insert({
      entidade,
      entidade_id: entidadeId,
      arquivo_path: path,
      nome_original: file.name,
      tipo_mime: file.type || null,
      tamanho: file.size,
      uploaded_by: userId,
    })
    .select("id")
    .single();

  if (insertError) return null;
  return { path, id: data.id };
}

export async function removerAnexo(anexo: Anexo): Promise<boolean> {
  await supabase.storage.from("rotina-anexos").remove([anexo.arquivo_path]);
  const { error } = await supabase.from("rotina_anexos").delete().eq("id", anexo.id);
  return !error;
}

export async function getAnexoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("rotina-anexos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ============================ Semanas / Histórico ============================ */

export interface SemanaSnapshotAtividade {
  id: string;
  nome: string;
  dias_semana: number[] | null;
  concluidos: string[];
}

export interface SemanaSnapshot {
  atividades: SemanaSnapshotAtividade[];
}

export interface SemanaHistorico {
  id: string;
  setor_id: string;
  inicio: string;
  fim: string;
  snapshot: SemanaSnapshot;
  total_atividades: number;
  total_concluidos: number;
  encerrado_por: string | null;
  created_at: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Segunda-feira da semana da data informada (default: hoje). */
export function inicioSemana(ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const diff = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - diff);
  return toISODate(d);
}

/** Sexta-feira da semana iniciada em `inicio` (ISO). */
export function fimSemana(inicio: string): string {
  const d = parseISODate(inicio);
  d.setDate(d.getDate() + 4);
  return toISODate(d);
}

/** Datas (ISO) de segunda a sexta da semana iniciada em `inicio`. */
export function diasDaSemana(inicio: string): string[] {
  const base = parseISODate(inicio);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });
}

/** "Agosto - 1ª Semana (03 a 07)" */
export function labelSemana(inicio: string, fim: string): string {
  const ini = parseISODate(inicio);
  const f = parseISODate(fim);
  const mes = MESES[ini.getMonth()];
  const ordinal = Math.floor((ini.getDate() - 1) / 7) + 1;
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  return `${mes} - ${ordinal}ª Semana (${dd(ini)} a ${dd(f)})`;
}

/** "Agosto/2026" — chave de agrupamento do histórico. */
export function labelMes(inicio: string): string {
  const d = parseISODate(inicio);
  return `${MESES[d.getMonth()]}/${d.getFullYear()}`;
}

/** Checkpoints de um intervalo de datas: Map<atividade_id, string[] de datas>. */
export async function getCheckpointsIntervalo(
  atividadeIds: string[],
  inicio: string,
  fim: string,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (atividadeIds.length === 0) return map;
  const { data } = await supabase
    .from("rotina_checkpoints")
    .select("atividade_id, data")
    .in("atividade_id", atividadeIds)
    .gte("data", inicio)
    .lte("data", fim);
  for (const row of (data ?? []) as any[]) {
    const arr = map.get(row.atividade_id) ?? [];
    arr.push(row.data);
    map.set(row.atividade_id, arr);
  }
  return map;
}

/**
 * Encerra a semana atual do setor: grava um snapshot no histórico.
 * As atividades permanecem cadastradas, então a nova semana já inicia
 * com todas as atividades da semana anterior (concluídas e pendentes).
 */
export async function encerrarSemana(
  setorId: string,
  atividades: Atividade[],
  userId: string,
  ref: Date = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  const inicio = inicioSemana(ref);
  const fim = fimSemana(inicio);
  const cps = await getCheckpointsIntervalo(
    atividades.map((a) => a.id),
    inicio,
    fim,
  );

  const snapshot: SemanaSnapshot = {
    atividades: atividades.map((a) => ({
      id: a.id,
      nome: a.nome,
      dias_semana: a.dias_semana,
      concluidos: (cps.get(a.id) ?? []).sort(),
    })),
  };
  const totalConcluidos = snapshot.atividades.filter((a) => a.concluidos.length > 0).length;

  const { error } = await supabase
    .from("rotina_semanas")
    .upsert(
      {
        setor_id: setorId,
        inicio,
        fim,
        snapshot: snapshot as any,
        total_atividades: atividades.length,
        total_concluidos: totalConcluidos,
        encerrado_por: userId,
      } as any,
      { onConflict: "setor_id,inicio" },
    );

  return error ? { ok: false, error: error.message } : { ok: true };
}
