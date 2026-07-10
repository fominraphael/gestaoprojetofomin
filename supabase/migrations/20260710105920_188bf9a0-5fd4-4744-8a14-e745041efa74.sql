
ALTER TABLE public.compras_chamados DROP CONSTRAINT IF EXISTS compras_chamados_status_check;
ALTER TABLE public.compras_chamados ADD CONSTRAINT compras_chamados_status_check
  CHECK (status IN ('documentacao','na_fila_central','em_analise','pendenciado','comprado','cancelado'));

ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS assumido_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assumido_em TIMESTAMPTZ;
