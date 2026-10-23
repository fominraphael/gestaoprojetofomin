CREATE TABLE public.prep_auditoria_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  importacao_id uuid REFERENCES public.prep_importacoes(id) ON DELETE SET NULL,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  importado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prep_auditoria_historico_placa_idx ON public.prep_auditoria_historico(placa, importado_em DESC);
CREATE INDEX prep_auditoria_historico_imp_idx ON public.prep_auditoria_historico(importacao_id);
GRANT SELECT, INSERT ON public.prep_auditoria_historico TO authenticated;
GRANT ALL ON public.prep_auditoria_historico TO service_role;
ALTER TABLE public.prep_auditoria_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modulo le historico auditoria" ON public.prep_auditoria_historico FOR SELECT TO authenticated USING (public.has_modulo('preparacao-anuncios'));
CREATE POLICY "Modulo grava historico auditoria" ON public.prep_auditoria_historico FOR INSERT TO authenticated WITH CHECK (public.has_modulo('preparacao-anuncios'));
INSERT INTO public.prep_auditoria_historico (placa, importacao_id, dados, importado_em)
SELECT b.placa, b.importacao_id, b.dados, COALESCE(i.created_at, now())
FROM public.prep_base_linhas b LEFT JOIN public.prep_importacoes i ON i.id = b.importacao_id
WHERE b.tipo = 'auditoria';