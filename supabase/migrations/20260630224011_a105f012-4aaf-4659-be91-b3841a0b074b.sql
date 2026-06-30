CREATE TABLE public.toyota_estoque_veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id UUID NOT NULL REFERENCES public.toyota_filiais(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chassi TEXT NOT NULL,
  placa TEXT,
  modelo TEXT,
  marca TEXT,
  ano_fabricacao INT,
  ano_modelo INT,
  quilometragem INT,
  status_cautelar TEXT,
  elegibilidade TEXT CHECK (elegibilidade IN ('TCUV','TSIM','NAO_ELEGIVEL')),
  dados_originais JSONB,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_toyota_estoque_filial ON public.toyota_estoque_veiculos(filial_id);
CREATE INDEX idx_toyota_estoque_chassi ON public.toyota_estoque_veiculos(chassi);
CREATE UNIQUE INDEX uq_toyota_estoque_filial_chassi ON public.toyota_estoque_veiculos(filial_id, chassi);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.toyota_estoque_veiculos TO authenticated;
GRANT ALL ON public.toyota_estoque_veiculos TO service_role;

ALTER TABLE public.toyota_estoque_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Toyota users can view estoque from their filiais"
ON public.toyota_estoque_veiculos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.toyota_usuario_filial uf
    WHERE uf.filial_id = toyota_estoque_veiculos.filial_id
      AND uf.user_id = auth.uid()
  )
);

CREATE POLICY "Toyota users can insert estoque in their filiais"
ON public.toyota_estoque_veiculos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.toyota_usuario_filial uf
    WHERE uf.filial_id = toyota_estoque_veiculos.filial_id
      AND uf.user_id = auth.uid()
  )
);

CREATE POLICY "Toyota users can update estoque in their filiais"
ON public.toyota_estoque_veiculos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.toyota_usuario_filial uf
    WHERE uf.filial_id = toyota_estoque_veiculos.filial_id
      AND uf.user_id = auth.uid()
  )
);

CREATE POLICY "Toyota users can delete estoque in their filiais"
ON public.toyota_estoque_veiculos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.toyota_usuario_filial uf
    WHERE uf.filial_id = toyota_estoque_veiculos.filial_id
      AND uf.user_id = auth.uid()
  )
);

CREATE TRIGGER update_toyota_estoque_veiculos_updated_at
BEFORE UPDATE ON public.toyota_estoque_veiculos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();