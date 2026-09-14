ALTER TABLE public.estoque_valor_historico
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'sistema',
  ADD COLUMN IF NOT EXISTS usuario_id uuid,
  ADD COLUMN IF NOT EXISTS usuario_nome text;

CREATE INDEX IF NOT EXISTS estoque_valor_historico_veiculo_created_idx
  ON public.estoque_valor_historico (veiculo_id, created_at DESC);