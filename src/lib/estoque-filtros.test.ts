import { describe, expect, it } from "vitest";
import { opcoesVisiveisFiltrosVeiculos, filtrarVeiculos, opcoesFiltrosVeiculos, type FiltrosVeiculos, type VeiculoFiltravel } from "./estoque-filtros";
import { ordenarLista } from "./ordenacao";

const filtros: FiltrosVeiculos = { busca: "", regionais: [], anos: [], classificacao: null, faixa: null, codigoFipe: null, valorImportadoZero: false };
const base: VeiculoFiltravel = { chassi: "a", placa: "AAA1A11", modelo: "Modelo", loja: "Loja", regional: "Norte", ano_mod: "2023/2024", classificacao: "A", faixa_id_atual: "f1", codigo_fipe: "001001-0", valor_anunciado_planilha: 0 };
const veiculos = [base, { ...base, chassi: "b", codigo_fipe: "002001-0", valor_anunciado_planilha: 100 }, { ...base, chassi: "c", regional: "Sul", ano_mod: "2020/2021", classificacao: "B", faixa_id_atual: "f2", valor_anunciado_planilha: null }];

describe("filtros da Matriz de Estoque", () => {
  it("estilo Excel: esconde opções sem veículos nos outros filtros, mantendo as do próprio filtro", () => {
    const op = opcoesVisiveisFiltrosVeiculos(veiculos, { ...filtros, regionais: ["NORTE"] });
    expect(op.regionais).toEqual(["NORTE", "SUL"]);
    expect(op.anos).toEqual(["2024"]);
    expect(op.classificacoes).toEqual(["A"]);
    expect(op.faixas).toEqual(new Set(["f1"]));
  });
  it("estilo Excel: opção selecionada sem veículos continua visível", () => {
    const op = opcoesVisiveisFiltrosVeiculos(veiculos, { ...filtros, regionais: ["SUL"], codigoFipe: "002001-0" });
    expect(op.codigosFipe).toEqual(["001001-0", "002001-0"]);
    expect(op.anos).toEqual([]);
  });
  it("valor importado = 0 não inclui valores ausentes nem positivos", () => {
    expect(filtrarVeiculos(veiculos, { ...filtros, valorImportadoZero: true }).map((v) => v.chassi)).toEqual(["a"]);
  });
  it("filtra pelo código FIPE exato e combina com os demais critérios", () => {
    expect(filtrarVeiculos(veiculos, { ...filtros, codigoFipe: "001001-0", regionais: ["NORTE"], anos: ["2024"], classificacao: "A", faixa: "f1", busca: "AAA", valorImportadoZero: true }).map((v) => v.chassi)).toEqual(["a"]);
    expect(filtrarVeiculos(veiculos, { ...filtros, codigoFipe: "001" })).toEqual([]);
  });
  it("todas as opções vêm somente dos veículos visíveis após aplicar filtros", () => {
    const opcoes = opcoesFiltrosVeiculos(filtrarVeiculos(veiculos, { ...filtros, valorImportadoZero: true }));
    expect(opcoes).toEqual({ regionais: ["NORTE"], anos: ["2024"], classificacoes: ["A"], faixas: new Set(["f1"]), codigosFipe: ["001001-0"], temValorZero: true });
  });
  it("não oferece opções inexistentes em listagem vazia", () => {
    expect(opcoesFiltrosVeiculos([])).toEqual({ regionais: [], anos: [], classificacoes: [], faixas: new Set(), codigosFipe: [], temValorZero: false });
  });
  it("não agrupa FIPE e respeita a ordenação escolhida", () => {
    const lista = filtrarVeiculos(veiculos, filtros);
    expect(ordenarLista(lista, [], (v) => v.chassi).map((v) => v.chassi)).toEqual(["a", "b", "c"]);
    expect(ordenarLista(lista, [{ key: "chassi", sentido: "desc" }], (v) => v.chassi).map((v) => v.chassi)).toEqual(["c", "b", "a"]);
  });
});