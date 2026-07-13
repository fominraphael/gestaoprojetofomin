/**
 * Versão do sistema.
 *
 * Convenção semântica: MAJOR.MINOR.PATCH
 * - MAJOR: novo módulo grande / quebra de fluxo
 * - MINOR: nova feature dentro de módulo existente
 * - PATCH: correções, ajustes de UI, refinos
 *
 * Baseline v3.2.0 considera o histórico consolidado do projeto:
 *  v1.0.0 — Base inicial (auth, projetos/tarefas)
 *  v1.5.0 — Módulo Documentos + notificações
 *  v2.0.0 — Módulo Certificação Toyota (estoque, elegíveis, dossiê)
 *  v2.3.0 — Fila Pós-Vendas / Preparador, análise central, recusados
 *  v2.5.0 — Painel Geral → Processos + gestão de filiais/pátios
 *  v2.7.0 — Refino Gestão de Projetos (ordem manual, filtros, colunas)
 *  v3.0.0 — Módulo Compras Seminovos (chamados, docs, débitos, histórico)
 *  v3.1.0 — Hardening de segurança (RLS, security definer, storage)
 *  v3.2.0 — Aprovação de usuários, nome fantasia, campos por estado agrupados
 */
export const APP_VERSION = "v3.2.0";
