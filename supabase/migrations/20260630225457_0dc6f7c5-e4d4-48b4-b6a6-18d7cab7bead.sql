
ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS enviado_toyota_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retorno_toyota_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT;

COMMENT ON COLUMN public.toyota_estoque_veiculos.status_aprovacao IS
  'Funil: analise | pendente_preparacao | aguardando_analise_central | enviado_toyota | aprovado_toyota | reprovado_toyota | rejeitado';
