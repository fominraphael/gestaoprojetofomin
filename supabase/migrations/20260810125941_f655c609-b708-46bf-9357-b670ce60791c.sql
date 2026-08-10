CREATE TABLE public.rotina_semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.rotina_setores(id) ON DELETE CASCADE,
  inicio date NOT NULL,
  fim date NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_atividades integer NOT NULL DEFAULT 0,
  total_concluidos integer NOT NULL DEFAULT 0,
  encerrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (setor_id, inicio)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_semanas TO authenticated;
GRANT ALL ON public.rotina_semanas TO service_role;

ALTER TABLE public.rotina_semanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver semanas"
  ON public.rotina_semanas FOR SELECT TO authenticated
  USING (public.user_has_setor(setor_id));

CREATE POLICY "Autenticados podem encerrar semanas"
  ON public.rotina_semanas FOR INSERT TO authenticated
  WITH CHECK (public.user_has_setor(setor_id) AND encerrado_por = auth.uid());

CREATE POLICY "Autor ou admin pode atualizar semanas"
  ON public.rotina_semanas FOR UPDATE TO authenticated
  USING (encerrado_por = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (encerrado_por = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode remover semanas"
  ON public.rotina_semanas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_rotina_semanas_updated_at
  BEFORE UPDATE ON public.rotina_semanas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rotina_semanas_setor ON public.rotina_semanas(setor_id, inicio DESC);