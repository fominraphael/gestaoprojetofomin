ALTER TABLE public.toyota_estoque_veiculos
  DROP CONSTRAINT IF EXISTS toyota_estoque_veiculos_filial_destino_id_fkey;
ALTER TABLE public.toyota_estoque_veiculos
  ADD CONSTRAINT toyota_estoque_veiculos_filial_destino_id_fkey
  FOREIGN KEY (filial_destino_id) REFERENCES public.toyota_filiais(id) ON DELETE SET NULL;