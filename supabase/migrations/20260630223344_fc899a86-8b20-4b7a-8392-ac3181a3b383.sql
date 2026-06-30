-- Toyota Certification module: filiais + user-filial link
CREATE TABLE public.toyota_filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  dealer_number TEXT NOT NULL UNIQUE,
  cidade TEXT,
  uf TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.toyota_filiais TO authenticated;
GRANT ALL ON public.toyota_filiais TO service_role;

ALTER TABLE public.toyota_filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read filiais"
  ON public.toyota_filiais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage filiais insert"
  ON public.toyota_filiais FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage filiais update"
  ON public.toyota_filiais FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage filiais delete"
  ON public.toyota_filiais FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_toyota_filiais_updated_at
  BEFORE UPDATE ON public.toyota_filiais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link table user <-> filial (escopo Toyota, isolado de empresas/profiles)
CREATE TABLE public.toyota_usuario_filial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES public.toyota_filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, filial_id)
);

CREATE INDEX idx_toyota_uf_user ON public.toyota_usuario_filial(user_id);
CREATE INDEX idx_toyota_uf_filial ON public.toyota_usuario_filial(filial_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.toyota_usuario_filial TO authenticated;
GRANT ALL ON public.toyota_usuario_filial TO service_role;

ALTER TABLE public.toyota_usuario_filial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin links"
  ON public.toyota_usuario_filial FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert links"
  ON public.toyota_usuario_filial FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete links"
  ON public.toyota_usuario_filial FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));