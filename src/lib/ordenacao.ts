// Ordenação genérica (simples e múltipla) reutilizável por todas as tabelas.
// Valores vazios, nulos ou "Não informado"/"—" ficam SEMPRE no fim, em qualquer sentido.

export type SentidoOrdem = "asc" | "desc";
export interface CriterioOrdem {
  key: string;
  sentido: SentidoOrdem;
}
/** Valor bruto usado para ordenar: número, data, texto ou vazio. */
export type ValorOrdenavel = string | number | boolean | Date | null | undefined;

const VAZIOS = new Set(["", "—", "-", "nao informado", "não informado", "n/a"]);

const colador = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

export function ehVazio(v: ValorOrdenavel): boolean {
  if (v == null) return true;
  if (typeof v === "number") return !Number.isFinite(v);
  if (v instanceof Date) return Number.isNaN(v.getTime());
  if (typeof v === "string") return VAZIOS.has(v.trim().toLowerCase());
  return false;
}

/** Compara dois valores não vazios em ordem crescente. */
export function compararValores(a: ValorOrdenavel, b: ValorOrdenavel): number {
  const na = a instanceof Date ? a.getTime() : typeof a === "boolean" ? Number(a) : a;
  const nb = b instanceof Date ? b.getTime() : typeof b === "boolean" ? Number(b) : b;
  if (typeof na === "number" && typeof nb === "number") return na - nb;
  return colador.compare(String(na), String(nb));
}

/** Ordena uma cópia da lista pelos critérios em sequência de prioridade. */
export function ordenarLista<T>(
  lista: readonly T[],
  criterios: readonly CriterioOrdem[],
  acessor: (item: T, key: string) => ValorOrdenavel,
): T[] {
  if (criterios.length === 0) return [...lista];
  return [...lista].sort((x, y) => {
    for (const c of criterios) {
      const a = acessor(x, c.key);
      const b = acessor(y, c.key);
      const va = ehVazio(a);
      const vb = ehVazio(b);
      if (va || vb) {
        if (va && vb) continue;
        return va ? 1 : -1; // vazios no fim, independente do sentido
      }
      const r = compararValores(a, b);
      if (r !== 0) return c.sentido === "asc" ? r : -r;
    }
    return 0;
  });
}

/**
 * Clique no cabeçalho: crescente → decrescente → sem ordenação.
 * Sem SHIFT substitui a ordenação; com SHIFT adiciona/alterna mantendo as demais.
 */
export function alternarCriterio(
  atual: readonly CriterioOrdem[],
  key: string,
  multiplo: boolean,
): CriterioOrdem[] {
  const existente = atual.find((c) => c.key === key);
  const proximo: SentidoOrdem | null = !existente
    ? "asc"
    : existente.sentido === "asc"
      ? "desc"
      : null;
  if (!multiplo) return proximo ? [{ key, sentido: proximo }] : [];
  if (!existente) return [...atual, { key, sentido: "asc" }];
  if (!proximo) return atual.filter((c) => c.key !== key);
  return atual.map((c) => (c.key === key ? { key, sentido: proximo } : c));
}
