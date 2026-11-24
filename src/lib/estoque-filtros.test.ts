import { describe, expect, it } from "vitest";
import { opcoesVisiveisFiltrosVeiculos, filtrarVeiculos, opcoesFiltrosVeiculos, type FiltrosVeiculos, type VeiculoFiltravel } from "./estoque-filtros";
import type { FaixaDias } from "./estoque-motor";
import { ordenarLista } from "./ordenacao";

const faixas: FaixaDias[] = [
  { id: "f1", nome: "0 a 60", dia_inicio: 0, dia_fim: 60, ordem: 1, ativo: true },
  { id: "f2", nome: "61 a 75", dia_inicio: 61, dia_fim: 75, ordem: 2, ativo: true },
  { id: "f3", nome: "75+", dia_inicio: 75, dia_fim: 10000, ordem: 3, ativo: true },
];

const filtros: FiltrosVeiculos = { busca: "", regionais: [], anos: [], classificacao: null, faixa: null, codigoFipe: null, valorImportadoZero: false };
const base: VeiculoFiltravel = { chassi: "a", placa: "AAA1A11", modelo: "Modelo", loja: "Loja", regional: "Norte", ano_mod: "2023/2024", classificacao: "A", faixa_id_atual: "f1", dias_em_estoque: 30, codigo_fipe: "001001-0", valor_anunciado_planilha: 0 };
const veiculos = [base, { ...base, chassi: "b", codigo_fipe: "002001-0", valor_anunciado_planilha: 100 }, { ...base, chassi: "c", regional: "Sul", ano_mod: "2020/2021", classificacao: "B", faixa_id_atual: "f2", dias_em_estoque: 70, valor_anunciado_planilha: null }];

describe("filtros da Matriz de Estoque", () => {
  it("estilo Excel: esconde opções sem veículos nos outros filtros, mantendo as do próprio filtro", () => {
    const op = opcoesVisiveisFiltrosVeiculos(veiculos, { ...filtros, regionais: ["NORTE"] }, faixas);
    expect(op.regionais).toEqual(["NORTE", "SUL"]);
    expect(op.anos).toEqual(["2024"]);
    expect(op.classificacoes).toEqual(["A"]);
    expect(op.faixas).toEqual(new Set(["f1"]));
  });
  it("estilo Excel: opção selecionada sem veículos continua visível", () => {
    const op = opcoesVisiveisFiltrosVeiculos(veiculos, { ...filtros, regionais: ["SUL"], codigoFipe: "002001-0" }, faixas);
    expect(op.codigosFipe).toEqual(["001001-0", "002001-0"]);
    expect(op.anos).toEqual([]);
  });
  it("valor importado = 0 não inclui valores ausentes nem positivos", () => {
    expect(filtrarVeiculos(veiculos, { ...filtros, valorImportadoZero: true }, faixas).map((v) => v.chassi)).toEqual(["a"]);
  });
  it("filtra pelo código FIPE exato e combina com os demais critérios", () => {
    expect(filtrarVeiculos(veiculos, { ...filtros, codigoFipe: "001001-0", regionais: ["NORTE"], anos: ["2024"], classificacao: "A", faixa: "f1", busca: "AAA", valorImportadoZero: true }, faixas).map((v) => v.chassi)).toEqual(["a"]);
    expect(filtrarVeiculos(veiculos, { ...filtros, codigoFipe: "001" }, faixas)).toEqual([]);
  });
  it("todas as opções vêm somente dos veículos visíveis após aplicar filtros", () => {
    const opcoes = opcoesFiltrosVeiculos(filtrarVeiculos(veiculos, { ...filtros, valorImportadoZero: true }, faixas), faixas);
    expect(opcoes).toEqual({ regionais: ["NORTE"], anos: ["2024"], classificacoes: ["A"], faixas: new Set(["f1"]), codigosFipe: ["001001-0"], temValorZero: true });
  });
  it("não oferece opções inexistentes em listagem vazia", () => {
    expect(opcoesFiltrosVeiculos([], faixas)).toEqual({ regionais: [], anos: [], classificacoes: [], faixas: new Set(), codigosFipe: [], temValorZero: false });
  });
  it("não agrupa FIPE e respeita a ordenação escolhida", () => {
    const lista = filtrarVeiculos(veiculos, filtros, faixas);
    expect(ordenarLista(lista, [], (v) => v.chassi).map((v) => v.chassi)).toEqual(["a", "b", "c"]);
    expect(ordenarLista(lista, [{ key: "chassi", sentido: "desc" }], (v) => v.chassi).map((v) => v.chassi)).toEqual(["c", "b", "a"]);
  });
});

describe("faixa 61 a 75 na regional BSB", () => {
  const importados = [
    { ...base, placa: "OVO2B99", regional: "BSB", dias_em_estoque: 110, faixa_id_atual: "f2" },
    { ...base, placa: "SRI2D52", regional: "BSB", dias_em_estoque: 103, faixa_id_atual: "f2" },
    { ...base, placa: "SGX0G78", regional: "BSB", dias_em_estoque: 102, faixa_id_atual: "f2" },
    { ...base, placa: "TDY8I06", regional: "BSB", dias_em_estoque: 74, faixa_id_atual: "f2" },
    { ...base, placa: "SSQ8D92", regional: "BSB", dias_em_estoque: 61, faixa_id_atual: "f2" },
    { ...base, placa: "FORA", regional: "MG", dias_em_estoque: 70, faixa_id_atual: "f2" },
  ];
  it("exclui os três veículos acima de 75 dias mesmo com faixa gravada antiga", () => {
    expect(filtrarVeiculos(importados, { ...filtros, regionais: ["BSB"], faixa: "f2" }, faixas).map((v) => v.placa))
      .toEqual(["TDY8I06", "SSQ8D92"]);
  });
  it("oferece 75+ no menu de faixas mesmo sem nenhum veículo com esse id gravado", () => {
    expect(opcoesVisiveisFiltrosVeiculos(importados, { ...filtros, regionais: ["BSB"] }, faixas).faixas)
      .toEqual(new Set(["f2", "f3"]));
  });
  it("inclui veículos sem faixa gravada usando os dias atuais", () => {
    expect(filtrarVeiculos([{ ...base, dias_em_estoque: 252, faixa_id_atual: null }], { ...filtros, faixa: "f3" }, faixas)).toHaveLength(1);
  });
});
