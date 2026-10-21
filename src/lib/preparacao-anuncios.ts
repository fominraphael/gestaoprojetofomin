/**
 * Regras de negócio do módulo Pendências Preparação/Anúncios.
 * Funções puras (testáveis) + acesso a dados. O cruzamento é sempre pela PLACA.
 */
import { supabase } from "@/integrations/supabase/client";

export type TipoBase = "estoque" | "os" | "banco_fotos" | "gosystem" | "tcuv" | "auditoria";
export type IndicadorId = "os" | "foto" | "tcuv" | "auditoria";
export type StatusIndicador = "pendente" | "ok" | "aguardando" | "desabilitado" | "revisar";

export const INDICADORES: { id: IndicadorId; label: string }[] = [
  { id: "os", label: "OS" },
  { id: "foto", label: "Foto" },
  { id: "tcuv", label: "TCUV" },
  { id: "auditoria", label: "Auditoria" },
];

export const BASES: { tipo: TipoBase; titulo: string; descricao: string; colunaPlaca: string[] }[] = [
  { tipo: "estoque", titulo: "Estoque BI", descricao: "Universo de veículos. Placas ausentes na nova importação ficam inativas.", colunaPlaca: ["placa"] },
  { tipo: "os", titulo: "Pendências OS", descricao: "Já filtrada: placa presente = pendência de OS.", colunaPlaca: ["placa"] },
  { tipo: "banco_fotos", titulo: "Banco de Fotos", descricao: "De-para de placas (PLACA / PARA NOVA / PARA ANTIGA) e confirmação de foto.", colunaPlaca: ["placa"] },
  { tipo: "gosystem", titulo: "Fotografia Gosystem", descricao: "Registros do fotógrafo por placa.", colunaPlaca: ["placaarquivo", "placa"] },
  { tipo: "tcuv", titulo: "Pendências TCUV", descricao: "Pendente quando SOLICITADO tem data e RETORNO está vazio.", colunaPlaca: ["placa"] },
  { tipo: "auditoria", titulo: "Auditoria", descricao: "Pendente quando encontrado = NAO.", colunaPlaca: ["placa"] },
];

export interface ConfigIndicador {
  indicador: IndicadorId;
  habilitado: boolean;
  config: { min_fotos?: number; dias_gosystem?: number };
}
export interface Agrupamento { loja_origem: string; loja_canonica: string }
export interface Direcionamento { loja_sem_operacao: string; loja_responsavel: string }
export interface Responsavel { chave_tipo: "loja" | "regional"; chave: string; responsavel: string }
export interface LinhaBase { tipo: Exclude<TipoBase, "estoque">; placa: string; placa_alt: string | null; dados: Record<string, unknown> }

// ---------- Normalização ----------
export function normPlaca(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function normTexto(v: unknown): string {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}
function normChave(k: string): string {
  return k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
/** Lê uma coluna da linha ignorando acentos, maiúsculas e espaços. */
export function campo(linha: Record<string, unknown>, ...nomes: string[]): unknown {
  const alvos = nomes.map(normChave);
  for (const [k, v] of Object.entries(linha)) if (alvos.includes(normChave(k))) return v;
  return null;
}
export function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[R$\s%]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Converte para data válida. Números pequenos (ex.: "1" vindo de deslocamento de colunas)
 * são tratados como "sem data válida".
 */
export function dataValida(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return null; // fora da faixa de serial Excel plausível (1954–2119)
    return new Date(Math.round((v - 25569) * 86400000));
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const ano = Number(br[3]!.length === 2 ? `20${br[3]}` : br[3]);
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return dataValida(Number(s));
  return null;
}
function vazio(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

// ---------- Resolução de loja ----------
export interface LojaResolvida { bruta: string; direcionada: string; final: string }
export function resolverLoja(bruta: string | null, direc: Direcionamento[], agrup: Agrupamento[]): LojaResolvida {
  const b = normTexto(bruta);
  const d = direc.find((x) => normTexto(x.loja_sem_operacao) === b);
  const direcionada = d ? normTexto(d.loja_responsavel) : b;
  const a = agrup.find((x) => normTexto(x.loja_origem) === direcionada);
  return { bruta: b, direcionada, final: a ? normTexto(a.loja_canonica) : direcionada };
}
export function resolverResponsavel(lojaFinal: string, regional: string | null, resp: Responsavel[]): string | null {
  const porLoja = resp.find((r) => r.chave_tipo === "loja" && normTexto(r.chave) === lojaFinal);
  if (porLoja) return porLoja.responsavel;
  const porReg = resp.find((r) => r.chave_tipo === "regional" && normTexto(r.chave) === normTexto(regional));
  return porReg?.responsavel ?? null;
}

// ---------- De-para de placas ----------
/** Mapa placa → conjunto de placas equivalentes (inclui ela mesma), a partir do Banco de Fotos. */
export function montarDepara(bancoFotos: LinhaBase[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const l of bancoFotos) {
    const grupo = [l.placa, normPlaca(campo(l.dados, "PARA NOVA")), normPlaca(campo(l.dados, "PARA ANTIGA"))].filter(Boolean);
    const uniao = new Set<string>(grupo);
    for (const p of grupo) mapa.get(p)?.forEach((x) => uniao.add(x));
    for (const p of uniao) mapa.set(p, uniao);
  }
  return mapa;
}
export function placasEquivalentes(placa: string, depara: Map<string, Set<string>>): string[] {
  return Array.from(depara.get(placa) ?? new Set([placa]));
}

// ---------- Motor de indicadores ----------
export interface ResultadoIndicador { status: StatusIndicador; motivo: string; dados: Record<string, unknown>[] }
export interface ContextoCalculo {
  porTipo: Record<Exclude<TipoBase, "estoque">, Map<string, LinhaBase[]>>;
  depara: Map<string, Set<string>>;
  config: Record<IndicadorId, ConfigIndicador>;
  hoje?: Date;
}

export function indexarLinhas(linhas: LinhaBase[]): ContextoCalculo["porTipo"] {
  const porTipo = { os: new Map(), banco_fotos: new Map(), gosystem: new Map(), tcuv: new Map(), auditoria: new Map() } as ContextoCalculo["porTipo"];
  for (const l of linhas) {
    const m = porTipo[l.tipo];
    m.set(l.placa, [...(m.get(l.placa) ?? []), l]);
  }
  return porTipo;
}

function linhasDe(ctx: ContextoCalculo, tipo: Exclude<TipoBase, "estoque">, placas: string[]): LinhaBase[] {
  return placas.flatMap((p) => ctx.porTipo[tipo].get(p) ?? []);
}

export function calcularIndicadores(
  placa: string,
  fotosQtd: number | null,
  ctx: ContextoCalculo,
): Record<IndicadorId, ResultadoIndicador> {
  const placas = placasEquivalentes(placa, ctx.depara);
  const hoje = ctx.hoje ?? new Date();
  const desab = (id: IndicadorId) => !ctx.config[id]?.habilitado;
  const r = {} as Record<IndicadorId, ResultadoIndicador>;

  // OS: presença na base = pendente
  const os = linhasDe(ctx, "os", placas);
  r.os = desab("os")
    ? { status: "desabilitado", motivo: "Indicador desabilitado", dados: [] }
    : os.length
      ? { status: "pendente", motivo: "Placa presente na base de Pendências OS", dados: os.map((l) => l.dados) }
      : { status: "ok", motivo: "Placa não consta em Pendências OS", dados: [] };

  // Foto
  const cfgFoto = ctx.config.foto?.config ?? {};
  const min = cfgFoto.min_fotos ?? 0;
  const diasLimite = cfgFoto.dias_gosystem ?? 0;
  const banco = linhasDe(ctx, "banco_fotos", placas);
  const gos = linhasDe(ctx, "gosystem", placas)
    .map((l) => ({ l, data: dataValida(campo(l.dados, "Data Inicio")) }))
    .filter((x) => x.data)
    .sort((a, b) => b.data!.getTime() - a.data!.getTime());
  const recente = gos.find((x) => (hoje.getTime() - x.data!.getTime()) / 86400000 <= diasLimite);
  if (desab("foto")) r.foto = { status: "desabilitado", motivo: "Indicador desabilitado", dados: [] };
  else if ((fotosQtd ?? 0) >= min) r.foto = { status: "ok", motivo: `${fotosQtd ?? 0} fotos (mínimo ${min})`, dados: [] };
  else if (banco.length) r.foto = { status: "ok", motivo: "Placa registrada no Banco de Fotos", dados: banco.map((l) => l.dados) };
  else if (recente) r.foto = { status: "aguardando", motivo: `Fotografado em ${recente.data!.toLocaleDateString("pt-BR")}, aguardando atualização no sistema`, dados: [recente.l.dados] };
  else r.foto = { status: "pendente", motivo: `${fotosQtd ?? 0} fotos, abaixo do mínimo de ${min}`, dados: gos.slice(0, 3).map((x) => x.l.dados) };

  // TCUV: SOLICITADO com data válida e RETORNO vazio
  const tcuv = linhasDe(ctx, "tcuv", placas);
  if (desab("tcuv")) r.tcuv = { status: "desabilitado", motivo: "Indicador desabilitado", dados: [] };
  else {
    const pend = tcuv.filter((l) => dataValida(campo(l.dados, "SOLICITADO")) && vazio(campo(l.dados, "RETORNO")));
    const revisar = tcuv.filter((l) => !vazio(campo(l.dados, "SOLICITADO")) && !dataValida(campo(l.dados, "SOLICITADO")));
    r.tcuv = pend.length
      ? { status: "pendente", motivo: "Solicitado sem retorno", dados: pend.map((l) => l.dados) }
      : revisar.length
        ? { status: "revisar", motivo: "SOLICITADO sem data válida — revisar registro", dados: revisar.map((l) => l.dados) }
        : { status: "ok", motivo: tcuv.length ? "Retorno registrado" : "Sem registro TCUV", dados: tcuv.map((l) => l.dados) };
  }

  // Auditoria: encontrado = NAO
  const aud = linhasDe(ctx, "auditoria", placas);
  if (desab("auditoria")) r.auditoria = { status: "desabilitado", motivo: "Indicador desabilitado", dados: [] };
  else {
    const nao = aud.filter((l) => normChave(String(campo(l.dados, "encontrado") ?? "")) === "nao");
    r.auditoria = nao.length
      ? { status: "pendente", motivo: "Não encontrado na conferência física", dados: nao.map((l) => l.dados) }
      : { status: "ok", motivo: aud.length ? "Encontrado na conferência" : "Sem registro de auditoria", dados: aud.map((l) => l.dados) };
  }
  return r;
}

export function temPendencia(r: Record<IndicadorId, ResultadoIndicador>): boolean {
  return Object.values(r).some((x) => x.status === "pendente");
}

/** Placas que estavam ativas e não vieram na nova importação do Estoque BI. */
export function placasParaInativar(ativasAntes: string[], importadas: string[]): string[] {
  const novas = new Set(importadas);
  return ativasAntes.filter((p) => !novas.has(p));
}

// ---------- Acesso a dados ----------
async function buscarTodos<T>(montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type VeiculoPrep = {
  id: string; placa: string; regional: string | null; loja_bruta: string | null; modelo: string | null;
  ano_mod: string | null; cor: string | null; km: number | null; custo_total: number | null;
  valor_anunciado: number | null; fipe: number | null; dias_em_estoque: number | null; fotos_qtd: number | null;
  leads_60_dias: number | null; classificacao: string | null; chassi: string | null; finalidade: string | null;
  ativo: boolean; inativado_em: string | null; dados: Record<string, unknown>;
};

export interface VeiculoCalculado extends VeiculoPrep {
  loja: LojaResolvida;
  responsavel: string | null;
  indicadores: Record<IndicadorId, ResultadoIndicador>;
  pendente: boolean;
}

export async function carregarConfig() {
  const [cfg, agrup, direc, resp] = await Promise.all([
    supabase.from("prep_config_indicadores").select("*"),
    supabase.from("prep_lojas_agrupamento").select("*").order("loja_origem"),
    supabase.from("prep_lojas_direcionamento").select("*").order("loja_sem_operacao"),
    supabase.from("prep_regional_responsavel").select("*").order("chave"),
  ]);
  for (const r of [cfg, agrup, direc, resp]) if (r.error) throw r.error;
  const config = Object.fromEntries((cfg.data ?? []).map((c) => [c.indicador, c])) as unknown as Record<IndicadorId, ConfigIndicador>;
  return {
    config,
    agrup: (agrup.data ?? []) as (Agrupamento & { id: string })[],
    direc: (direc.data ?? []) as (Direcionamento & { id: string })[],
    resp: (resp.data ?? []) as (Responsavel & { id: string })[],
  };
}

export async function carregarVeiculosCalculados(ativos: boolean, placa?: string): Promise<VeiculoCalculado[]> {
  const cfg = await carregarConfig();
  const veiculos = await buscarTodos<VeiculoPrep>((de, ate) => {
    let q = supabase.from("prep_veiculos").select("*").eq("ativo", ativos);
    if (placa) q = q.eq("placa", placa);
    return q.order("placa").range(de, ate) as never;
  });
  const linhas = await buscarTodos<LinhaBase>((de, ate) =>
    supabase.from("prep_base_linhas").select("tipo, placa, placa_alt, dados").order("id").range(de, ate) as never,
  );
  const porTipo = indexarLinhas(linhas);
  const depara = montarDepara(linhas.filter((l) => l.tipo === "banco_fotos"));
  const ctx: ContextoCalculo = { porTipo, depara, config: cfg.config };
  return veiculos.map((v) => {
    const loja = resolverLoja(v.loja_bruta, cfg.direc, cfg.agrup);
    const indicadores = calcularIndicadores(v.placa, v.fotos_qtd, ctx);
    return { ...v, loja, responsavel: resolverResponsavel(loja.final, v.regional, cfg.resp), indicadores, pendente: temPendencia(indicadores) };
  });
}

async function registrarLog(tipo: TipoBase, arquivo: string, total: number, validas: number, status: "sucesso" | "erro", mensagem: string) {
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = u.user ? await supabase.from("profiles").select("username").eq("id", u.user.id).maybeSingle() : { data: null };
  const { data, error } = await supabase
    .from("prep_importacoes")
    .insert({ tipo, arquivo_nome: arquivo, usuario_id: u.user?.id ?? null, usuario_nome: p?.username ?? null, total_linhas: total, total_validas: validas, status, mensagem })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface ResultadoImportacao { total: number; validas: number; ignoradas: number; inativadas: number }

export async function importarBase(tipo: TipoBase, arquivo: string, linhas: Record<string, unknown>[]): Promise<ResultadoImportacao> {
  const def = BASES.find((b) => b.tipo === tipo)!;
  const comPlaca = linhas
    .map((l) => ({ l, placa: normPlaca(campo(l, ...def.colunaPlaca)) }))
    .filter((x) => x.placa.length >= 5);
  let importacaoId: string | null = null;
  try {
    if (!comPlaca.length) throw new Error("Nenhuma linha com placa encontrada. Verifique o cabeçalho da planilha.");
    let inativadas = 0;
    importacaoId = await registrarLog(tipo, arquivo, linhas.length, comPlaca.length, "sucesso", "Processando...");
    if (tipo === "estoque") {
      const unicos = new Map(comPlaca.map((x) => [x.placa, x.l]));
      const registros = Array.from(unicos, ([placa, l]) => ({
        placa,
        regional: (campo(l, "Regional") as string) ?? null,
        loja_bruta: (campo(l, "Loja") as string) ?? null,
        modelo: (campo(l, "Modelo") as string) ?? null,
        ano_mod: campo(l, "Ano/Mod") == null ? null : String(campo(l, "Ano/Mod")),
        cor: (campo(l, "Cor") as string) ?? null,
        km: numero(campo(l, "Km")),
        custo_total: numero(campo(l, "Custo Total")),
        valor_anunciado: numero(campo(l, "Valor Anunciado")),
        fipe: numero(campo(l, "Fipe")),
        dias_em_estoque: numero(campo(l, "Dias Em Estoque")),
        fotos_qtd: numero(campo(l, "Fotos (QNT)", "Fotos QNT", "Fotos")),
        leads_60_dias: numero(campo(l, "Leads 60 Dias")),
        classificacao: (campo(l, "Classificação") as string) ?? null,
        chassi: (campo(l, "Chassi") as string) ?? null,
        finalidade: (campo(l, "Finalidade") as string) ?? null,
        dados: JSON.parse(JSON.stringify(l)),
        ativo: true,
        inativado_em: null,
        ultima_importacao_id: importacaoId,
      }));
      const ativasAntes = await buscarTodos<{ placa: string }>((de, ate) =>
        supabase.from("prep_veiculos").select("placa").eq("ativo", true).order("placa").range(de, ate) as never,
      );
      for (let i = 0; i < registros.length; i += 500) {
        const { error } = await supabase.from("prep_veiculos").upsert(registros.slice(i, i + 500) as never, { onConflict: "placa" });
        if (error) throw error;
      }
      const inativar = placasParaInativar(ativasAntes.map((a) => a.placa), Array.from(unicos.keys()));
      for (let i = 0; i < inativar.length; i += 200) {
        const { error } = await supabase.from("prep_veiculos").update({ ativo: false, inativado_em: new Date().toISOString() }).in("placa", inativar.slice(i, i + 200));
        if (error) throw error;
      }
      inativadas = inativar.length;
    } else {
      const { error: delErr } = await supabase.from("prep_base_linhas").delete().eq("tipo", tipo);
      if (delErr) throw delErr;
      const registros = comPlaca.map(({ l, placa }) => ({
        tipo, placa, importacao_id: importacaoId,
        placa_alt: tipo === "banco_fotos" ? normPlaca(campo(l, "PARA NOVA")) || normPlaca(campo(l, "PARA ANTIGA")) || null : null,
        dados: JSON.parse(JSON.stringify(l)),
      }));
      for (let i = 0; i < registros.length; i += 500) {
        const { error } = await supabase.from("prep_base_linhas").insert(registros.slice(i, i + 500) as never);
        if (error) throw error;
      }
    }
    await supabase.from("prep_importacoes").update({ mensagem: inativadas ? `Concluída — ${inativadas} veículo(s) inativado(s)` : "Concluída" }).eq("id", importacaoId);
    return { total: linhas.length, validas: comPlaca.length, ignoradas: linhas.length - comPlaca.length, inativadas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    if (importacaoId) await supabase.from("prep_importacoes").update({ status: "erro", mensagem: msg }).eq("id", importacaoId);
    else await registrarLog(tipo, arquivo, linhas.length, 0, "erro", msg).catch(() => undefined);
    throw e;
  }
}
