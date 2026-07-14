-- Motivos unificados: adiciona motivo_suspensao ao CHECK constraint e insere dados

-- 1. Atualizar o CHECK constraint de categoria para incluir 'motivo_suspensao'
ALTER TABLE public.compras_cadastros
  DROP CONSTRAINT IF EXISTS compras_cadastros_categoria_check;

ALTER TABLE public.compras_cadastros
  ADD CONSTRAINT compras_cadastros_categoria_check
  CHECK (categoria IN (
    'loja_estoque','tipo_compra','motivo_pendencia','motivo_cancelamento',
    'motivo_suspensao','tipo_debito','estado_uf','campo_formulario',
    'documento','status_debito'
  ));

-- 2. Inserir motivos de suspensão que antes estavam hardcoded
INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, ativo)
VALUES
  ('motivo_suspensao', 'aguardando_laudo_terceiros',      'Aguardando laudo de terceiros',          1, true),
  ('motivo_suspensao', 'aguardando_quitacao_debito',      'Aguardando quitação de débito',          2, true),
  ('motivo_suspensao', 'aguardando_doc_terceiros',        'Aguardando documentação de terceiros',   3, true),
  ('motivo_suspensao', 'aguardando_regularizacao_detran', 'Aguardando regularização DETRAN',        4, true),
  ('motivo_suspensao', 'aguardando_decisao_judicial',     'Aguardando decisão judicial',            5, true),
  ('motivo_suspensao', 'aguardando_desalienacao',         'Aguardando desalienação',                6, true),
  ('motivo_suspensao', 'outros_suspensao',                'Outros',                                 7, true)
ON CONFLICT DO NOTHING;

-- 3. Garantir que as colunas de suspensão existam na tabela de chamados
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS motivo_suspensao    text,
  ADD COLUMN IF NOT EXISTS observacao_suspensao text,
  ADD COLUMN IF NOT EXISTS suspenso_em         timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por        uuid REFERENCES auth.users(id);
