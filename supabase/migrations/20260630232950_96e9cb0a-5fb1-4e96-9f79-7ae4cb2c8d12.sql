
ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS hsv_revisoes_pendentes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hsv_os_ajustes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hsv_observacoes_preparador text;
