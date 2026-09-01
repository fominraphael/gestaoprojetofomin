ALTER TABLE public.estoque_veiculos
  ADD COLUMN IF NOT EXISTS inativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inativado_em timestamptz;
CREATE INDEX IF NOT EXISTS idx_estoque_veiculos_inativo ON public.estoque_veiculos (inativo) WHERE deleted_at IS NULL;