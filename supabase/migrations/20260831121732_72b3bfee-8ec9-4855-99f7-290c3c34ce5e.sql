ALTER TABLE public.estoque_empresas_nbs ALTER COLUMN codigo_chassi_resumido DROP NOT NULL;
ALTER TABLE public.estoque_empresas_nbs DROP CONSTRAINT IF EXISTS estoque_empresas_nbs_origem_id_codigo_chassi_resumido_key;
DROP INDEX IF EXISTS public.estoque_empresas_nbs_origem_codigo_key;
ALTER TABLE public.estoque_empresas_nbs DROP COLUMN IF EXISTS codigo_chassi_resumido;
CREATE UNIQUE INDEX IF NOT EXISTS estoque_empresas_nbs_origem_nome_key
  ON public.estoque_empresas_nbs (origem_id, nome_exibicao);