ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS hsv_status TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS hsv_analisado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hsv_analisado_por UUID,
  ADD COLUMN IF NOT EXISTS laudo_url TEXT,
  ADD COLUMN IF NOT EXISTS laudo_arquivo_path TEXT;