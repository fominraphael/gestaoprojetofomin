/**
 * Camada de dados do módulo Análise de Estoque (Matriz).
 * Acesso via cliente do navegador (o módulo roda inteiro em rota autenticada).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  calcularValorAnuncio,
  faixaDoVeiculo,
  type ClassificacaoEstoque,
  type FaixaDias,
  type GatilhoLeads,
  type RegraEstoque,
  type VendaHistorica,
} from "./estoque-motor";

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
  ultimo_calculo_em: string | null;
  deleted_at: string | null;
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

export async function getRegras(): Promise<RegraEstoque[]> {
  const [{ data: regras, error }, { data: leads, error: e2 }] = await Promise.all([
    supabase.from("estoque_regras").select("*"),
    supabase.from("estoque_regra_leads").select("*").order("ordem"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  return ((regras ?? []) as unknown as RegraEstoque[]).map((r) => ({
    ...r,
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
}): Promise<Veiculo[]> {
  let q = supabase.from("estoque_veiculos").select("*").order("dias_em_estoque", { ascending: false });
  q = opts.lixeira ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  if (!opts.lixeira) q = q.eq("em_repasse", !!opts.repasse);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Veiculo[];
}

export async function getVendas(): Promise<VendaHistorica[]> {
  const { data, error } = await supabase
    .from("estoque_vendas_historico")
    .select("id,chassi,codigo_fipe,ano_modelo,km,data_venda,valor_venda")
    .order("data_venda", { ascending: false })
    .limit(20000);
  if (error) throw error;
  return (data ?? []) as unknown as VendaHistorica[];
}

export async function getAnuncios(): Promise<Anuncio[]> {
  const { data, error } = await supabase
    .from("estoque_anuncios")
    .select("id,chassi,canal_site_proprio,canal_olx,canal_webmotors,preco_venda,status");
  if (error) throw error;
  return (data ?? []) as unknown as Anuncio[];
}

export async function getUltimoHistorico(veiculoIds: string[]): Promise<Map<string, HistoricoValor>> {
  if (veiculoIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("estoque_valor_historico")
    .select("*")
    .in("veiculo_id", veiculoIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map = new Map<string, HistoricoValor>();
  for (const h of (data ?? []) as unknown as HistoricoValor[]) {
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

/* ------------------------------ Tarefas de leads ----------------------------- */

export async function getTarefasLead(): Promise<TarefaLead[]> {
  const { data, error } = await supabase
    .from("estoque_tarefas_lead")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TarefaLead[];
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

/* -------------------------------- Recálculo --------------------------------- */

export interface ResumoRecalculo {
  analisados: number;
  alterados: number;
  repasse: number;
  tarefas: number;
}

/** Roda o motor sobre todos os veículos ativos e persiste valores, auditoria e tarefas. */
export async function recalcularTodos(): Promise<ResumoRecalculo> {
  const [veiculos, faixas, regras, vendas] = await Promise.all([
    getVeiculos({}),
    getFaixas(),
    getRegras(),
    getVendas(),
  ]);

  const resumo: ResumoRecalculo = { analisados: veiculos.length, alterados: 0, repasse: 0, tarefas: 0 };

  for (const v of veiculos) {
    const r = calcularValorAnuncio(v, faixas, regras, vendas);
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

export function toDate(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const s = String(valor).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Busca o valor de uma coluna aceitando variações de acento/caixa/espaço. */
export function coluna(linha: Record<string, unknown>, ...nomes: string[]): unknown {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const mapa = new Map<string, unknown>();
  for (const [k, v] of Object.entries(linha)) mapa.set(norm(k), v);
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

export async function registrarImportacao(
  tipo: "estoque" | "vendas" | "anuncios",
  arquivoNome: string,
  rel: RelatorioImportacao,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("estoque_importacoes").insert({
    tipo,
    arquivo_nome: arquivoNome,
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
  const [origens, empresas, finalidades, existentes] = await Promise.all([
    getOrigens(),
    getEmpresasNbs(),
    getFinalidades(),
    getVeiculos({}),
  ]);

  const rel: RelatorioImportacao = {
    totalLinhas: linhas.length,
    importados: 0,
    atualizados: 0,
    ignorados: [],
  };

  const finalidadesOk = finalidades
    .filter((f) => f.ativo)
    .map((f) => f.nome.trim().toLowerCase());
  const chaveExistente = new Set(
    existentes.map((v) => `${v.chassi}|${v.origem_id}|${v.chassi_resumido}`),
  );

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
    const empresa = empresas.find(
      (e) => e.origem_id === origem.id && e.codigo_chassi_resumido === chassiResumido,
    );
    if (!empresa) {
      rel.ignorados.push({
        linha: numeroLinha,
        chassi,
        motivo: `Empresa NBS não cadastrada para código ${chassiResumido} na origem ${origem.nome}`,
      });
      continue;
    }

    const registro = {
      chassi,
      origem_id: origem.id,
      chassi_resumido: chassiResumido,
      empresa_nbs_id: empresa.id,
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

    const { error } = await supabase
      .from("estoque_veiculos")
      .upsert(registro as never, { onConflict: "chassi,origem_id,chassi_resumido" });
    if (error) {
      rel.ignorados.push({ linha: numeroLinha, chassi, motivo: error.message });
      continue;
    }
    if (chaveExistente.has(`${chassi}|${origem.id}|${chassiResumido}`)) rel.atualizados += 1;
    else rel.importados += 1;
  }

  return rel;
}

export async function importarVendas(
  linhas: Record<string, unknown>[],
): Promise<RelatorioImportacao> {
  const rel: RelatorioImportacao = {
    totalLinhas: linhas.length,
    importados: 0,
    atualizados: 0,
    ignorados: [],
  };

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
    const registro = {
      regional: toText(coluna(l, "Regional")),
      loja: toText(coluna(l, "Loja")),
      vendedor: toText(coluna(l, "Vendedor")),
      nome_cliente: toText(coluna(l, "Nome Cliente")),
      placa: toText(coluna(l, "Placa")),
      modelo: toText(coluna(l, "Modelo")),
      versao: toText(coluna(l, "Versao", "Versão")),
      km: toInt(coluna(l, "Km")),
      ano_modelo: toText(coluna(l, "Ano Modelo")),
      finalidade: toText(coluna(l, "Finalidade")),
      data_venda: dataVenda,
      valor_venda: valorVenda,
      valor_custo: toNumber(coluna(l, "Valor de Custo")),
      valor_imposto: toNumber(coluna(l, "Valor de Imposto")),
      lucro_bruto: toNumber(coluna(l, "Lucro Bruto")),
      dias_em_estoque: toInt(coluna(l, "Dias Em Estoque")),
      chassi,
      codigo_fipe: toText(coluna(l, "Código Fipe", "Codigo Fipe")),
    };
    const { error } = await supabase
      .from("estoque_vendas_historico")
      .upsert(registro as never, { onConflict: "chassi,data_venda,valor_venda" });
    if (error) {
      rel.ignorados.push({ linha: numeroLinha, chassi, motivo: error.message });
      continue;
    }
    rel.importados += 1;
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
