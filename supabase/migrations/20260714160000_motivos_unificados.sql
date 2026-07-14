-- Motivos de suspensão: insere no compras_cadastros usando categoria='motivo_pendencia' + grupo='suspensao'
-- Não altera o CHECK constraint existente

-- 1. Inserir motivos de suspensão (categoria=motivo_pendencia, grupo=suspensao)
INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, ativo, grupo)
SELECT v.categoria, v.valor, v.label, v.ordem, v.ativo, v.grupo
FROM (VALUES
  ('motivo_pendencia', 'susp_aguardando_laudo_terceiros',      'Aguardando laudo de terceiros',          1, true, 'suspensao'),
  ('motivo_pendencia', 'susp_aguardando_quitacao_debito',      'Aguardando quitação de débito',          2, true, 'suspensao'),
  ('motivo_pendencia', 'susp_aguardando_doc_terceiros',        'Aguardando documentação de terceiros',   3, true, 'suspensao'),
  ('motivo_pendencia', 'susp_aguardando_regularizacao_detran', 'Aguardando regularização DETRAN',        4, true, 'suspensao'),
  ('motivo_pendencia', 'susp_aguardando_decisao_judicial',     'Aguardando decisão judicial',            5, true, 'suspensao'),
  ('motivo_pendencia', 'susp_aguardando_desalienacao',         'Aguardando desalienação',                6, true, 'suspensao'),
  ('motivo_pendencia', 'susp_outros',                          'Outros',                                 7, true, 'suspensao')
) AS v(categoria, valor, label, ordem, ativo, grupo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.compras_cadastros
  WHERE valor = v.valor
);

-- 2. Garantir que as colunas de suspensão existam na tabela de chamados
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS motivo_suspensao     text,
  ADD COLUMN IF NOT EXISTS observacao_suspensao text,
  ADD COLUMN IF NOT EXISTS suspenso_em          timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por         uuid REFERENCES auth.users(id);
