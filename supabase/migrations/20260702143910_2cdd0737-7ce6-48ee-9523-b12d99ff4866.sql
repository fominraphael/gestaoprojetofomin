
ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS posvendas_km integer,
  ADD COLUMN IF NOT EXISTS posvendas_finalizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS posvendas_finalizado_por text;
