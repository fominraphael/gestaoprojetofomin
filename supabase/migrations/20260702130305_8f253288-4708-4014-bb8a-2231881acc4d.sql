
ALTER TABLE public.toyota_filiais DROP CONSTRAINT IF EXISTS toyota_filiais_codigo_key;
ALTER TABLE public.toyota_filiais DROP COLUMN IF EXISTS codigo;
ALTER TABLE public.toyota_filiais ADD COLUMN IF NOT EXISTS dealer_number text;
ALTER TABLE public.toyota_filiais ADD COLUMN IF NOT EXISTS nome_bi_toyota text;
ALTER TABLE public.toyota_filiais
  ADD CONSTRAINT uq_toyota_filiais_dealer_number UNIQUE (dealer_number);

ALTER TABLE public.toyota_patios DROP COLUMN IF EXISTS dealer_number;
ALTER TABLE public.toyota_patios DROP COLUMN IF EXISTS cidade;
ALTER TABLE public.toyota_patios DROP COLUMN IF EXISTS uf;

ALTER TABLE public.toyota_estoque_veiculos
  DROP CONSTRAINT IF EXISTS uq_toyota_estoque_external_id;
DROP INDEX IF EXISTS public.uq_toyota_estoque_external_id;
ALTER TABLE public.toyota_estoque_veiculos
  DROP CONSTRAINT IF EXISTS uq_toyota_chassi_full;
ALTER TABLE public.toyota_estoque_veiculos
  ADD CONSTRAINT uq_toyota_chassi_full UNIQUE NULLS NOT DISTINCT (chassi, chassi_resumido);
