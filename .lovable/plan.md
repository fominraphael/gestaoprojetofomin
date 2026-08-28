# Módulo Análise de Estoque (Matriz) — implementação completa

Hoje o módulo `estoque-matriz` existe apenas como casca (3 telas "Em desenvolvimento"). O plano substitui essa casca pelo módulo completo descrito no arquivo enviado, com o motor de regras 100% configurável em tela.

## Premissas que assumo (confirme se discordar)
- Acesso ao módulo continua controlado por `modulos` do perfil + Administrador (mesmo padrão dos demais módulos).
- Importação de planilhas em `.xlsx`/`.csv`, processada no navegador (biblioteca de leitura de planilha) e gravada em lote no banco.
- Recálculo do motor roda ao final de cada importação de estoque e também sob demanda por um botão "Recalcular".
- Valores monetários em `numeric(14,2)`; datas de venda como `date`.

## Banco de dados (novas tabelas, todas com GRANT + RLS)
Configuração:
- `estoque_origens` (codigo, nome)
- `estoque_empresas_nbs` (origem_id, codigo_chassi_resumido, nome_exibicao) — único por (origem, código)
- `estoque_finalidades` (nome, ativo)
- `estoque_faixas_dias` (nome, dia_inicio, dia_fim, ordem)
- `estoque_regras` (classificacao A+/A/B/C/D × faixa_id, tipo de regra, percentual, arredonda_990, piso/teto FIPE ativáveis, canais exigidos, gera_tarefa + nome_tarefa)
- `estoque_regra_leads` (faixas de leads min/máx com percentual próprio dentro da mesma regra)

Dados:
- `estoque_veiculos` — chave única (chassi, origem_id, chassi_resumido); campos da planilha + `valor_anuncio_calculado`, `finalidade_atual`, `deleted_at` (lixeira)
- `estoque_vendas_historico` — planilha de vendidos
- `estoque_anuncios` — planilha de anúncios, todas as colunas guardadas (colunas fixas principais + `dados jsonb` para as plataformas), match por chassi
- `estoque_valor_historico` — auditoria: valor anterior → novo, regra/faixa, percentual, e `memoria_calculo jsonb` (leads, vendas usadas na média, % FIPE, piso/teto)
- `estoque_tarefas_lead` — tarefa gerada por regra, com checkbox concluído
- `estoque_importacoes` — log de cada importação com relatório (importados/atualizados/ignorados + motivos)

RLS: leitura/escrita para usuários autenticados com o módulo liberado; exclusão permanente e configurações restritas a Administrador.

## Motor de precificação (`src/lib/estoque-motor.ts`)
Função pura, testável, sem valores fixos:
1. `arredonda990(valor)` — sempre para cima até o próximo final 990.
2. `valorVendaHistorico(veiculo, vendas)` — mesmo Código FIPE + Ano Modelo + faixa de KM (0–15k, 15–30k, 30–45k, 45–60k, +60k); 30 dias → média se ≥2 registros; senão 60 dias → média se ≥2; senão FIPE 100%.
3. `calcular(veiculo, regras, faixas, anuncios)`:
   - Veículo novo → regra "Precificação Base" da faixa atual (histórico/FIPE + %, arredondamento, piso/teto FIPE se ativos).
   - Mudança de faixa → aplica o ajuste da faixa atual **sobre o valor anunciado atual** (cumulativo), percentual escolhido pelo gatilho de leads.
   - Veículo que entra já em faixa avançada → calcula base como na primeira faixa e aplica direto o ajuste da faixa atual.
   - Regra "Mudança de finalidade" → move para Repasse.
   - Toda alteração grava linha de auditoria com a memória de cálculo.

## Telas (rotas sob `/estoque-matriz`)
- `/estoque-matriz` — **Veículos**: filtros (Origem, Classificação, Faixa, Finalidade, Status), colunas pedidas, tooltip de auditoria no valor de anúncio, soft delete, botão "Recalcular".
- `/estoque-matriz/repasse` — veículos movidos para Repasse.
- `/estoque-matriz/acoes-leads` — tarefas geradas, checkbox concluído.
- `/estoque-matriz/lixeira` — restaurar / excluir permanentemente.
- `/estoque-matriz/importar` — três wizards (Estoque / Vendidos / Anúncios): upload, validação de colunas, prévia, execução e relatório final linha a linha.
- `/estoque-matriz/regras` — **Configurações** em abas: Origens, Empresa NBS, Finalidades, Faixas de dias e a Matriz Classificação × Faixa (grade clicável abrindo o editor da regra).

Menu lateral do módulo atualizado com as novas telas. UI segue o padrão atual (tokens semânticos, full-width, dark mode, mobile-first).

## Ordem de execução
1. Migração do banco (tabelas + GRANT + RLS + seeds das faixas padrão 0-15/16-30/31-45/46-60 e das 5 classificações).
2. Camada de dados e motor de regras.
3. Configurações + Matriz de Regras.
4. Importações com relatório.
5. Listagem de veículos, auditoria, Repasse, Lixeira, Ações de Leads.
