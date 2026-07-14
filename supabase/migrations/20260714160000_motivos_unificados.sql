-- Motivos unificados: insere motivos de suspensão no compras_cadastros
-- Os motivos de pendência e cancelamento já existem na tabela.
-- Esta migration garante que motivos_suspensao estejam disponíveis no banco.

-- 1. Inserir motivos de suspensão que antes estavam hardcoded
INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, ativo)
VALUES
  ('motivo_suspensao', 'aguardando_laudo_terceiros',   'Aguardando laudo de terceiros',         1, true),
  ('motivo_suspensao', 'aguardando_quitacao_debito',   'Aguardando quitação de débito',         2, true),
  ('motivo_suspensao', 'aguardando_doc_terceiros',     'Aguardando documentação de terceiros',  3, true),
  ('motivo_suspensao', 'aguardando_regularizacao_detran', 'Aguardando regularização DETRAN',    4, true),
  ('motivo_suspensao', 'aguardando_decisao_judicial',  'Aguardando decisão judicial',           5, true),
  ('motivo_suspensao', 'aguardando_desalienacao',      'Aguardando desalienação',               6, true),
  ('motivo_suspensao', 'outros_suspensao',             'Outros',                                7, true)
ON CONFLICT DO NOTHING;

-- 2. Garantir que a coluna 'motivo_suspensao' exista na tabela de chamados
-- (já criada pela migration anterior, mas garantimos idempotência)
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS motivo_suspensao    text,
  ADD COLUMN IF NOT EXISTS observacao_suspensao text,
  ADD COLUMN IF NOT EXISTS suspenso_em         timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por        uuid REFERENCES auth.users(id);
