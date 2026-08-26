# Prompt de Replicação Completa do Projeto (.md)

Gerar um único arquivo markdown que funcione como **prompt mestre**: colado em um projeto Lovable novo e vazio, permite reconstruir o sistema atual do zero, com todos os módulos e o banco de dados completo.

## O que será entregue

Arquivo `/mnt/documents/PROMPT-REPLICACAO-MODULO-ABSN.md` (disponível para download), estruturado assim:

### 1. Contexto e stack
Objetivo do sistema, stack fixa (TanStack Start + React + TypeScript + Tailwind + shadcn/ui + Lovable Cloud/Supabase), convenções de código e padrões de UI (tokens semânticos, dark mode, mobile-first).

### 2. Arquitetura de rotas
Mapa completo das rotas atuais (`_authenticated`, layouts por módulo, rotas públicas de login/registro/recuperação e endpoints `api/public`), com a função de cada tela.

### 3. Autenticação, perfis e permissões
- Login por usuário/e-mail de recuperação, cadastro com aprovação (`status = pending`), roles em `user_roles`.
- Portal de módulos e controle de acesso por `modulos` do perfil.
- Perfis Toyota (Administrador, Preparador, Consultor Pós-Vendas, Gestor/Vendedor de Seminovos, Mecânico) e visibilidade de menu por perfil.

### 4. Especificação módulo a módulo
Para cada módulo: propósito, telas, campos, regras de negócio, status/fluxos e permissões.
- Gestão de Projetos (tarefas, prioridade sequencial, lixeira)
- Documentos (empresas, tipos, arquivos, vencimentos)
- Certificação Toyota (importações, elegíveis/análise central, filas preparador e pós-vendas, dossiê, revisões, processos, filiais/pátios)
- Compras Seminovos (chamados, matriz de documentos por UF, débitos, histórico, notificações, configurações)
- Gestão de Rotina (setores, rotinas diárias, atividades pontuais, semanas/histórico, lixeira, KPIs, avisos)
- Análise de Estoque – Matriz
- Administração de usuários

### 5. Banco de dados — SQL pronto
Bloco SQL completo e ordenado para rodar no projeto novo:
- Enums (`app_role`, `tarefa_*`, `toyota_revisao_status`)
- Todas as tabelas do schema `public` com colunas, defaults e chaves estrangeiras (extraídas do banco atual)
- `GRANT` para `authenticated` / `service_role` em cada tabela
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + todas as políticas RLS atuais
- Funções (`has_role`, `has_filial`, `can_access_chamado`, `can_access_documentos_object`, `user_setores`, `user_has_setor`, `handle_new_user`, `update_updated_at_column`, `purge_old_trash`) e triggers
- Buckets de storage (`documentos`, `rotina-anexos`, privados) e políticas de objeto

O SQL será lido diretamente do banco atual (definições de tabelas, políticas e funções), não reescrito de memória.

### 6. Integrações e segredos
Lista dos segredos necessários (SMTP, CloudConvert, VAPID, CRON) e o que cada um habilita — apenas nomes, nunca valores.

### 7. Ordem de implementação sugerida
Sequência de prompts/etapas para o projeto novo: base + auth → banco → portal de módulos → módulos na ordem de dependência.

## Detalhes técnicos

- O conteúdo do SQL será extraído via consultas de leitura ao catálogo do Postgres (tabelas, colunas, constraints, `pg_policies`, `pg_proc`, triggers).
- Nenhum arquivo do projeto atual será alterado; a saída é apenas o `.md` em `/mnt/documents`.
- Segredos, chaves e IDs de projeto não entram no arquivo — apenas os nomes das variáveis esperadas.
