ALTER TABLE public.compras_chamados ADD COLUMN IF NOT EXISTS ordem integer;
CREATE INDEX IF NOT EXISTS idx_compras_chamados_ordem ON public.compras_chamados(ordem);