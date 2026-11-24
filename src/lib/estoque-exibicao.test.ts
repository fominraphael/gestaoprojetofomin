import { describe, expect, it } from "vitest";
import { acaoConcluidaParaExibicao, canaisParaExibicao, faixaParaExibicao } from "./estoque-exibicao";
import type { FaixaDias } from "./estoque-motor";

export const faixas: FaixaDias[] = [
  { id: "f1", nome: "0 a 60", dia_inicio: 0, dia_fim: 60, ordem: 1, ativo: true },
  { id: "f2", nome: "61 a 75", dia_inicio: 61, dia_fim: 75, ordem: 2, ativo: true },
  { id: "f3", nome: "75+", dia_inicio: 75, dia_fim: 10000, ordem: 3, ativo: true },
];

describe("faixa atual para análise, independente da precificação", () => {
  it("usa 75+ aos 252 dias mesmo com faixa de precificação ausente", () => {
    expect(faixaParaExibicao({ dias_em_estoque: 252 }, faixas)?.id).toBe("f3");
  });
  it("mantém o limite inclusivo de 61 a 75 dias", () => {
    expect([60, 61, 75, 76].map((dias_em_estoque) => faixaParaExibicao({ dias_em_estoque }, faixas)?.id))
      .toEqual(["f1", "f2", "f2", "f3"]);
  });
});

describe("canais da SYH5J21", () => {
  const veiculo = { dias_em_estoque: 252, classificacao: "C", faixa_id_atual: null, valor_anuncio_calculado: 144990 };
  const regras = [{ ativo: true, classificacao: "C", faixa_id: "f3", canais_exigidos: ["Site Próprio", "OLX", "WebMotors"] }];
  it("reconhece os três canais publicados conforme a regra de 75+ sem alterar preço nem faixa gravada", () => {
    const canais = canaisParaExibicao(veiculo, { canal_site_proprio: true, canal_olx: true, canal_webmotors: true }, faixas, regras);
    expect(canais.map((c) => c.estado)).toEqual(["cumpriu", "cumpriu", "cumpriu"]);
    expect(veiculo.valor_anuncio_calculado).toBe(144990);
    expect(veiculo.faixa_id_atual).toBeNull();
  });
  it("distingue canal obrigatório ausente de canal opcional", () => {
    const canais = canaisParaExibicao(veiculo, undefined, faixas, [{ ...regras[0], ativo: true, classificacao: "C", faixa_id: "f3", canais_exigidos: ["OLX"] }]);
    expect(canais.map((c) => c.estado)).toEqual(["opcional", "pendente", "opcional"]);
  });
});

describe("ações da Matriz sem reabrir registros concluídos por correção visual", () => {
  it("preserva a conclusão registrada na faixa de precificação legada", () => {
    expect(acaoConcluidaParaExibicao({ concluido: true, faixaId: "f2" }, "f3", "f2")).toBe(true);
  });
  it("reconhece novas conclusões na faixa atual independente da faixa do preço", () => {
    expect(acaoConcluidaParaExibicao({ concluido: true, faixaId: "f3" }, "f3", "f2")).toBe(true);
  });
  it("mantém pendente ação não concluída ou de ciclo que já foi superado", () => {
    expect(acaoConcluidaParaExibicao({ concluido: false, faixaId: "f3" }, "f3", "f2")).toBe(false);
    expect(acaoConcluidaParaExibicao({ concluido: true, faixaId: "f1" }, "f3", "f2")).toBe(false);
  });
});