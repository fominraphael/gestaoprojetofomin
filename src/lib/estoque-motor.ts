/**
 * Motor de precificação do módulo Análise de Estoque (Matriz).
 *
 * Todas as funções aqui são puras: recebem configuração + dados e devolvem o
 * resultado do cálculo, sem tocar no banco. Nenhum percentual, faixa ou gatilho
 * é fixo no código — tudo vem das tabelas de configuração.
 */

export type ClassificacaoEstoque = "A+" | "A" | "B" | "C" | "D";
export const CLASSIFICACOES: ClassificacaoEstoque[] = ["A+", "A", "B", "C", "D"];

export type TipoRegra = "base" | "ajuste" | "finalidade";
export const CANAIS = ["Site Próprio", "OLX", "WebMotors"] as const;
export type Canal = (typeof CANAIS)[number];

export interface FaixaDias {
  id: string;
  nome: string;
  dia_inicio: number;
  dia_fim: number;
  ordem: number;
  ativo: boolean;
}

export interface GatilhoLeads {
  id?: string;
  leads_min: number | null;
  leads_max: number | null;
  percentual: number;
  ordem: number;
}

/** Tipos de nível de fallback usados para montar o valor base do anúncio. */
export type TipoNivelBase = "hist_curto" | "hist_longo" | "fipe_fixo";

export interface NivelBase {
  tipo: TipoNivelBase;
  ativo: boolean;
  /** Janela em dias — usada apenas nos níveis de histórico. */
  dias: number | null;
  /** Percentual da FIPE — usado apenas no nível `fipe_fixo`. */
  percentual: number | null;
  /**
   * Ajuste percentual (positivo ou negativo) aplicado sobre a média encontrada
   * nos níveis de histórico. Ignorado no nível `fipe_fixo`.
   */
  ajuste_percentual?: number | null;
  ordem: number;
}

export const ROTULO_NIVEL: Record<TipoNivelBase, string> = {
  hist_curto: "Histórico de vendas (janela curta)",
  hist_longo: "Histórico de vendas (janela longa)",
  fipe_fixo: "Percentual fixo da FIPE",
};

/** Configuração padrão (equivale ao comportamento anterior: 30d → 60d → 100% FIPE). */
export const NIVEIS_BASE_PADRAO: NivelBase[] = [
  { tipo: "hist_curto", ativo: true, dias: 30, percentual: null, ajuste_percentual: 0, ordem: 0 },
  { tipo: "hist_longo", ativo: true, dias: 60, percentual: null, ajuste_percentual: 0, ordem: 1 },
  { tipo: "fipe_fixo", ativo: true, dias: null, percentual: 100, ajuste_percentual: null, ordem: 2 },
];

export function normalizaNiveis(niveis: unknown): NivelBase[] {
  const arr = Array.isArray(niveis) ? (niveis as Partial<NivelBase>[]) : [];
  const validos = arr.filter((n) => n && typeof n.tipo === "string" && n.tipo in ROTULO_NIVEL);
  if (validos.length === 0) return NIVEIS_BASE_PADRAO.map((n) => ({ ...n }));
  return validos
    .map((n, i) => ({
      tipo: n.tipo as TipoNivelBase,
      ativo: n.ativo !== false,
      dias: n.dias ?? null,
      percentual: n.percentual ?? null,
      ajuste_percentual: n.ajuste_percentual ?? 0,
      ordem: typeof n.ordem === "number" ? n.ordem : i,
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

/** Faixa de quilometragem configurável (aba Cadastros da Matriz de Regras). */
export interface FaixaKm {
  id: string;
  nome: string;
  km_inicio: number;
  km_fim: number;
  ordem: number;
  ativo: boolean;
}


export interface RegraEstoque {
  id: string;
  classificacao: ClassificacaoEstoque;
  faixa_id: string;
  tipo_regra: TipoRegra;
  percentual: number;
  arredonda_990: boolean;
  piso_fipe_ativo: boolean;
  piso_fipe_percentual: number | null;
  teto_fipe_ativo: boolean;
  teto_fipe_percentual: number | null;
  canais_exigidos: string[];
  gera_tarefa: boolean;
  nome_tarefa: string | null;
  nova_finalidade: string | null;
  ativo: boolean;
  /** Níveis de fallback do valor base (ativáveis e reordenáveis por célula). */
  fallback_niveis?: NivelBase[] | null;
  checagem_mercado_ativa?: boolean;
  canal_referencia?: string | null;
  min_fotos?: number | null;
  acao_aceleradores?: boolean;
  acao_fotos_ia?: boolean;
  acao_repescagem?: boolean;
  acao_auditoria?: boolean;
  leads?: GatilhoLeads[];
}

/** Ações operacionais configuráveis por célula da matriz. */
export type TipoAcaoMatriz = "aceleradores" | "fotos_ia" | "repescagem" | "auditoria";

export const ACOES_MATRIZ: { tipo: TipoAcaoMatriz; label: string; campo: keyof RegraEstoque }[] = [
  { tipo: "aceleradores", label: "Aceleradores", campo: "acao_aceleradores" },
  { tipo: "fotos_ia", label: "Usar fotos da avaliação (IA)", campo: "acao_fotos_ia" },
  { tipo: "repescagem", label: "Repescagem de leads", campo: "acao_repescagem" },
  { tipo: "auditoria", label: "Auditoria de anúncio", campo: "acao_auditoria" },
];

/** Anúncio importado usado na checagem de mercado. */
export interface AnuncioMercado {
  chassi: string;
  modelo: string | null;
  ano_modelo: string | null;
  preco_venda: number | null;
  canal_site_proprio: boolean;
  canal_olx: boolean;
  canal_webmotors: boolean;
}


export interface VendaHistorica {
  id: string;
  chassi: string | null;
  codigo_fipe: string | null;
  ano_modelo: string | null;
  km: number | null;
  data_venda: string | null;
  valor_venda: number | null;
}

export interface VeiculoCalculo {
  id?: string;
  codigo_fipe: string | null;
  ano_mod: string | null;
  km: number | null;
  fipe: number | null;
  dias_em_estoque: number;
  leads_60_dias: number;
  classificacao: string | null;
  valor_anuncio_calculado: number | null;
  faixa_id_atual: string | null;
}

/** Arredonda sempre para cima até o próximo valor terminado em 990. */
export function arredonda990(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  const base = Math.floor(valor / 1000) * 1000 + 990;
  return base >= valor ? base : base + 1000;
}

/**
 * Faixa de KM usada na busca de vendas comparáveis.
 * Usa as faixas cadastradas (aba Cadastros); sem cadastro, cai no padrão de 15k.
 */
export function faixaKm(km: number | null | undefined, faixas: FaixaKm[] = []): string {
  const v = km ?? 0;
  const ativas = faixas.filter((f) => f.ativo).sort((a, b) => a.ordem - b.ordem);
  if (ativas.length > 0) {
    const encontrada = ativas.find((f) => v >= f.km_inicio && v <= f.km_fim);
    return encontrada ? encontrada.id : "fora-de-faixa";
  }
  if (v < 15000) return "0-15k";
  if (v < 30000) return "15-30k";
  if (v < 45000) return "30-45k";
  if (v < 60000) return "45-60k";
  return "+60k";
}


function normaliza(valor: string | null | undefined): string {
  return (valor ?? "").toString().trim().toUpperCase();
}

export interface ResultadoHistorico {
  valor: number | null;
  janelaDias: number | null;
  vendasUsadas: { id: string; chassi: string | null; data_venda: string | null; valor: number }[];
  motivo: string;
}

/** Vendas comparáveis: mesmo código FIPE + ano modelo + faixa de KM cadastrada. */
function vendasComparaveis(
  veiculo: VeiculoCalculo,
  vendas: VendaHistorica[],
  faixasKm: FaixaKm[] = [],
): VendaHistorica[] {
  const fipe = normaliza(veiculo.codigo_fipe);
  const ano = normaliza(veiculo.ano_mod);
  const faixa = faixaKm(veiculo.km, faixasKm);
  if (!fipe) return [];
  return vendas.filter(
    (v) =>
      normaliza(v.codigo_fipe) === fipe &&
      (ano ? normaliza(v.ano_modelo).includes(ano) || ano.includes(normaliza(v.ano_modelo)) : true) &&
      faixaKm(v.km, faixasKm) === faixa &&
      typeof v.valor_venda === "number" &&
      v.valor_venda > 0 &&
      !!v.data_venda,
  );
}

/**
 * Média de vendas comparáveis dentro de uma janela de dias configurável.
 * Exige pelo menos 2 vendas no período para ser considerada válida.
 */
export function valorHistoricoJanela(
  veiculo: VeiculoCalculo,
  vendas: VendaHistorica[],
  janelaDias: number,
  hoje: Date = new Date(),
  faixasKm: FaixaKm[] = [],
): ResultadoHistorico {
  if (!normaliza(veiculo.codigo_fipe)) {
    return { valor: null, janelaDias: null, vendasUsadas: [], motivo: "Veículo sem código FIPE" };
  }
  const limite = new Date(hoje.getTime() - janelaDias * 24 * 60 * 60 * 1000);
  const noPeriodo = vendasComparaveis(veiculo, vendas, faixasKm).filter(
    (v) => new Date(v.data_venda!) >= limite,
  );
  if (noPeriodo.length < 2) {
    return {
      valor: null,
      janelaDias: null,
      vendasUsadas: [],
      motivo: `Sem 2 ou mais vendas comparáveis em ${janelaDias} dias`,
    };
  }
  const soma = noPeriodo.reduce((acc, v) => acc + (v.valor_venda ?? 0), 0);
  return {
    valor: soma / noPeriodo.length,
    janelaDias,
    vendasUsadas: noPeriodo.map((v) => ({
      id: v.id,
      chassi: v.chassi,
      data_venda: v.data_venda,
      valor: v.valor_venda ?? 0,
    })),
    motivo: `Média de ${noPeriodo.length} vendas nos últimos ${janelaDias} dias`,
  };
}

/** Compatibilidade: histórico em 30 dias e, se insuficiente, em 60 dias. */
export function valorVendaHistorico(
  veiculo: VeiculoCalculo,
  vendas: VendaHistorica[],
  hoje: Date = new Date(),
  faixasKm: FaixaKm[] = [],
): ResultadoHistorico {
  for (const janela of [30, 60]) {
    const r = valorHistoricoJanela(veiculo, vendas, janela, hoje, faixasKm);
    if (r.valor != null) return r;
  }
  return {
    valor: null,
    janelaDias: null,
    vendasUsadas: [],
    motivo: "Sem 2 ou mais vendas comparáveis em 60 dias",
  };
}

export interface ResultadoBase {
  valor: number | null;
  nivel: TipoNivelBase | null;
  motivo: string;
  vendasUsadas: ResultadoHistorico["vendasUsadas"];
}

/**
 * Percorre os níveis de fallback ATIVOS na ordem configurada na célula da matriz
 * e devolve o primeiro que produzir um valor válido.
 */
export function valorBaseConfiguravel(
  veiculo: VeiculoCalculo,
  regra: RegraEstoque,
  vendas: VendaHistorica[],
  hoje: Date = new Date(),
  faixasKm: FaixaKm[] = [],
): ResultadoBase {
  const niveis = normalizaNiveis(regra.fallback_niveis).filter((n) => n.ativo);
  if (niveis.length === 0) {
    return {
      valor: null,
      nivel: null,
      motivo: "Nenhum nível de base ativo configurado para esta célula da matriz",
      vendasUsadas: [],
    };
  }
  for (const nivel of niveis) {
    if (nivel.tipo === "fipe_fixo") {
      const pct = nivel.percentual ?? 100;
      if (veiculo.fipe && veiculo.fipe > 0) {
        return {
          valor: (veiculo.fipe * pct) / 100,
          nivel: "fipe_fixo",
          motivo: `${pct}% da FIPE`,
          vendasUsadas: [],
        };
      }
      continue;
    }
    const dias = nivel.dias ?? (nivel.tipo === "hist_curto" ? 30 : 60);
    const r = valorHistoricoJanela(veiculo, vendas, dias, hoje, faixasKm);
    if (r.valor != null) {
      // Ajuste percentual configurável (positivo ou negativo) sobre a média.
      const ajuste = Number(nivel.ajuste_percentual ?? 0);
      const valor = r.valor * (1 + ajuste / 100);
      return {
        valor,
        nivel: nivel.tipo,
        motivo: ajuste ? `${r.motivo} · ajuste de ${ajuste > 0 ? "+" : ""}${ajuste}%` : r.motivo,
        vendasUsadas: r.vendasUsadas,
      };
    }
  }
  return {

    valor: null,
    nivel: null,
    motivo: "Nenhum nível de fallback ativo retornou valor válido",
    vendasUsadas: [],
  };
}

/** O veículo é considerado fotografado quando atinge o mínimo de fotos da regra. */
export function veiculoFotografado(
  fotosQtd: number | null | undefined,
  regra: RegraEstoque | null | undefined,
): boolean {
  const minimo = regra?.min_fotos ?? 2;
  return (fotosQtd ?? 0) >= minimo;
}

function precoNoCanal(a: AnuncioMercado, canal: string): boolean {
  const c = canal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (c.includes("olx")) return a.canal_olx;
  if (c.includes("site")) return a.canal_site_proprio;
  return a.canal_webmotors;
}

/** Média de preço dos anúncios do canal de referência para veículos equivalentes. */
export function mediaCanalReferencia(
  veiculo: VeiculoCalculo & { modelo?: string | null },
  anuncios: AnuncioMercado[],
  canal: string,
): { media: number | null; quantidade: number } {
  const modelo = normaliza(veiculo.modelo ?? null);
  const ano = normaliza(veiculo.ano_mod);
  const comparaveis = anuncios.filter(
    (a) =>
      precoNoCanal(a, canal) &&
      typeof a.preco_venda === "number" &&
      (a.preco_venda ?? 0) > 0 &&
      (modelo ? normaliza(a.modelo).includes(modelo) || modelo.includes(normaliza(a.modelo)) : true) &&
      (ano ? normaliza(a.ano_modelo).includes(ano) || ano.includes(normaliza(a.ano_modelo)) : true),
  );
  if (comparaveis.length === 0) return { media: null, quantidade: 0 };
  const soma = comparaveis.reduce((acc, a) => acc + (a.preco_venda ?? 0), 0);
  return { media: soma / comparaveis.length, quantidade: comparaveis.length };
}


/** Faixa de dias em que o veículo se encontra (última faixa se ultrapassar o teto). */
export function faixaDoVeiculo(dias: number, faixas: FaixaDias[]): FaixaDias | null {
  const ativas = faixas.filter((f) => f.ativo).sort((a, b) => a.ordem - b.ordem);
  if (ativas.length === 0) return null;
  const encontrada = ativas.find((f) => dias >= f.dia_inicio && dias <= f.dia_fim);
  if (encontrada) return encontrada;
  const ultima = ativas[ativas.length - 1]!;
  return dias > ultima.dia_fim ? ultima : (ativas[0] ?? null);
}

function percentualPorLeads(regra: RegraEstoque, leads: number): { pct: number; origem: string } {
  const gatilhos = (regra.leads ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  for (const g of gatilhos) {
    const okMin = g.leads_min == null || leads >= g.leads_min;
    const okMax = g.leads_max == null || leads <= g.leads_max;
    if (okMin && okMax) {
      return {
        pct: Number(g.percentual),
        origem: `Gatilho de leads (${g.leads_min ?? "-"} a ${g.leads_max ?? "-"}) com ${leads} leads`,
      };
    }
  }
  return { pct: Number(regra.percentual), origem: "Percentual padrão da regra" };
}

function aplicaPisoTeto(
  valor: number,
  regra: RegraEstoque,
  fipe: number | null,
  memoria: Record<string, unknown>,
): number {
  if (!fipe || fipe <= 0) return valor;
  let out = valor;
  if (regra.piso_fipe_ativo && regra.piso_fipe_percentual != null) {
    const piso = (fipe * Number(regra.piso_fipe_percentual)) / 100;
    if (out < piso) {
      memoria["piso_aplicado"] = { percentual: regra.piso_fipe_percentual, valor: piso };
      out = piso;
    }
  }
  if (regra.teto_fipe_ativo && regra.teto_fipe_percentual != null) {
    const teto = (fipe * Number(regra.teto_fipe_percentual)) / 100;
    if (out > teto) {
      memoria["teto_aplicado"] = { percentual: regra.teto_fipe_percentual, valor: teto };
      out = teto;
    }
  }
  return out;
}

export interface ResultadoCalculo {
  alterou: boolean;
  valorAnterior: number | null;
  valorNovo: number | null;
  faixa: FaixaDias | null;
  regra: RegraEstoque | null;
  percentual: number | null;
  tipo: TipoRegra | null;
  moverParaRepasse: boolean;
  novaFinalidade: string | null;
  geraTarefa: boolean;
  nomeTarefa: string | null;
  memoria: Record<string, unknown>;
  motivo: string;
}

/**
 * Calcula o valor de anúncio do veículo conforme a matriz de regras.
 * - Veículo sem valor calculado ainda: monta o valor base (histórico ou FIPE)
 *   com a regra "Precificação Base" e, se já estiver numa faixa avançada,
 *   aplica direto o ajuste da faixa atual.
 * - Veículo que mudou de faixa: aplica o ajuste sobre o valor atual (cumulativo).
 */
export function calcularValorAnuncio(
  veiculo: VeiculoCalculo,
  faixas: FaixaDias[],
  regras: RegraEstoque[],
  vendas: VendaHistorica[],
  opts: { hoje?: Date; anuncios?: AnuncioMercado[] } = {},
): ResultadoCalculo {
  const hoje = opts.hoje ?? new Date();
  const anunciosMercado = opts.anuncios ?? [];

  const vazio: ResultadoCalculo = {
    alterou: false,
    valorAnterior: veiculo.valor_anuncio_calculado ?? null,
    valorNovo: veiculo.valor_anuncio_calculado ?? null,
    faixa: null,
    regra: null,
    percentual: null,
    tipo: null,
    moverParaRepasse: false,
    novaFinalidade: null,
    geraTarefa: false,
    nomeTarefa: null,
    memoria: {},
    motivo: "",
  };

  const classificacao = (veiculo.classificacao ?? "").trim() as ClassificacaoEstoque;
  if (!CLASSIFICACOES.includes(classificacao)) {
    return { ...vazio, motivo: "Classificação inválida ou ausente" };
  }

  const faixa = faixaDoVeiculo(veiculo.dias_em_estoque ?? 0, faixas);
  if (!faixa) return { ...vazio, motivo: "Nenhuma faixa de dias cadastrada" };

  const regrasAtivas = regras.filter((r) => r.ativo && r.classificacao === classificacao);
  const regra = regrasAtivas.find((r) => r.faixa_id === faixa.id) ?? null;
  if (!regra) {
    return { ...vazio, faixa, motivo: `Sem regra cadastrada para ${classificacao} / ${faixa.nome}` };
  }

  const memoria: Record<string, unknown> = {
    classificacao,
    faixa: faixa.nome,
    dias_em_estoque: veiculo.dias_em_estoque,
    leads_60_dias: veiculo.leads_60_dias,
    fipe: veiculo.fipe,
  };

  // Mudança de finalidade (ex.: Repasse)
  if (regra.tipo_regra === "finalidade") {
    const jaEstava = veiculo.faixa_id_atual === faixa.id;
    return {
      ...vazio,
      alterou: !jaEstava,
      faixa,
      regra,
      tipo: "finalidade",
      moverParaRepasse: true,
      novaFinalidade: regra.nova_finalidade || "Repasse",
      geraTarefa: regra.gera_tarefa,
      nomeTarefa: regra.nome_tarefa,
      memoria,
      motivo: `Mudança de finalidade para ${regra.nova_finalidade || "Repasse"}`,
    };
  }

  const valorAtual = veiculo.valor_anuncio_calculado ?? null;
  const mudouDeFaixa = veiculo.faixa_id_atual !== faixa.id;

  // Nada muda enquanto o veículo continua na mesma faixa já precificada.
  if (valorAtual != null && !mudouDeFaixa) {
    return { ...vazio, faixa, regra, memoria, motivo: "Veículo permanece na mesma faixa" };
  }

  let valor: number;
  let percentualUsado: number;
  let tipo: TipoRegra;

  if (valorAtual == null) {
    // Precificação base a partir da primeira faixa configurada
    const ativas = faixas.filter((f) => f.ativo).sort((a, b) => a.ordem - b.ordem);
    const primeira = ativas[0] ?? faixa;
    const regraBase =
      regrasAtivas.find((r) => r.faixa_id === primeira.id && r.tipo_regra === "base") ??
      regrasAtivas.find((r) => r.tipo_regra === "base") ??
      regra;

    const resBase = valorBaseConfiguravel(veiculo, regraBase, vendas, hoje);
    const base = resBase.valor ?? 0;
    memoria["origem_valor_base"] = resBase.nivel ? ROTULO_NIVEL[resBase.nivel] : "indefinida";
    memoria["base_motivo"] = resBase.motivo;
    memoria["historico"] = { motivo: resBase.motivo, vendas: resBase.vendasUsadas };
    if (resBase.valor == null) {
      memoria["excecao_base"] = "Nenhum nível de fallback ativo retornou valor válido";
    }


    percentualUsado = Number(regraBase.percentual);
    valor = base * (1 + percentualUsado / 100);
    if (regraBase.arredonda_990) valor = arredonda990(valor);
    valor = aplicaPisoTeto(valor, regraBase, veiculo.fipe, memoria);
    tipo = "base";

    // Entrou já numa faixa avançada: aplica direto o ajuste da faixa atual
    if (faixa.id !== primeira.id && regra.tipo_regra === "ajuste") {
      const { pct, origem } = percentualPorLeads(regra, veiculo.leads_60_dias ?? 0);
      memoria["ajuste_faixa_atual"] = { percentual: pct, origem };
      valor = valor * (1 + pct / 100);
      if (regra.arredonda_990) valor = arredonda990(valor);
      valor = aplicaPisoTeto(valor, regra, veiculo.fipe, memoria);
      percentualUsado = pct;
      tipo = "ajuste";
    }
  } else {
    // Ajuste cumulativo sobre o valor atualmente anunciado
    const { pct, origem } = percentualPorLeads(regra, veiculo.leads_60_dias ?? 0);
    memoria["ajuste"] = { percentual: pct, origem, valor_base: valorAtual };
    percentualUsado = pct;
    valor = valorAtual * (1 + pct / 100);
    if (regra.arredonda_990) valor = arredonda990(valor);
    valor = aplicaPisoTeto(valor, regra, veiculo.fipe, memoria);
    tipo = "ajuste";
  }

  // Checagem de mercado: nunca anunciar abaixo da média do canal de referência.
  if (regra.checagem_mercado_ativa) {
    const canalRef = regra.canal_referencia || "WebMotors";
    const { media, quantidade } = mediaCanalReferencia(veiculo, anunciosMercado, canalRef);
    if (media != null && valor < media) {
      memoria["checagem_mercado"] = {
        canal: canalRef,
        media,
        anuncios_considerados: quantidade,
        valor_antes: valor,
      };
      valor = media;
      if (regra.arredonda_990) valor = arredonda990(valor);
      valor = aplicaPisoTeto(valor, regra, veiculo.fipe, memoria);
    }
  }

  const valorNovo = Math.round(valor * 100) / 100;


  return {
    alterou: valorNovo !== valorAtual || mudouDeFaixa,
    valorAnterior: valorAtual,
    valorNovo,
    faixa,
    regra,
    percentual: percentualUsado,
    tipo,
    moverParaRepasse: false,
    novaFinalidade: null,
    geraTarefa: regra.gera_tarefa,
    nomeTarefa: regra.nome_tarefa,
    memoria,
    motivo:
      tipo === "base"
        ? "Precificação base aplicada"
        : `Ajuste de ${percentualUsado}% sobre o valor anterior`,
  };
}

export function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
