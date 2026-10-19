import { describe, expect, it } from "vitest";
import { alternarCriterio, ordenarLista } from "./ordenacao";

type L = { regional: string | null; wm: number | null; dias: number };
const ac = (l: L, k: string) => l[k as keyof L];

describe("ordenação de tabelas", () => {
  it("ordem múltipla: Regional A→Z, Webmotors maior→menor, Dias maior→menor", () => {
    const lista: L[] = [
      { regional: "B", wm: 100, dias: 1 },
      { regional: "A", wm: 50, dias: 9 },
      { regional: "A", wm: 80, dias: 2 },
      { regional: "A", wm: 80, dias: 7 },
    ];
    const r = ordenarLista(lista, [
      { key: "regional", sentido: "asc" },
      { key: "wm", sentido: "desc" },
      { key: "dias", sentido: "desc" },
    ], ac);
    expect(r.map((x) => `${x.regional}${x.wm}-${x.dias}`)).toEqual(["A80-7", "A80-2", "A50-9", "B100-1"]);
  });

  it("vazios e 'Não informado' ficam no fim nos dois sentidos", () => {
    const lista: L[] = [
      { regional: null, wm: null, dias: 0 },
      { regional: "Não informado", wm: 10, dias: 0 },
      { regional: "C", wm: 5, dias: 0 },
    ];
    expect(ordenarLista(lista, [{ key: "wm", sentido: "asc" }], ac)[2]!.wm).toBeNull();
    expect(ordenarLista(lista, [{ key: "wm", sentido: "desc" }], ac)[2]!.wm).toBeNull();
    expect(ordenarLista(lista, [{ key: "regional", sentido: "desc" }], ac)[0]!.regional).toBe("C");
  });

  it("clique alterna crescente → decrescente → sem ordenação; SHIFT soma", () => {
    let c = alternarCriterio([], "a", false);
    expect(c).toEqual([{ key: "a", sentido: "asc" }]);
    c = alternarCriterio(c, "a", false);
    expect(c).toEqual([{ key: "a", sentido: "desc" }]);
    expect(alternarCriterio(c, "a", false)).toEqual([]);
    expect(alternarCriterio(c, "b", true)).toEqual([{ key: "a", sentido: "desc" }, { key: "b", sentido: "asc" }]);
    expect(alternarCriterio(c, "b", false)).toEqual([{ key: "b", sentido: "asc" }]);
  });
});
