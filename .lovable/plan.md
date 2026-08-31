# Vendas Históricas mostrando só 1.000 registros

## Diagnóstico (confirmado)

A tabela tem **4.766 vendas ativas** no banco, mas a tela exibe 1.000. O motivo não é a importação: o backend de dados limita qualquer consulta a 1.000 linhas por requisição. O `.limit(20000)` já existente no código não tem efeito porque o teto do servidor é aplicado depois.

Isso afeta não só a tela de Vendas Históricas — o mesmo teto silencioso corta:
- a lista de veículos em Estoque / Repasse / Vendidos / Lixeira,
- os anúncios (inclusive a checagem de mercado do motor de preços),
- o histórico de vendas usado no cálculo do valor sugerido (hoje o motor só enxerga as 1.000 vendas mais recentes, o que distorce as médias comparáveis).

## O que fazer

1. Criar em `src/lib/estoque.ts` um utilitário de leitura paginada (busca em blocos de 1.000 via `range`, até acabar o resultado).
2. Aplicar esse utilitário em todas as leituras de lista do módulo:
   - `getVendasHistorico` (tela Vendas Históricas, ativas e lixeira)
   - `getVendas` (base comparável do motor de precificação)
   - `getVeiculos` (Estoque, Repasse, Vendidos, Lixeira)
   - `getAnuncios` e `getAnunciosMercado` (Veículos Anunciados e checagem de mercado)
   - `getAnunciosRows` / demais listagens completas do módulo
3. Manter ordenação estável nas consultas paginadas (ordenar por campo + `id`) para não repetir nem pular linhas entre blocos.
4. Exibir na tela de Vendas Históricas o total real carregado (o rodapé "X de Y vendas" passa a refletir os 4.766).

## Observação técnica

Nenhuma migração é necessária; a mudança é só na camada de acesso a dados. Após o ajuste, vale rodar um recálculo geral, já que o motor passará a considerar todo o histórico de vendas e os valores sugeridos podem mudar.
