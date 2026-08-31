ALTER TABLE public.estoque_veiculos
  ADD COLUMN IF NOT EXISTS em_vendido boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS estoque_veiculos_vendidos_idx
  ON public.estoque_veiculos (em_vendido)
  WHERE deleted_at IS NULL;