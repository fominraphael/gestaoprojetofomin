ALTER TABLE public.estoque_veiculos
  ADD COLUMN IF NOT EXISTS valor_motor numeric,
  ADD COLUMN IF NOT EXISTS valor_manual_faixa_id uuid;

ALTER TABLE public.estoque_acoes_matriz
  ADD COLUMN IF NOT EXISTS faixa_id uuid;