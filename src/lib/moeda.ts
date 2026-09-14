// Utilitários de moeda brasileira (R$) para exibição e para máscara de digitação.
// O valor trafega sempre como número puro; a máscara existe apenas na camada visual.

/** Formata um número como R$ 0.000,00. Retorna "" quando nulo. */
export function formatarMoedaBR(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return "";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Aplica a máscara progressiva a partir do texto digitado.
 * Considera apenas dígitos: os dois últimos são os centavos.
 */
export function mascararMoedaBR(entrada: string): string {
  const digitos = (entrada ?? "").replace(/\D/g, "").slice(0, 15);
  if (digitos === "") return "";
  const numero = Number(digitos) / 100;
  return formatarMoedaBR(numero);
}

/** Converte o texto mascarado de volta para número puro. Retorna null quando vazio. */
export function parseMoedaBR(texto: string): number | null {
  const digitos = (texto ?? "").replace(/\D/g, "");
  if (digitos === "") return null;
  return Number(digitos) / 100;
}
