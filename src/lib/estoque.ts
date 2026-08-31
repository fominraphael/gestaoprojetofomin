/**
 * Camada de dados do módulo Análise de Estoque (Matriz).
 * Acesso via cliente do navegador (o módulo roda inteiro em rota autenticada).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  calcularValorAnuncio,
  faixaDoVeiculo,
  normalizaNiveis,
  ACOES_MATRIZ,
  type AnuncioMercado,
  type ClassificacaoEstoque,
  type FaixaDias,
  type FaixaKm,

  type GatilhoLeads,
  type RegraEstoque,
  type TipoAcaoMatriz,
  type VendaHistorica,
} from "./estoque-motor";

/**
 * O backend limita QUALQUER consulta a 1.000 linhas por requisição (teto do
 * PostgREST), independentemente do `.limit()` enviado. Todas as listagens do
 * módulo passam por este helper, que pagina em blocos até esgotar o resultado.
 */
const TAMANHO_PAGINA = 1000;

interface QueryPaginavel {
  range: (
    de: number,
    ate: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

/** Executa a consulta em blocos de 1.000 e devolve todas as linhas. */
async function buscarTodos<T>(criarQuery: () => QueryPaginavel): Promise<T[]> {
  const todos: T[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await criarQuery().range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const lote = (data ?? []) as T[];
    todos.push(...lote);
    if (lote.length < TAMANHO_PAGINA) break;
  }
  return todos;
}


export interface Origem {
  id: string;
  codigo: number;
  nome: string;
  ativo: boolean;
}

/**
 * Empresa NBS = base/origem operacional. O "chassi resumido" NÃO faz parte deste
 * cadastro: ele é um dado transacional de cada compra do veículo.
 */
export interface EmpresaNbs {
  id: string;
  origem_id: string;
  nome_exibicao: string;
  ativo: boolean;
}

export interface Finalidade {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Veiculo {
  id: string;
  chassi: string;
  origem_id: string;
  chassi_resumido: string;
  empresa_nbs_id: string | null;
  regional: string | null;
  loja: string | null;
  modelo: string | null;
  ano_mod: string | null;
  cor: string | null;
  placa: string | null;
  km: number | null;
  custo_total: number | null;
  valor_anunciado_planilha: number | null;
  fipe: number | null;
  percentual_fipe_planilha: number | null;
  dias_em_estoque: number;
  fotos_qtd: number | null;
  leads_60_dias: number;
  classificacao: string | null;
  acao_planilha: string | null;
  codigo_fipe: string | null;
  finalidade: string | null;
  finalidade_atual: string | null;
  valor_anuncio_calculado: number | null;
  faixa_id_atual: string | null;
  em_repasse: boolean;
  em_vendido: boolean;
  importado_em?: string;
  ultimo_calculo_em: string | null;
  deleted_at: string | null;
  /** Campos alterados manualmente pelo usuário (diferencia do dado importado). */
  campos_manuais?: string[] | null;
  editado_em?: string | null;

}

export interface HistoricoValor {
  id: string;
  veiculo_id: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  classificacao: string | null;
  faixa_nome: string | null;
  regra_tipo: string | null;
  percentual: number | null;
  memoria_calculo: Record<string, unknown>;
  created_at: string;
}

export interface TarefaLead {
  id: string;
  veiculo_id: string;
  regra_id: string | null;
  faixa_nome: string | null;
  nome: string;
  concluido: boolean;
  concluido_em: string | null;
  created_at: string;
}

export interface Anuncio {
  id: string;
  chassi: string;
  canal_site_proprio: boolean;
  canal_olx: boolean;
  canal_webmotors: boolean;
  preco_venda: number | null;
  status: string | null;
}

export interface LinhaRelatorio {
  linha: number;
  chassi?: string;
  motivo: string;
}

export interface RelatorioImportacao {
  totalLinhas: number;
  importados: number;
  atualizados: number;
  /** Novas compras do mesmo veículo (chassi já existia na origem com outro chassi resumido). */
  novasCompras?: number;
  /** Veículos ativos movidos para a categoria Vendidos (venda localizada na planilha de vendas). */
  movidosVendidos?: number;
  /** Veículos que estavam em Vendidos e retornaram ao Estoque (venda cancelada). */
  vendasCanceladas?: number;
  ignorados: LinhaRelatorio[];
}

/* ------------------------------- Configuração ------------------------------- */

export async function getOrigens(): Promise<Origem[]> {
  const { data, error } = await supabase.from("estoque_origens").select("*").order("codigo");
  if (error) throw error;
  return (data ?? []) as Origem[];
}

export async function getEmpresasNbs(): Promise<EmpresaNbs[]> {
  const { data, error } = await supabase
    .from("estoque_empresas_nbs")
    .select("*")
    .order("nome_exibicao");
  if (error) throw error;
  return (data ?? []) as EmpresaNbs[];
}

export async function getFinalidades(): Promise<Finalidade[]> {
  const { data, error } = await supabase.from("estoque_finalidades").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as Finalidade[];
}

export async function getFaixas(): Promise<FaixaDias[]> {
  const { data, error } = await supabase.from("estoque_faixas_dias").select("*").order("ordem");
  if (error) throw error;
  return (data ?? []) as FaixaDias[];
}

/** Faixas de KM configuráveis usadas no match do histórico de vendas. */
export async function getFaixasKm(): Promise<FaixaKm[]> {
  const { data, error } = await supabase
    .from("estoque_faixas_km" as never)
    .select("*")
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as unknown as FaixaKm[];
}

export async function salvarFaixaKm(
  faixa: Partial<FaixaKm> & { nome: string; km_inicio: number; km_fim: number },
): Promise<void> {
  const payload = {
    ...(faixa.id ? { id: faixa.id } : {}),
    nome: faixa.nome,
    km_inicio: faixa.km_inicio,
    km_fim: faixa.km_fim,
    ordem: faixa.ordem ?? 0,
    ativo: faixa.ativo ?? true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("estoque_faixas_km" as never).upsert(payload as never);
  if (error) throw error;
}

export async function excluirFaixaKm(id: string): Promise<void> {
  const { error } = await supabase.from("estoque_faixas_km" as never).delete().eq("id", id);
  if (error) throw error;
}

/** Preferência de colunas da tela de veículos — persistida por usuário. */
export async function getPrefColunas(): Promise<string[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("estoque_pref_colunas" as never)
    .select("colunas")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  const colunas = (data as { colunas?: unknown } | null)?.colunas;
  return Array.isArray(colunas) ? (colunas as string[]) : null;
}

export async function salvarPrefColunas(colunas: string[]): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("estoque_pref_colunas" as never)
    .upsert({ user_id: uid, colunas, updated_at: new Date().toISOString() } as never);
  if (error) throw error;
}


export async function getRegras(): Promise<RegraEstoque[]> {
  const [{ data: regras, error }, { data: leads, error: e2 }] = await Promise.all([
    supabase.from("estoque_regras").select("*"),
    supabase.from("estoque_regra_leads").select("*").order("ordem"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  return ((regras ?? []) as unknown as RegraEstoque[]).map((r) => ({
    ...r,
    fallback_niveis: normalizaNiveis(r.fallback_niveis),
    leads: ((leads ?? []) as unknown as (GatilhoLeads & { regra_id: string })[]).filter(
      (l) => l.regra_id === r.id,
    ),
  }));
}


export async function upsertRegra(
  regra: Partial<RegraEstoque> & { classificacao: ClassificacaoEstoque; faixa_id: string },
  gatilhos: GatilhoLeads[],
): Promise<void> {
  const { leads: _ignore, ...payload } = regra as RegraEstoque;
  const { data, error } = await supabase
    .from("estoque_regras")
    .upsert(payload as never, { onConflict: "classificacao,faixa_id" })
    .select("id")
    .single();
  if (error) throw error;
  const regraId = (data as { id: string }).id;

  const { error: delErr } = await supabase
    .from("estoque_regra_leads")
    .delete()
    .eq("regra_id", regraId);
  if (delErr) throw delErr;

  if (gatilhos.length > 0) {
    const { error: insErr } = await supabase.from("estoque_regra_leads").insert(
      gatilhos.map((g, i) => ({
        regra_id: regraId,
        leads_min: g.leads_min,
        leads_max: g.leads_max,
        percentual: g.percentual,
        ordem: i,
      })) as never,
    );
    if (insErr) throw insErr;
  }
}

/* --------------------------------- Veículos --------------------------------- */

export async function getVeiculos(opts: {
  lixeira?: boolean;
  repasse?: boolean;
  vendidos?: boolean;
}): Promise<Veiculo[]> {
  // Ordenação estável (campo + id) para não repetir/pular linhas entre blocos.
  return buscarTodos<Veiculo>(() => {
    let q = supabase
      .from("estoque_veiculos")
      .select("*")
      .order("dias_em_estoque", { ascending: false })
      .order("id", { ascending: true });
    q = opts.lixeira ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    if (!opts.lixeira) {
      if (opts.vendidos) {
        q = q.eq("em_vendido", true);
      } else {
        q = q.eq("em_vendido", false).eq("em_repasse", !!opts.repasse);
      }
    }
    return q as unknown as QueryPaginavel;
  });
}

export async function getVendas(): Promise<VendaHistorica[]> {
  return buscarTodos<VendaHistorica>(
    () =>
      supabase
        .from("estoque_vendas_historico")
        .select("id,chassi,codigo_fipe,ano_modelo,km,data_venda,valor_venda")
        .is("deleted_at", null)
        .order("data_venda", { ascending: false })
        .order("id", { ascending: true }) as unknown as QueryPaginavel,
  );
}

/** Registro completo de venda histórica (aba "Vendas Históricas"). */
export interface VendaHistoricoRow {
  id: string;
  chassi: string | null;
  placa: string | null;
  modelo: string | null;
  versao: string | null;
  ano_modelo: string | null;
  km: number | null;
  codigo_fipe: string | null;
  data_venda: string | null;
  valor_venda: number | null;
  valor_custo: number | null;
  valor_imposto: number | null;
  lucro_bruto: number | null;
  dias_em_estoque: number | null;
  regional: string | null;
  loja: string | null;
  vendedor: string | null;
  nome_cliente: string | null;
  finalidade: string | null;
  deleted_at: string | null;
}

export async function getVendasHistorico(opts: { lixeira?: boolean } = {}): Promise<
  VendaHistoricoRow[]
> {
  return buscarTodos<VendaHistoricoRow>(() => {
    let q = supabase
      .from("estoque_vendas_historico")
      .select("*")
      .order("data_venda", { ascending: false })
      .order("id", { ascending: true });
    q = opts.lixeira ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    return q as unknown as QueryPaginavel;
  });
}

export async function atualizarVenda(
  id: string,
  patch: Partial<Omit<VendaHistoricoRow, "id" | "deleted_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("estoque_vendas_historico")
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function moverVendaParaLixeira(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_vendas_historico")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function restaurarVenda(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_vendas_historico")
    .update({ deleted_at: null } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function getAnuncios(): Promise<Anuncio[]> {
  return buscarTodos<Anuncio>(
    () =>
      supabase
        .from("estoque_anuncios")
        .select("id,chassi,canal_site_proprio,canal_olx,canal_webmotors,preco_venda,status")
        .is("deleted_at", null)
        .order("id", { ascending: true }) as unknown as QueryPaginavel,
  );
}

/** Anúncios usados pela checagem de mercado (média por canal de referência). */
export async function getAnunciosMercado(): Promise<AnuncioMercado[]> {
  return buscarTodos<AnuncioMercado>(
    () =>
      supabase
        .from("estoque_anuncios")
        .select("chassi,modelo,ano_modelo,preco_venda,canal_site_proprio,canal_olx,canal_webmotors")
        .is("deleted_at", null)
        .order("id", { ascending: true }) as unknown as QueryPaginavel,
  );
}


/** Registro completo de veículo anunciado (aba "Veículos Anunciados"). */
export interface AnuncioRow {
  id: string;
  chassi: string;
  codigo: string | null;
  conta: string | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  cor: string | null;
  km: number | null;
  preco_venda: number | null;
  qtd_fotos: number | null;
  status: string | null;
  canal_site_proprio: boolean;
  canal_olx: boolean;
  canal_webmotors: boolean;
  deleted_at: string | null;
}

export async function getAnunciosCompletos(opts: { lixeira?: boolean } = {}): Promise<AnuncioRow[]> {
  return buscarTodos<AnuncioRow>(() => {
    let q = supabase
      .from("estoque_anuncios")
      .select("*")
      .order("importado_em", { ascending: false })
      .order("id", { ascending: true });
    q = opts.lixeira ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    return q as unknown as QueryPaginavel;
  });
}

export async function atualizarAnuncio(
  id: string,
  patch: Partial<Omit<AnuncioRow, "id" | "deleted_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("estoque_anuncios")
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function moverAnuncioParaLixeira(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_anuncios")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function restaurarAnuncio(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_anuncios")
    .update({ deleted_at: null } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function getUltimoHistorico(veiculoIds: string[]): Promise<Map<string, HistoricoValor>> {
  if (veiculoIds.length === 0) return new Map();
  const data: HistoricoValor[] = [];
  // Filtro `in` em blocos, e cada bloco paginado (o histórico tem várias linhas por veículo).
  for (let i = 0; i < veiculoIds.length; i += 300) {
    const chunk = veiculoIds.slice(i, i + 300);
    const linhas = await buscarTodos<HistoricoValor>(
      () =>
        supabase
          .from("estoque_valor_historico")
          .select("*")
          .in("veiculo_id", chunk)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }) as unknown as QueryPaginavel,
    );
    data.push(...linhas);
  }
  const map = new Map<string, HistoricoValor>();
  for (const h of data) {
    if (!map.has(h.veiculo_id)) map.set(h.veiculo_id, h);
  }
  return map;
}

export async function moverParaLixeira(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_veiculos")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function restaurarVeiculo(id: string): Promise<void> {
  const { error } = await supabase
    .from("estoque_veiculos")
    .update({ deleted_at: null } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function excluirDefinitivo(id: string): Promise<void> {
  const { error } = await supabase.from("estoque_veiculos").delete().eq("id", id);
  if (error) throw error;
}

/** Campos do veículo que vêm da importação e podem ser editados manualmente. */
export type CampoEditavel =
  | "modelo"
  | "loja"
  | "regional"
  | "ano_mod"
  | "cor"
  | "placa"
  | "km"
  | "custo_total"
  | "valor_anunciado_planilha"
  | "fipe"
  | "percentual_fipe_planilha"
  | "dias_em_estoque"
  | "fotos_qtd"
  | "leads_60_dias"
  | "classificacao"
  | "codigo_fipe"
  | "finalidade"
  | "finalidade_atual"
  | "chassi"
  | "chassi_resumido"
  | "valor_anuncio_calculado";

/**
 * Persiste a edição manual do veículo e acumula em `campos_manuais` os campos
 * tocados pelo usuário, para diferenciá-los do dado vindo da importação.
 */
export async function atualizarVeiculo(
  veiculo: Veiculo,
  patch: Partial<Record<CampoEditavel, unknown>>,
): Promise<void> {
  const alterados = (Object.keys(patch) as CampoEditavel[]).filter(
    (k) => (patch[k] ?? null) !== ((veiculo as unknown as Record<string, unknown>)[k] ?? null),
  );
  const manuais = new Set([...(veiculo.campos_manuais ?? []), ...alterados]);

  const { error } = await supabase
    .from("estoque_veiculos")
    .update({
      ...patch,
      campos_manuais: [...manuais],
      editado_em: new Date().toISOString(),
    } as never)
    .eq("id", veiculo.id);
  if (error) throw error;
}



/* ------------------------------ Tarefas de leads ----------------------------- */

export async function getTarefasLead(): Promise<TarefaLead[]> {
  return buscarTodos<TarefaLead>(
    () =>
      supabase
        .from("estoque_tarefas_lead")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true }) as unknown as QueryPaginavel,
  );
}

export async function marcarTarefa(id: string, concluido: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("estoque_tarefas_lead")
    .update({
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
      concluido_por: concluido ? (auth.user?.id ?? null) : null,
    } as never)
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------ Ações da matriz ------------------------------ */

export interface AcaoMatrizRegistro {
  id: string;
  veiculo_id: string;
  tipo_acao: TipoAcaoMatriz;
  concluido: boolean;
  concluido_em: string | null;
}

export async function getAcoesMatriz(): Promise<AcaoMatrizRegistro[]> {
  return buscarTodos<AcaoMatrizRegistro>(
    () =>
      supabase
        .from("estoque_acoes_matriz")
        .select("id,veiculo_id,tipo_acao,concluido,concluido_em")
        .order("id", { ascending: true }) as unknown as QueryPaginavel,
  );
}

/** Marca (ou desmarca) que a ação operacional já foi executada para o veículo. */
export async function marcarAcaoMatriz(
  veiculoId: string,
  tipo: TipoAcaoMatriz,
  concluido: boolean,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("estoque_acoes_matriz").upsert(
    {
      veiculo_id: veiculoId,
      tipo_acao: tipo,
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
      concluido_por: concluido ? (auth.user?.id ?? null) : null,
    } as never,
    { onConflict: "veiculo_id,tipo_acao" },
  );
  if (error) throw error;
}

export { ACOES_MATRIZ };


/* -------------------------------- Recálculo --------------------------------- */

export interface ResumoRecalculo {
  analisados: number;
  alterados: number;
  repasse: number;
  tarefas: number;
}

/** Roda o motor sobre todos os veículos ativos e persiste valores, auditoria e tarefas. */
export async function recalcularTodos(
  opts: { forcar?: boolean; veiculoId?: string } = {},
): Promise<ResumoRecalculo> {
  const [todos, faixas, regras, vendas, anunciosMercado, faixasKm] = await Promise.all([
    getVeiculos({}),
    getFaixas(),
    getRegras(),
    getVendas(),
    getAnunciosMercado(),
    getFaixasKm(),
  ]);

  const veiculos = opts.veiculoId ? todos.filter((v) => v.id === opts.veiculoId) : todos;

  const resumo: ResumoRecalculo = { analisados: veiculos.length, alterados: 0, repasse: 0, tarefas: 0 };

  for (const v of veiculos) {
    const r = calcularValorAnuncio(v, faixas, regras, vendas, {
      anuncios: anunciosMercado,
      faixasKm,
      forcar: opts.forcar === true,
    });
    if (!r.alterou) continue;



    if (r.moverParaRepasse) {
      const { error } = await supabase
        .from("estoque_veiculos")
        .update({
          em_repasse: true,
          finalidade_atual: r.novaFinalidade,
          faixa_id_atual: r.faixa?.id ?? null,
          ultimo_calculo_em: new Date().toISOString(),
        } as never)
        .eq("id", v.id);
      if (error) throw error;
      resumo.repasse += 1;
      continue;
    }

    const { error } = await supabase
      .from("estoque_veiculos")
      .update({
        valor_anuncio_calculado: r.valorNovo,
        faixa_id_atual: r.faixa?.id ?? null,
        ultimo_calculo_em: new Date().toISOString(),
      } as never)
      .eq("id", v.id);
    if (error) throw error;

    await supabase.from("estoque_valor_historico").insert({
      veiculo_id: v.id,
      valor_anterior: r.valorAnterior,
      valor_novo: r.valorNovo,
      classificacao: v.classificacao,
      faixa_nome: r.faixa?.nome ?? null,
      regra_tipo: r.tipo,
      percentual: r.percentual,
      memoria_calculo: { ...r.memoria, motivo: r.motivo },
    } as never);
    resumo.alterados += 1;

    if (r.geraTarefa && r.nomeTarefa) {
      const { data: existente } = await supabase
        .from("estoque_tarefas_lead")
        .select("id")
        .eq("veiculo_id", v.id)
        .eq("nome", r.nomeTarefa)
        .eq("faixa_nome", r.faixa?.nome ?? "")
        .maybeSingle();
      if (!existente) {
        await supabase.from("estoque_tarefas_lead").insert({
          veiculo_id: v.id,
          regra_id: r.regra?.id ?? null,
          faixa_nome: r.faixa?.nome ?? null,
          nome: r.nomeTarefa,
        } as never);
        resumo.tarefas += 1;
      }
    }
  }

  return resumo;
}

export { faixaDoVeiculo };

/* -------------------------------- Importações -------------------------------- */

export function toNumber(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const limpo = String(valor)
    .replace(/[R$\s%]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export function toInt(valor: unknown): number | null {
  const n = toNumber(valor);
  return n == null ? null : Math.round(n);
}

export function toText(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" ? null : s;
}

/**
 * Lê a coluna "Ano Modelo" da planilha de vendas.
 *
 * Armadilha: quando a célula contém apenas o ano (ex.: 2021) com formato de
 * data, o Excel a armazena como serial N e a leitura com cellDates devolve um
 * Date em ~1905 (serial 2021 = 16/07/1905). Aqui revertemos o serial de volta
 * ao ano original; textos como "2021/2022" passam intactos.
 */
export function toAnoModelo(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  const serialParaAno = (serial: number): string | null =>
    serial >= 1900 && serial <= 2100 ? String(Math.round(serial)) : null;
  const dataParaAno = (d: Date): string | null => {
    if (Number.isNaN(d.getTime())) return null;
    // Usa componentes locais: xlsx cria a data em horário local.
    const utcMeiaNoite = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return serialParaAno(Math.round((utcMeiaNoite - Date.UTC(1899, 11, 30)) / 86400000));
  };
  if (valor instanceof Date) return dataParaAno(valor);
  if (typeof valor === "number" && Number.isFinite(valor)) return serialParaAno(Math.round(valor));
  const texto = toText(valor);
  if (!texto) return null;
  // Strings de data (ex.: "Mon Jul 17 1905 00:00:00 GMT-0300") também são
  // seriais disfarçados — revertidos ao ano original.
  if (/\b19(0[0-9]|1[0-9])\b/.test(texto) && /[a-z]{3}\s+[a-z]{3}\s+\d{1,2}/i.test(texto)) {
    const d = new Date(texto);
    const ano = dataParaAno(d);
    if (ano) return ano;
  }
  if (/^\d{4}$/.test(texto)) return texto;
  return texto;
}


/** Converte serial de data do Excel (base 1899-12-30) em ISO yyyy-mm-dd. */
function serialExcelParaIso(serial: number): string | null {
  // Faixa plausível: 1900-01-01 (2) até 2100-01-01 (~73051).
  if (!Number.isFinite(serial) || serial < 2 || serial > 80000) return null;
  const ms = Math.round(serial * 86400000);
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Garante que a data resultante é plausível — evita anos absurdos no Postgres. */
function isoPlausivel(iso: string | null): string | null {
  if (!iso) return null;
  const ano = Number(iso.slice(0, 4));
  return ano >= 1900 && ano <= 2100 ? iso : null;
}

export function toDate(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date)
    return Number.isNaN(valor.getTime()) ? null : isoPlausivel(valor.toISOString().slice(0, 10));
  // Números (e strings puramente numéricas) são seriais do Excel, não anos.
  if (typeof valor === "number") return isoPlausivel(serialExcelParaIso(valor));
  const s = String(valor).trim();
  if (/^\d+([.,]\d+)?$/.test(s)) {
    return isoPlausivel(serialExcelParaIso(Number(s.replace(",", "."))));
  }
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return isoPlausivel(`${br[3]}-${br[2]}-${br[1]}`);
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return isoPlausivel(iso[0]);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : isoPlausivel(d.toISOString().slice(0, 10));
}

/**
 * Busca o valor de uma coluna aceitando variações de acento/caixa/espaço.
 *
 * O "%" é convertido em "pct" ANTES de remover os não-alfanuméricos: sem isso
 * "% Fipe" e "Fipe" colapsariam na mesma chave e o percentual sobrescreveria
 * o valor FIPE oficial da planilha.
 */
export function coluna(linha: Record<string, unknown>, ...nomes: string[]): unknown {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/%/g, "pct")
      .replace(/[^a-z0-9]/g, "");
  const mapa = new Map<string, unknown>();
  for (const [k, v] of Object.entries(linha)) {
    const chave = norm(k);
    // Primeira ocorrência vence: evita que colunas auxiliares homônimas
    // sobrescrevam a coluna principal.
    if (!mapa.has(chave)) mapa.set(chave, v);
  }
  for (const nome of nomes) {
    const v = mapa.get(norm(nome));
    if (v !== undefined) return v;
  }
  return undefined;
}


function canalPublicado(valor: unknown): boolean {
  const s = String(valor ?? "").toLowerCase();
  if (!s) return false;
  return /(sim|ativo|public|online|true|1)/.test(s);
}

export async function uploadPlanilhaImportacao(
  tipo: "estoque" | "vendas" | "anuncios",
  file: File,
): Promise<string | null> {
  try {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${tipo}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from("estoque-importacoes")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    return path;
  } catch {
    // O arquivo é um artefato de auditoria: falha no upload não deve abortar a importação.
    return null;
  }
}

export async function getUrlPlanilhaImportacao(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("estoque-importacoes")
    .createSignedUrl(path, 60 * 5, { download: true });
  if (error || !data?.signedUrl) throw error ?? new Error("Não foi possível gerar o link.");
  return data.signedUrl;
}

export async function registrarImportacao(
  tipo: "estoque" | "vendas" | "anuncios",
  arquivoNome: string,
  rel: RelatorioImportacao,
  arquivoPath?: string | null,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("estoque_importacoes").insert({
    tipo,
    arquivo_nome: arquivoNome,
    arquivo_path: arquivoPath ?? null,
    total_linhas: rel.totalLinhas,
    total_importados: rel.importados,
    total_atualizados: rel.atualizados,
    total_ignorados: rel.ignorados.length,
    relatorio: rel.ignorados,
    user_id: auth.user?.id ?? null,
  } as never);
}


export async function importarEstoque(
  linhas: Record<string, unknown>[],
): Promise<RelatorioImportacao> {
  const [origens, empresas, finalidades, ativos, vendas] = await Promise.all([
    getOrigens(),
    getEmpresasNbs(),
    getFinalidades(),
    // Somente registros ATIVOS (Estoque, Repasse e Vendidos) entram na checagem
    // de duplicidade. A lixeira nunca é consultada — o índice único do banco é
    // parcial (`where deleted_at is null`), então reimportar é sempre permitido.
    buscarTodos<{
      id: string;
      chassi: string;
      origem_id: string;
      chassi_resumido: string;
      em_vendido: boolean;
      importado_em: string | null;
    }>(
      () =>
        supabase
          .from("estoque_veiculos")
          .select("id,chassi,origem_id,chassi_resumido,em_vendido,importado_em")
          .is("deleted_at", null)
          .order("id", { ascending: true }) as unknown as QueryPaginavel,
    ),
    // Vendas históricas: identificam os veículos vendidos (categoria Vendidos).
    buscarTodos<{ chassi: string | null; data_venda: string | null }>(
      () =>
        supabase
          .from("estoque_vendas_historico")
          .select("id,chassi,data_venda")
          .is("deleted_at", null)
          .order("id", { ascending: true }) as unknown as QueryPaginavel,
    ),
  ]);

  /** Maior data de venda por chassi — uma venda só casa com a compra se for
   *  posterior à entrada dela no estoque (importado_em do registro). */
  const vendaMaxPorChassi = new Map<string, string>();
  for (const v of vendas) {
    if (!v.chassi || !v.data_venda) continue;
    const atual = vendaMaxPorChassi.get(v.chassi);
    if (!atual || v.data_venda > atual) vendaMaxPorChassi.set(v.chassi, v.data_venda);
  }




  const rel: RelatorioImportacao = {
    totalLinhas: linhas.length,
    importados: 0,
    atualizados: 0,
    novasCompras: 0,
    ignorados: [],
  };

  const finalidadesOk = finalidades
    .filter((f) => f.ativo)
    .map((f) => f.nome.trim().toLowerCase());

  /**
   * Índice de duplicidade escopado por ORIGEM (base NBS).
   * Chave: `${chassi}|${origem_id}` → lista de chassis resumidos ativos.
   * Nunca comparamos chassi resumido entre origens diferentes.
   */
  const porChassiOrigem = new Map<
    string,
    { id: string; chassi_resumido: string; em_vendido: boolean; importado_em: string | null }[]
  >();
  for (const v of ativos) {
    const chave = `${v.chassi}|${v.origem_id}`;
    const lista = porChassiOrigem.get(chave) ?? [];
    lista.push({
      id: v.id,
      chassi_resumido: v.chassi_resumido,
      em_vendido: v.em_vendido,
      importado_em: v.importado_em,
    });
    porChassiOrigem.set(chave, lista);
  }

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]!;
    const numeroLinha = i + 2;
    const chassi = toText(coluna(l, "Chassi"));
    const codigoOrigem = toInt(coluna(l, "Origem"));
    const chassiResumido = toText(coluna(l, "ChassiResumido", "Chassi Resumido"));
    const finalidade = toText(coluna(l, "Finalidade"));

    if (!chassi) {
      rel.ignorados.push({ linha: numeroLinha, motivo: "Chassi não informado" });
      continue;
    }
    if (codigoOrigem == null || !chassiResumido) {
      rel.ignorados.push({
        linha: numeroLinha,
        chassi,
        motivo: "Origem ou Chassi Resumido não preenchidos",
      });
      continue;
    }
    if (finalidadesOk.length > 0 && !finalidadesOk.includes((finalidade ?? "").toLowerCase())) {
      rel.ignorados.push({
        linha: numeroLinha,
        chassi,
        motivo: `Finalidade "${finalidade ?? "-"}" não permitida para importação`,
      });
      continue;
    }
    const origem = origens.find((o) => o.codigo === codigoOrigem);
    if (!origem) {
      rel.ignorados.push({
        linha: numeroLinha,
        chassi,
        motivo: `Origem não cadastrada: código ${codigoOrigem}`,
      });
      continue;
    }
    // A empresa NBS é derivada da origem (base), nunca do chassi resumido.
    const empresasDaOrigem = empresas.filter((e) => e.origem_id === origem.id && e.ativo);
    const empresa = empresasDaOrigem.length === 1 ? empresasDaOrigem[0]! : null;


    const registro = {
      chassi,
      origem_id: origem.id,
      chassi_resumido: chassiResumido,
      empresa_nbs_id: empresa?.id ?? null,
      regional: toText(coluna(l, "Regional")),
      loja: toText(coluna(l, "Loja")),
      modelo: toText(coluna(l, "Modelo")),
      ano_mod: toText(coluna(l, "Ano/Mod", "Ano Mod", "AnoMod")),
      cor: toText(coluna(l, "Cor")),
      placa: toText(coluna(l, "Placa")),
      km: toInt(coluna(l, "Km")),
      custo_total: toNumber(coluna(l, "Custo Total")),
      valor_anunciado_planilha: toNumber(coluna(l, "Valor Anunciado")),
      fipe: toNumber(coluna(l, "Fipe")),
      percentual_fipe_planilha: toNumber(coluna(l, "% Fipe")),
      dias_em_estoque: toInt(coluna(l, "Dias Em Estoque")) ?? 0,
      fotos_qtd: toInt(coluna(l, "Fotos (QNT)", "Fotos")),
      leads_60_dias: toInt(coluna(l, "Leads 60 Dias")) ?? 0,
      classificacao: toText(coluna(l, "Classificação", "Classificacao")),
      acao_planilha: toText(coluna(l, "Ação", "Acao")),
      codigo_fipe: toText(coluna(l, "Codigo Fipe", "Código Fipe")),
      finalidade,
      importado_em: new Date().toISOString(),
      deleted_at: null,
    };

    const chave = `${chassi}|${origem.id}`;
    const ativosDoChassi = porChassiOrigem.get(chave) ?? [];
    const mesmoRegistro = ativosDoChassi.find((v) => v.chassi_resumido === chassiResumido);

    if (mesmoRegistro) {
      // Mesma compra já registrada nessa origem → atualiza e movimenta a categoria.
      // Uma venda só casa com esta compra se aconteceu depois da entrada no estoque.
      const dataVenda = vendaMaxPorChassi.get(chassi);
      const entradaDia = (mesmoRegistro.importado_em ?? "").slice(0, 10);
      const vendeu = !!dataVenda && !!entradaDia && dataVenda >= entradaDia;

      const patch: Record<string, unknown> = { ...registro };
      if (vendeu && !mesmoRegistro.em_vendido) patch.em_vendido = true;
      else if (!vendeu && mesmoRegistro.em_vendido) patch.em_vendido = false;

      const { error } = await supabase
        .from("estoque_veiculos")
        .update(patch as never)
        .eq("id", mesmoRegistro.id);
      if (error) {
        rel.ignorados.push({ linha: numeroLinha, chassi, motivo: error.message });
        continue;
      }
      if (vendeu && !mesmoRegistro.em_vendido) {
        // Venda localizada na planilha de vendas → categoria Vendidos.
        mesmoRegistro.em_vendido = true;
        rel.movidosVendidos = (rel.movidosVendidos ?? 0) + 1;
      } else if (!vendeu && mesmoRegistro.em_vendido) {
        // Reapareceu no estoque sem venda correspondente → venda cancelada.
        mesmoRegistro.em_vendido = false;
        rel.vendasCanceladas = (rel.vendasCanceladas ?? 0) + 1;
        rel.atualizados += 1;
      } else {
        rel.atualizados += 1;
      }
      continue;
    }

    // A lixeira não participa da checagem: registro excluído não bloqueia o novo.


    // Chassi resumido diferente (ou inexistente) na origem → nova compra = novo registro.

    const { data: inserido, error } = await supabase
      .from("estoque_veiculos")
      .insert(registro as never)
      .select("id")
      .single();
    if (error) {
      rel.ignorados.push({ linha: numeroLinha, chassi, motivo: error.message });
      continue;
    }
    ativosDoChassi.push({
      id: (inserido as { id: string }).id,
      chassi_resumido: chassiResumido,
      em_vendido: false,
      importado_em: registro.importado_em,
    });
    porChassiOrigem.set(chave, ativosDoChassi);
    rel.importados += 1;
    if (ativosDoChassi.length > 1) rel.novasCompras = (rel.novasCompras ?? 0) + 1;
  }

  return rel;
}

export type ProgressoImportacao = (info: {
  processadas: number;
  total: number;
  fase: "lendo" | "enviando";
}) => void;

/** Tamanho do lote de upsert. Evita milhares de requisições sequenciais. */
const LOTE = 300;

export async function importarVendas(
  linhas: Record<string, unknown>[],
  onProgress?: ProgressoImportacao,
): Promise<RelatorioImportacao> {
  const rel: RelatorioImportacao = {
    totalLinhas: linhas.length,
    importados: 0,
    atualizados: 0,
    ignorados: [],
  };

  // 1) Normalização + validação (sem I/O)
  const registros: { numeroLinha: number; chassi: string; registro: Record<string, unknown> }[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]!;
    const numeroLinha = i + 2;
    const chassi = toText(coluna(l, "Chassi"));
    const dataVenda = toDate(coluna(l, "Data da Venda"));
    const valorVenda = toNumber(coluna(l, "Valor da Venda"));
    if (!chassi || !dataVenda || valorVenda == null) {
      rel.ignorados.push({
        linha: numeroLinha,
        chassi: chassi ?? undefined,
        motivo: "Chassi, Data da Venda ou Valor da Venda ausentes",
      });
      continue;
    }
    registros.push({
      numeroLinha,
      chassi,
      registro: {
        regional: toText(coluna(l, "Regional")),
        loja: toText(coluna(l, "Loja")),
        vendedor: toText(coluna(l, "Vendedor")),
        nome_cliente: toText(coluna(l, "Nome Cliente")),
        placa: toText(coluna(l, "Placa")),
        modelo: toText(coluna(l, "Modelo")),
        versao: toText(coluna(l, "Versao", "Versão")),
        km: toInt(coluna(l, "Km")),
        ano_modelo: toAnoModelo(coluna(l, "Ano Modelo", "Ano/Mod", "Ano Mod", "AnoModelo")),
        finalidade: toText(coluna(l, "Finalidade")),
        data_venda: dataVenda,
        valor_venda: valorVenda,
        valor_custo: toNumber(coluna(l, "Valor de Custo")),
        valor_imposto: toNumber(coluna(l, "Valor de Imposto")),
        lucro_bruto: toNumber(coluna(l, "Lucro Bruto")),
        dias_em_estoque: toInt(coluna(l, "Dias Em Estoque")),
        chassi,
        codigo_fipe: toText(coluna(l, "Código Fipe", "Codigo Fipe")),
      },
    });
    if (i % 500 === 0) onProgress?.({ processadas: i, total: linhas.length, fase: "lendo" });
  }

  // 2) Deduplicação pela chave de conflito (upsert em lote falha com duplicatas internas)
  const unicos = new Map<string, (typeof registros)[number]>();
  for (const r of registros) {
    const chave = `${r.registro['chassi']}|${r.registro['data_venda']}|${r.registro['valor_venda']}`;
    unicos.set(chave, r);
  }
  const finais = [...unicos.values()];

  // 3) Envio em lotes
  let enviadas = 0;
  for (let i = 0; i < finais.length; i += LOTE) {
    const lote = finais.slice(i, i + LOTE);
    const { error } = await supabase
      .from("estoque_vendas_historico")
      .upsert(lote.map((r) => r.registro) as never, {
        onConflict: "chassi,data_venda,valor_venda",
      });
    if (error) {
      // Fallback linha a linha para identificar exatamente o que falhou no lote
      for (const r of lote) {
        const { error: e2 } = await supabase
          .from("estoque_vendas_historico")
          .upsert(r.registro as never, { onConflict: "chassi,data_venda,valor_venda" });
        if (e2) rel.ignorados.push({ linha: r.numeroLinha, chassi: r.chassi, motivo: e2.message });
        else rel.importados += 1;
      }
    } else {
      rel.importados += lote.length;
    }
    enviadas += lote.length;
    onProgress?.({ processadas: enviadas, total: finais.length, fase: "enviando" });
  }

  // 4) Move para "Vendidos" os veículos ativos (Estoque/Repasse) cuja compra foi
  //    vendida: a venda só casa com o registro se data_venda >= importado_em dele.
  const dataMaxPorChassi = new Map<string, string>();
  for (const r of finais) {
    const dv = r.registro["data_venda"] as string;
    const atual = dataMaxPorChassi.get(r.chassi);
    if (!atual || dv > atual) dataMaxPorChassi.set(r.chassi, dv);
  }
  const chassisImportados = [...new Set(finais.map((r) => r.chassi))];
  for (let i = 0; i < chassisImportados.length; i += 200) {
    const chunk = chassisImportados.slice(i, i + 200);
    const { data: ativos, error: errAtivos } = await supabase
      .from("estoque_veiculos")
      .select("id,chassi,importado_em")
      .is("deleted_at", null)
      .eq("em_vendido", false)
      .in("chassi", chunk);
    if (errAtivos) throw errAtivos;
    // Compra mais recente elegível por chassi.
    const porChassi = new Map<string, { id: string; importado_em: string }>();
    for (const v of (ativos ?? []) as { id: string; chassi: string; importado_em: string }[]) {
      const dv = dataMaxPorChassi.get(v.chassi);
      if (!dv || dv < (v.importado_em ?? "").slice(0, 10)) continue;
      const atual = porChassi.get(v.chassi);
      if (!atual || v.importado_em > atual.importado_em) porChassi.set(v.chassi, v);
    }
    for (const v of porChassi.values()) {
      const { error } = await supabase
        .from("estoque_veiculos")
        .update({ em_vendido: true } as never)
        .eq("id", v.id);
      if (!error) rel.movidosVendidos = (rel.movidosVendidos ?? 0) + 1;
    }
  }

  return rel;
}


export async function importarAnuncios(
  linhas: Record<string, unknown>[],
): Promise<RelatorioImportacao> {
  const rel: RelatorioImportacao = {
    totalLinhas: linhas.length,
    importados: 0,
    atualizados: 0,
    ignorados: [],
  };

  // Substituição total: a base de anúncios reflete SEMPRE a última importação.
  const { error: delErro } = await supabase
    .from("estoque_anuncios")
    .delete()
    .not("id", "is", null);
  if (delErro) throw delErro;



  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]!;
    const numeroLinha = i + 2;
    const chassi = toText(coluna(l, "Chassi"));
    if (!chassi) {
      rel.ignorados.push({ linha: numeroLinha, motivo: "Chassi não informado" });
      continue;
    }
    const registro = {
      chassi,
      codigo: toText(coluna(l, "Código", "Codigo")),
      conta: toText(coluna(l, "Conta")),
      placa: toText(coluna(l, "Placa")),
      marca: toText(coluna(l, "Marca")),
      modelo: toText(coluna(l, "Modelo")),
      versao: toText(coluna(l, "Versão", "Versao")),
      ano_fabricacao: toText(coluna(l, "Ano de fabricação", "Ano de fabricacao")),
      ano_modelo: toText(coluna(l, "Ano modelo")),
      cor: toText(coluna(l, "Cor")),
      km: toInt(coluna(l, "Km")),
      preco_venda: toNumber(coluna(l, "Preço de venda", "Preco de venda")),
      qtd_fotos: toInt(coluna(l, "Qtd. fotos", "Qtd fotos")),
      status: toText(coluna(l, "Status")),
      canal_site_proprio: canalPublicado(coluna(l, "Autoforce")),
      canal_olx: canalPublicado(coluna(l, "Olx")),
      canal_webmotors: canalPublicado(coluna(l, "WebMotors")),
      plataformas: {
        stellantis: toText(coluna(l, "Stellantis")),
        webmotors: toText(coluna(l, "WebMotors")),
        olx: toText(coluna(l, "Olx")),
        autoforce: toText(coluna(l, "Autoforce")),
        seminovos_toyota: toText(coluna(l, "Seminovos Toyota")),
        carmera: toText(coluna(l, "Carmera")),
        instagram: toText(coluna(l, "Instagram")),
        dealerspace: toText(coluna(l, "DealerSpace (Site da Loja)", "DealerSpace")),
        impel: toText(coluna(l, "Impel")),
      },
      dados: l as Record<string, unknown>,
      importado_em: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("estoque_anuncios")
      .upsert(registro as never, { onConflict: "chassi" });
    if (error) {
      rel.ignorados.push({ linha: numeroLinha, chassi, motivo: error.message });
      continue;
    }
    rel.importados += 1;
  }

  return rel;
}
