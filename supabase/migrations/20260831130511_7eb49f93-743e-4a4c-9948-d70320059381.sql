ALTER TABLE public.estoque_veiculos
  ADD COLUMN IF NOT EXISTS campos_manuais text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS editado_em timestamptz;