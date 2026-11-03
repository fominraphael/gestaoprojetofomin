import { describe, expect, it } from "vitest";
import { ordenarVeiculosPorFipe } from "./estoque-agrupamento-fipe";

interface Item {
  id: string;
  codigo_fipe: string | null;
  loja: string;
  dias: number;
}

const lista: Item[] = [
  { id: "a", codigo_fipe: "002001-0", loja: "A", dias: 10 },
  { id: "b", codigo_fipe: "001001-0", loja: "A", dias: 20 },
  { id: "c", codigo_fipe: "002001-0", loja: "B", dias: 30 },
  { id: "d", codigo_fipe: "001001-0", loja: "A", dias: 5 },
  { id: "e", codigo_fipe: null, loja: "A", dias: 50 },
];
const acessor = (item: Item, key: string) => key === "dias" ? item.dias : item.loja;

describe("agrupamento FIPE da Matriz de Estoque", () => {
  it("mantém códigos iguais consecutivos sem critérios de ordenação", () => {
    expect(ordenarVeiculosPorFipe(lista, [], acessor).map((v) => v.id))
      .toEqual(["b", "d", "a", "c", "e"]);
    expect(lista.map((v) => v.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("mantém o agrupamento após filtros combinados e ordenação por outra coluna", () => {
    const filtrados = lista.filter((v) => v.loja === "A" && v.dias >= 5);
    expect(ordenarVeiculosPorFipe(filtrados, [{ key: "dias", sentido: "desc" }], acessor)
      .map((v) => v.id)).toEqual(["b", "d", "a", "e"]);
  });

  it("prioriza FIPE mesmo quando outro critério vem antes e deixa vazios no fim", () => {
    const itens = [...lista, { id: "f", codigo_fipe: "  ", loja: "A", dias: 99 }];
    expect(ordenarVeiculosPorFipe(itens, [
      { key: "dias", sentido: "desc" },
      { key: "codigo_fipe", sentido: "desc" },
    ], acessor).map((v) => v.id)).toEqual(["c", "a", "b", "d", "f", "e"]);
  });
});