# Categoria "Vendidos" + correção da duplicidade na importação de estoque

Hoje `estoque_veiculos` só tem `em_repasse` (boolean) como categoria além do estoque ativo. A checagem de duplicidade na importação já ignora a lixeira (`deleted_at`), mas não existe a categoria Vendidos. O plano adiciona essa categoria com movimentação automática a partir da planilha de Vendas históricas.

## Premissas confirmadas
- Vendidos são identificados pela **planilha de Vendas históricas** (tabela `estoque_vendas_historico`), casando pelo **chassi** do veículo.
- Vendidos vira **novo item no menu** lateral do módulo (`/estoque-matriz/vendidos`).
- Venda cancelada (veículo volta ao estoque) → entra no recálculo normal do motor.

## Banco de dados
Migração em `estoque_veiculos`:
- Nova coluna `em_vendido boolean not null default false`.
- Índice parcial para listagem (`where deleted_at is null`).
- Sem mudança de RLS (tabela já coberta).

## Lógica de importação (`src/lib/estoque.ts`)

### Casamento venda × compra (regra anti-falso-positivo)
Como o mesmo chassi pode ter várias compras (chassi resumido diferente) e a planilha de vendas não tem origem/chassi resumido, uma venda só se aplica a um registro quando `data_venda >= importado_em` daquele registro (a venda aconteceu DEPOIS daquela compra entrar no estoque). Se houver mais de um registro elegível para o mesmo chassi, aplica-se no mais recente.

### `importarEstoque` (planilha de estoque)
1. Carrega os chassis presentes em `estoque_vendas_historico` (chassi + data_venda).
2. Linha cujo registro encontrado (mesmo chassi + origem + chassi resumido) está **em_vendido**:
   - Se o chassi consta nas vendas com `data_venda >= importado_em` → permanece Vendidos (apenas atualiza os dados da planilha).
   - Se **não** consta → **venda cancelada**: reverte `em_vendido = false`, atualiza os dados e volta para Estoque (recálculo normal já roda ao final da importação). Relatório marca como "venda cancelada / retornou ao estoque".
3. Linha de veículo ativo (Estoque/Repasse) cujo chassi consta nas vendas com data posterior à entrada → move para **Vendidos** (`em_vendido = true`) em vez de atualizar como estoque. Relatório marca como "movido para Vendidos".
4. Lixeira/excluídos permanentemente continuam fora da checagem de duplicidade (já implementado; validado de novo).

### `importarVendas` (planilha de vendas históricas)
Após o upsert em lote, varre os chassis importados e move para Vendidos os registros ativos (Estoque/Repasse) que casem pela regra acima. Isso cobre o caso de a planilha de vendas ser importada depois da de estoque.

### `recalcularTodos`
Passa a ignorar registros `em_vendido = true` (vendido não tem preço recalculado nem vai para Repasse enquanto vendido).

### `getVeiculos`
- `estoque` (padrão): `deleted_at is null` AND `em_repasse = false` AND `em_vendido = false`.
- `repasse`: `em_repasse = true` (inalterado).
- Novo `vendidos`: `em_vendido = true`.
- Lixeira: inalterada.

## Telas
- Nova rota `/estoque-matriz/vendidos` (`_authenticated._estoque-matriz.estoque-matriz.vendidos.tsx`) reutilizando `VeiculosTable` com `modo="vendidos"`, mesma estrutura da tela Repasse (filtros, auditoria, exportação XLSX, mover para lixeira).
- Menu lateral do módulo (`_authenticated._estoque-matriz.tsx`): novo item "Vendidos" entre Repasse e Lixeira.
- Relatório de importação: novos contadores no `RelatorioImportacao` (`movidosVendidos`, `vendasCanceladas`) exibidos como badges na tela de Importação.

## Ordem de execução
1. Migração (`em_vendido` + índice).
2. `estoque.ts`: getVeiculos, importarEstoque, importarVendas, recalcularTodos, tipo RelatorioImportacao.
3. Rota Vendidos + item de menu + badges no relatório da tela de Importação.
