-- Motivos unificados: adiciona motivo_suspensao ao CHECK constraint e insere dados

-- 1. Atualizar o CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'compras_cadastros_categoria_check'
      AND conrelid = 'public.compras_cadastros'::regclass
  ) THEN
    ALTER TABLE public.compras_cadastros
      DROP CONSTRAINT compras_cadastros_categoria_check;
  END IF;

  ALTER TABLE public.compras_cadastros
    ADD CONSTRAINT compras_cadastros_categoria_check
    CHECK (categoria IN (
      'loja_estoque','tipo_compra','motivo_pendencia','motivo_cancelamento',
      'motivo_suspensao','tipo_debito','estado_uf','campo_formulario',
      'documento','status_debito'
    ));
END $$;

-- 2. Inserir motivos de suspensão
INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, ativo)
SELECT v.categoria, v.valor, v.label, v.ordem, v.ativo
FROM (VALUES
  ('motivo_suspensao', 'aguardando_laudo_terceiros',      'Aguardando laudo de terceiros',          1, true),
  ('motivo_suspensao', 'aguardando_quitacao_debito',      'Aguardando quitação de débito',          2, true),
  ('motivo_suspensao', 'aguardando_doc_terceiros',        'Aguardando documentação de terceiros',   3, true),
  ('motivo_suspensao', 'aguardando_regularizacao_detran', 'Aguardando regularização DETRAN',        4, true),
  ('motivo_suspensao', 'aguardando_decisao_judicial',     'Aguardando decisão judicial',            5, true),
  ('motivo_suspensao', 'aguardando_desalienacao',         'Aguardando desalienação',                6, true),
  ('motivo_suspensao', 'outros_suspensao',                'Outros',                                 7, true)
) AS v(categoria, valor, label, ordem, ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.compras_cadastros
  WHERE categoria = v.categoria AND valor = v.valor
);

-- 3. Garantir colunas na tabela de chamados
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS motivo_suspensao     text,
  ADD COLUMN IF NOT EXISTS observacao_suspensao text,
  ADD COLUMN IF NOT EXISTS suspenso_em          timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por         uuid REFERENCES auth.users(id);
