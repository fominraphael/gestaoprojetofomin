import { listarAnosModelo, passaAnoModelo } from "../components/estoque/AnoModeloFilter";
import { listarRegionais, passaRegional } from "../components/estoque/RegionalFilter";

export interface VeiculoFiltravel {
  chassi: string;
  placa: string | null;
  modelo: string | null;
  loja: string | null;
  regional: string | null;
  ano_mod: string | null;
  classificacao: string | null;
  faixa_id_atual: string | null;
  codigo_fipe: string | null;
  valor_anunciado_planilha: number | null;
}

export interface FiltrosVeiculos {
  busca: string;
  regionais: string[];
  anos: string[];
  classificacao: string | null;
  faixa: string | null;
  codigoFipe: string | null;
  valorImportadoZero: boolean;
}

export function filtrarVeiculos<T extends VeiculoFiltravel>(
  veiculos: readonly T[], filtros: FiltrosVeiculos,
): T[] {
  const termo = filtros.busca.trim().toLowerCase();
  return veiculos.filter((v) =>
    passaRegional(v.regional, filtros.regionais) &&
    passaAnoModelo(v.ano_mod, filtros.anos) &&
    (filtros.classificacao === null || v.classificacao === filtros.classificacao) &&
    (filtros.faixa === null || v.faixa_id_atual === filtros.faixa) &&
    (filtros.codigoFipe === null || v.codigo_fipe?.trim() === filtros.codigoFipe) &&
    // Ausência de valor não é um anúncio de valor zero.
    (!filtros.valorImportadoZero || v.valor_anunciado_planilha === 0) &&
    (!termo || [v.chassi, v.placa, v.modelo, v.loja].some((c) =>
      (c ?? "").toLowerCase().includes(termo),
    )),
  );
}

/** Extrai opções dos dados recebidos, mantendo a normalização dos filtros. */
export function opcoesFiltrosVeiculos(veiculos: readonly VeiculoFiltravel[]) {
  const textos = (valores: (string | null)[]) =>
    [...new Set(valores.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))].sort();
  return {
    regionais: listarRegionais(veiculos.map((v) => v.regional)),
    anos: listarAnosModelo(veiculos.map((v) => v.ano_mod)),
    classificacoes: textos(veiculos.map((v) => v.classificacao)),
    faixas: new Set(veiculos.map((v) => v.faixa_id_atual).filter(Boolean)),
    codigosFipe: textos(veiculos.map((v) => v.codigo_fipe)),
    temValorZero: veiculos.some((v) => v.valor_anunciado_planilha === 0),
  };
}

/** Catálogo da tela separado das opções disponíveis no resultado atual. */
export function estadoOpcoesFiltrosVeiculos(
  base: readonly VeiculoFiltravel[], resultado: readonly VeiculoFiltravel[],
) {
  return { todas: opcoesFiltrosVeiculos(base), disponiveis: opcoesFiltrosVeiculos(resultado) };
}