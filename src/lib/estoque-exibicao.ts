import { faixaDoVeiculo, type FaixaDias } from "./estoque-motor";

interface VeiculoExibicao {
  dias_em_estoque: number;
  classificacao: string | null;
}
interface RegraCanais {
  ativo: boolean;
  classificacao: string;
  faixa_id: string;
  canais_exigidos: string[];
}
interface AnuncioCanais {
  canal_site_proprio: boolean;
  canal_olx: boolean;
  canal_webmotors: boolean;
}
export interface CanalExibicao {
  label: string;
  estado: "cumpriu" | "pendente" | "opcional";
  titulo: string;
}

/** A faixa de análise acompanha os dias importados; a faixa gravada pertence ao preço. */
export function faixaParaExibicao(
  veiculo: Pick<VeiculoExibicao, "dias_em_estoque">, faixas: FaixaDias[],
): FaixaDias | null {
  return Number.isFinite(veiculo.dias_em_estoque)
    ? faixaDoVeiculo(veiculo.dias_em_estoque, faixas)
    : null;
}

const normalizarCanal = (s: string) => s.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Compatibilidade: a correção de exibição não reabre conclusões do ciclo legado. */
export function acaoConcluidaParaExibicao(
  registro: { concluido: boolean; faixaId: string | null } | undefined,
  faixaAtual: string | null, faixaPrecificacao: string | null,
): boolean {
  return registro?.concluido === true &&
    (registro.faixaId === faixaAtual || registro.faixaId === faixaPrecificacao);
}

export function canaisParaExibicao(
  veiculo: VeiculoExibicao, anuncio: AnuncioCanais | undefined,
  faixas: FaixaDias[], regras: readonly RegraCanais[],
): CanalExibicao[] {
  const faixa = faixaParaExibicao(veiculo, faixas);
  const regra = faixa ? regras.find((r) => r.ativo && r.classificacao === veiculo.classificacao && r.faixa_id === faixa.id) : undefined;
  const exigidos = new Set((regra?.canais_exigidos ?? []).map(normalizarCanal));
  const itens: [string, string, boolean | undefined][] = [
    ["Site", "Site Próprio", anuncio?.canal_site_proprio],
    ["OLX", "OLX", anuncio?.canal_olx],
    ["WM", "WebMotors", anuncio?.canal_webmotors],
  ];
  return itens.map(([label, nome, publicado]) => {
    if (!exigidos.has(normalizarCanal(nome))) return { label, estado: "opcional", titulo: `${nome}: não obrigatório para esta categoria` };
    return publicado
      ? { label, estado: "cumpriu", titulo: `${nome}: obrigatório e publicado` }
      : { label, estado: "pendente", titulo: `${nome}: obrigatório e ainda não publicado` };
  });
}