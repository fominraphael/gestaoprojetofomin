ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN status_aprovacao TEXT NOT NULL DEFAULT 'analise'
    CHECK (status_aprovacao IN ('analise','pendente_preparacao','aprovado','rejeitado')),
  ADD COLUMN filial_destino_id UUID REFERENCES public.toyota_filiais(id) ON DELETE SET NULL,
  ADD COLUMN aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN aprovado_em TIMESTAMPTZ;

CREATE INDEX idx_toyota_estoque_status ON public.toyota_estoque_veiculos(status_aprovacao);
CREATE INDEX idx_toyota_estoque_filial_destino ON public.toyota_estoque_veiculos(filial_destino_id);