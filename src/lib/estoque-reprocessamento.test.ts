import { describe, expect, it } from "vitest";
import { calcularValorAnuncio, type FaixaDias, type RegraEstoque, type VeiculoCalculo } from "./estoque-motor";
import { reprocessarValorAnuncio } from "./estoque-reprocessamento";

const faixas: FaixaDias[] = [{ id: "f1", nome: "0 a 30", dia_inicio: 0, dia_fim: 30, ordem: 1, ativo: true }, { id: "f2", nome: "31 a 60", dia_inicio: 31, dia_fim: 60, ordem: 2, ativo: true }];
const regra: RegraEstoque = { id: "r1", classificacao: "A", faixa_id: "f1", tipo_regra: "base", percentual: 0, arredonda_990: false, piso_fipe_ativo: false, piso_fipe_percentual: null, teto_fipe_ativo: false, teto_fipe_percentual: null, canais_exigidos: [], gera_tarefa: false, nome_tarefa: null, nova_finalidade: null, ativo: true, fallback_niveis: [{ tipo: "fipe_fixo", ativo: true, dias: null, percentual: 100, ordem: 0 }] };
const regras = [regra, { ...regra, id: "r2", faixa_id: "f2", tipo_regra: "ajuste" as const, percentual: -2 }];
const v: VeiculoCalculo = { codigo_fipe: "1", ano_mod: "2024", km: 0, fipe: 100000, dias_em_estoque: 40, leads_60_dias: 0, classificacao: "A", valor_anuncio_calculado: 150000, faixa_id_atual: "f2" };

describe("reprocessamento excepcional das configurações", () => {
  it("sobrescreve preço anterior na mesma faixa com a configuração atual e preserva o anterior para histórico", () => {
    const r = reprocessarValorAnuncio(v, faixas, regras, []);
    expect(r.valorNovo).toBe(98000);
    expect(r.valorAnterior).toBe(150000);
    expect(r.faixa?.id).toBe("f2");
    expect(v.valor_anuncio_calculado).toBe(150000);
  });
  it("mantém o novo preço estável depois, inclusive no recálculo forçado", () => {
    const r = reprocessarValorAnuncio(v, faixas, regras, []);
    const depois = calcularValorAnuncio({ ...v, valor_anuncio_calculado: r.valorNovo }, faixas, [{ ...regra, percentual: 5 }, { ...regras[1], percentual: -10 }], [], { forcar: true });
    expect(depois.alterou).toBe(false);
    expect(depois.valorNovo).toBe(98000);
  });
});