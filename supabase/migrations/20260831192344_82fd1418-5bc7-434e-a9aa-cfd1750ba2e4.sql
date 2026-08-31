ALTER TABLE public.estoque_regras
  ADD COLUMN IF NOT EXISTS fallback_niveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checagem_mercado_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canal_referencia text NOT NULL DEFAULT 'WebMotors',
  ADD COLUMN IF NOT EXISTS min_fotos integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS acao_aceleradores boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acao_fotos_ia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acao_repescagem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acao_auditoria boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.estoque_acoes_matriz (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id uuid NOT NULL REFERENCES public.estoque_veiculos(id) ON DELETE CASCADE,
  tipo_acao text NOT NULL CHECK (tipo_acao IN ('aceleradores','fotos_ia','repescagem','auditoria')),
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  concluido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (veiculo_id, tipo_acao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_acoes_matriz TO authenticated;
GRANT ALL ON public.estoque_acoes_matriz TO service_role;

ALTER TABLE public.estoque_acoes_matriz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam ações da matriz"
ON public.estoque_acoes_matriz FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS estoque_acoes_matriz_veiculo_idx ON public.estoque_acoes_matriz(veiculo_id);

CREATE TRIGGER update_estoque_acoes_matriz_updated_at
BEFORE UPDATE ON public.estoque_acoes_matriz
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();