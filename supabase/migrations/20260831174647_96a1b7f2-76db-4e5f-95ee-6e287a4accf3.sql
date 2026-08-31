-- 1) Duplicidade ignora a lixeira: índice único parcial no lugar da constraint global
ALTER TABLE public.estoque_veiculos
  DROP CONSTRAINT IF EXISTS estoque_veiculos_chassi_origem_id_chassi_resumido_key;

CREATE UNIQUE INDEX IF NOT EXISTS estoque_veiculos_ativo_unico_idx
  ON public.estoque_veiculos (chassi, origem_id, chassi_resumido)
  WHERE deleted_at IS NULL;

-- 2) Soft delete em vendas históricas e anúncios
ALTER TABLE public.estoque_vendas_historico
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.estoque_anuncios
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS estoque_vendas_historico_ativos_idx
  ON public.estoque_vendas_historico (chassi) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS estoque_anuncios_ativos_idx
  ON public.estoque_anuncios (chassi) WHERE deleted_at IS NULL;