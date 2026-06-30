
ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS chassi_resumido text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS resultado_laudo text,
  ADD COLUMN IF NOT EXISTS fonte_importacao text NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS uq_toyota_estoque_external_id
  ON public.toyota_estoque_veiculos (external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_toyota_estoque_chassi_global
  ON public.toyota_estoque_veiculos (chassi);

ALTER TABLE public.toyota_estoque_veiculos
  DROP CONSTRAINT IF EXISTS toyota_estoque_veiculos_status_aprovacao_check;

ALTER TABLE public.toyota_estoque_veiculos
  ADD CONSTRAINT toyota_estoque_veiculos_status_aprovacao_check
  CHECK (status_aprovacao IN (
    'analise',
    'pendente_preparacao',
    'aguardando_analise_central',
    'enviado_toyota',
    'aprovado_toyota',
    'reprovado_toyota',
    'aprovado',
    'rejeitado'
  ));
