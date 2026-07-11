ALTER TABLE public.compras_historico
  ADD COLUMN IF NOT EXISTS campo text,
  ADD COLUMN IF NOT EXISTS valor_antes text,
  ADD COLUMN IF NOT EXISTS valor_depois text;