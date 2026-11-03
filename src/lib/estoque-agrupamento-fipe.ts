import { ordenarLista, type CriterioOrdem, type ValorOrdenavel } from "./ordenacao";

/** O código FIPE tem prioridade fixa; os demais critérios ordenam dentro de cada grupo. */
export function ordenarVeiculosPorFipe<T extends { codigo_fipe: string | null }>(
  lista: readonly T[],
  criterios: readonly CriterioOrdem[],
  acessor: (item: T, key: string) => ValorOrdenavel,
): T[] {
  const sentidoFipe = criterios.find((c) => c.key === "codigo_fipe")?.sentido ?? "asc";
  return ordenarLista(
    lista,
    [{ key: "codigo_fipe", sentido: sentidoFipe }, ...criterios.filter((c) => c.key !== "codigo_fipe")],
    (item, key) => key === "codigo_fipe" ? item.codigo_fipe?.trim() : acessor(item, key),
  );
}