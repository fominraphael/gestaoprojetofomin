import { calcularValorAnuncio, type FaixaDias, type RegraEstoque, type VeiculoCalculo, type VendaHistorica } from "./estoque-motor";

/** Operação excepcional e explícita: não modifica o recálculo normal nem sua trava. */
export function reprocessarValorAnuncio(
  veiculo: VeiculoCalculo,
  faixas: FaixaDias[],
  regras: RegraEstoque[],
  vendas: VendaHistorica[],
  opts: Parameters<typeof calcularValorAnuncio>[4] = {},
) {
  const resultado = calcularValorAnuncio(
    { ...veiculo, valor_anuncio_calculado: null }, faixas, regras, vendas, opts,
  );
  return {
    ...resultado,
    valorAnterior: veiculo.valor_anuncio_calculado,
    memoria: { ...resultado.memoria, reprocessamento_configuracoes: true },
  };
}