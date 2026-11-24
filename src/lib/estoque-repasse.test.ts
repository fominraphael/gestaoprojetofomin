import { describe, expect, it } from "vitest";
import { calcularValorAnuncio, type FaixaDias, type RegraEstoque, type VeiculoCalculo } from "./estoque-motor";

const faixas: FaixaDias[] = [
  { id: "f1", nome: "0 a 60", dia_inicio: 0, dia_fim: 60, ordem: 1, ativo: true },
  { id: "f2", nome: "61+", dia_inicio: 61, dia_fim: 999, ordem: 2, ativo: true },
];
const base: RegraEstoque = { id: "r1", classificacao: "A", faixa_id: "f1", tipo_regra: "base", percentual: 0, arredonda_990: false, piso_fipe_ativo: false, piso_fipe_percentual: null, teto_fipe_ativo: false, teto_fipe_percentual: null, canais_exigidos: [], gera_tarefa: false, nome_tarefa: null, nova_finalidade: null, ativo: true, fallback_niveis: [{ tipo: "fipe_fixo", ativo: true, dias: null, percentual: 100, ordem: 0 }] };
const regras = [base, { ...base, id: "r2", faixa_id: "f2", tipo_regra: "finalidade" as const, nova_finalidade: "Repasse" }];
const v: VeiculoCalculo = { codigo_fipe: "1", ano_mod: "2024", km: 0, fipe: 100000, dias_em_estoque: 70, leads_60_dias: 0, classificacao: "A", valor_anuncio_calculado: 120000, faixa_id_atual: "f1" };

describe("mudança de finalidade (repasse)", () => {
  it("marca repasse e ainda atualiza faixa e valor sugerido", () => {
    const r = calcularValorAnuncio(v, faixas, regras, []);
    expect(r.moverParaRepasse).toBe(true);
    expect(r.novaFinalidade).toBe("Repasse");
    expect(r.faixa?.id).toBe("f2");
    expect(r.valorNovo).toBe(120000);
  });
  it("carro sem preço em repasse recebe valor sugerido", () => {
    const r = calcularValorAnuncio({ ...v, valor_anuncio_calculado: null, faixa_id_atual: null }, faixas, regras, []);
    expect(r.moverParaRepasse).toBe(true);
    expect(r.valorNovo).toBe(100000);
  });
});
