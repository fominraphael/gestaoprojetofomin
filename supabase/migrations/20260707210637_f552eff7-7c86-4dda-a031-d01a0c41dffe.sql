ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS enviado_posvendas_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enviado_central_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_envio_toyota_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aprovado_toyota_em TIMESTAMPTZ;