ALTER TABLE public.estoque_anuncios ADD COLUMN IF NOT EXISTS webmotors_planos text;
UPDATE public.estoque_anuncios SET webmotors_planos = COALESCE(dados->>'WebMotors Plano(s)', dados->>'Webmotors Plano(s)', dados->>'WebMotors Planos') WHERE webmotors_planos IS NULL AND dados IS NOT NULL;

ALTER TABLE public.estoque_acoes_matriz DROP CONSTRAINT IF EXISTS estoque_acoes_matriz_tipo_acao_check;
ALTER TABLE public.estoque_acoes_matriz ADD CONSTRAINT estoque_acoes_matriz_tipo_acao_check CHECK (tipo_acao IN ('aceleradores','fotos_ia','repescagem','auditoria','destacar_olx','anunciar_portal'));

CREATE TABLE public.estoque_config (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.estoque_config TO authenticated;
GRANT ALL ON public.estoque_config TO service_role;
ALTER TABLE public.estoque_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modulo estoque le config" ON public.estoque_config FOR SELECT TO authenticated USING (public.has_modulo('estoque-matriz'));
CREATE POLICY "Modulo estoque altera config" ON public.estoque_config FOR INSERT TO authenticated WITH CHECK (public.has_modulo('estoque-matriz'));
CREATE POLICY "Modulo estoque atualiza config" ON public.estoque_config FOR UPDATE TO authenticated USING (public.has_modulo('estoque-matriz')) WITH CHECK (public.has_modulo('estoque-matriz'));
INSERT INTO public.estoque_config (chave, valor) VALUES ('webmotors_plano_acelerado', 'Super Acelerador VIP') ON CONFLICT DO NOTHING;