# Por que a placa REO5G90 sugeriu R$ 90.990,00

## O que os dados mostram

O valor não veio da média de vendas — veio da FIPE. A memória de cálculo gravada para esse veículo diz:

- origem do valor base: "Percentual fixo da FIPE" (100% de R$ 86.040,00)
- histórico: nenhuma venda usada
- percentual da regra A+ / faixa "0 a 15": +5%
- 86.040 × 1,05 = 90.342 → arredondamento para 990 = **R$ 90.990,00**

Motivo: no momento do último cálculo (31/08 às 19:33) as duas vendas comparáveis ainda **não existiam no banco**. Elas foram importadas às 20:06 (Yaris 2022, 26.000 km, R$ 82.000 em 27/08 e R$ 79.000 em 25/08 — média exatamente R$ 80.500). As faixas de KM também só foram cadastradas às 19:44.

Ou seja: o cálculo está correto para os dados que existiam naquele instante; ele está apenas desatualizado.

## O problema que impede a correção sozinha

Rodar "Recalcular" hoje **não muda nada**. O motor tem uma trava: se o veículo já tem valor calculado e continua na mesma faixa de dias, ele retorna "Veículo permanece na mesma faixa" e não recalcula a base. Como esse Yaris segue na faixa "0 a 15", o valor de FIPE fica congelado mesmo depois da importação das vendas.

## O que fazer

1. **Recalcular forçado**: opção de recalcular ignorando a trava de "mesma faixa", refazendo a precificação base a partir dos dados atuais (usado após importar vendas ou alterar regras). Disponível como botão na tela de estoque e como ação por veículo.
2. **Recalcular após importação**: ao concluir a importação de vendas históricas, oferecer o recálculo forçado dos veículos ativos, já que a base comparável mudou.
3. **Duplicidade a resolver**: existem dois registros ativos para o chassi 9BRKC9F32N8155012 (mesma placa REO5G90), ambos com R$ 90.990,00. Um deles deve ir para a lixeira — confirmar qual origem manter.

## Resultado esperado após o recálculo

Com as duas vendas no radar, a base passa a ser a média de R$ 80.500. Atenção: hoje a célula A+ / "0 a 15" tem **dois** acréscimos de 5% configurados — um no nível de histórico (ajuste do nível) e outro no percentual da regra. O resultado seria 80.500 × 1,05 × 1,05 = 88.751 → **R$ 89.990,00**. Se a intenção é apenas um acréscimo de 5% (média → R$ 84.525 → R$ 84.990), o ajuste de 5% no nível de histórico deve ser zerado na Matriz de Regras.

## Detalhes técnicos

- `src/lib/estoque-motor.ts`: `calcularValorAnuncio` — adicionar opção `forcar` que ignora o early-return de "mesma faixa" e refaz a base via `valorBaseConfiguravel`.
- `src/lib/estoque.ts`: `recalcularTodos` aceita `{ forcar }` e repassa ao motor; grava histórico em `estoque_valor_historico` normalmente.
- `src/routes/_authenticated._estoque-matriz.estoque-matriz.index.tsx`: botão "Recalcular (forçado)" e ação por linha.
- `src/routes/_authenticated._estoque-matriz.estoque-matriz.importar.tsx`: sugerir recálculo forçado ao final da importação de vendas.
