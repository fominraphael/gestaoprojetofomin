# Importar as rotinas do Notion para o módulo Gestão de Rotina

Os 4 arquivos enviados são exportações do Notion, uma para cada setor que já existe cadastrado no módulo:

- Anúncios & Análise de Estoque
- Desmobilização & TCUV (Godrive)
- Movimentações de Estoque
- Atividades CORE

Hoje os 4 setores existem, mas estão sem nenhuma atividade e nenhuma tarefa. A proposta é carregar todo o conteúdo dos arquivos de uma vez.

## O que será cadastrado

**Atividades da rotina (42 no total, sem duplicidade)**

| Setor | Atividades |
| --- | --- |
| Anúncios & Análise de Estoque | 15 |
| Movimentações de Estoque | 14 |
| Desmobilização & TCUV | 8 |
| Atividades CORE | 5 |

- Nos arquivos, a mesma atividade aparece repetida uma vez por dia da semana. Ela será cadastrada **uma única vez**, com todos os dias marcados (ex.: "Verificação de Valores de anúncio" → Segunda + Quarta), frequência **Semanal**.
- As atividades de "Atividades CORE" não têm dia da semana definido; entram como **Sob demanda**, e a coluna "Frente" (Estoque / Anúncios) será registrada na descrição.
- A **descrição** de cada atividade vem do texto detalhado da página correspondente do Notion (o passo a passo já escrito). Onde a página está sem conteúdo, a descrição fica vazia para ser preenchida depois pelo time.
- Ordem de exibição: alfabética dentro de cada setor.

**Tarefas pontuais (23 no total)**

- Anúncios & Análise: 19 · Movimentações: 3 · Desmobilização: 1
- Cada tarefa mantém o prazo e o status do Notion, convertidos para os status do módulo: A fazer, Fazendo, Concluído.

## O que não será importado

- Imagens e PDFs anexados às páginas do Notion (ex.: prints, cartão CNPJ). Se quiser, depois anexo os arquivos nas atividades correspondentes.
- Links internos entre páginas do Notion (viram texto simples na descrição).

## Detalhes técnicos

- Carga feita via inserção de dados nas tabelas existentes `rotina_atividades` e `rotina_tarefas`, referenciando os `setor_id` já cadastrados. Nenhuma mudança de schema é necessária.
- Deduplicação por (nome da atividade + setor); `dias_semana` agregado como array de inteiros (0=Dom … 6=Sáb) conforme o padrão já usado no módulo.
- Descrições extraídas dos arquivos `.md` da exportação, removendo o cabeçalho e a linha "Dia da semana:", preservando listas e parágrafos como texto.
- `created_by` fica nulo (carga administrativa); os registros aparecem normalmente para todos os usuários com acesso ao setor.

## Confirmação

Se preferir que as 14 tarefas já **Concluídas** não sejam importadas (para deixar o quadro limpo), é só avisar antes de eu executar.
