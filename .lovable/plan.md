# Filtros estilo Excel na Matriz de Estoque: esconder opções indisponíveis

## O que muda
Nos filtros da listagem de Veículos da Matriz de Estoque (Regional, Ano Modelo, Código FIPE, Classificação, Faixa), as opções que não existem nos veículos filtrados deixam de aparecer. O negrito/atenuado deixa de ser necessário.

## Regras (como no Excel)
- Cada filtro mostra só as opções presentes nos veículos que passam pelos **outros** filtros ativos. Assim, o próprio filtro não "se esconde" e dá para marcar mais de uma opção nele.
- Opções já selecionadas continuam visíveis mesmo que fiquem sem veículos, para poder desmarcá-las.
- A busca dentro do filtro procura só entre as opções visíveis.
- Sem filtros ativos, todas as opções aparecem.
- A regra de filtragem dos veículos não muda.

## Fora do escopo
Outros módulos e as outras telas não são alterados.

## Detalhes técnicos
- `src/lib/estoque-filtros.ts`: trocar a lista "todas + disponíveis" por uma lista de opções visíveis (disponíveis nos outros filtros ∪ selecionadas).
- Componentes de filtro: remover o estilo atenuado e renderizar apenas as opções visíveis.
- Atualizar testes de `estoque-filtros` para o novo comportamento e a regra registrada no `AGENTS.md` e na memória do projeto (substituindo "opções indisponíveis ficam visíveis").
