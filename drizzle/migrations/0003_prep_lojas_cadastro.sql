CREATE TABLE public.prep_lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja text NOT NULL,
  regional text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja, regional)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prep_lojas TO authenticated;
GRANT ALL ON public.prep_lojas TO service_role;
ALTER TABLE public.prep_lojas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem" ON public.prep_lojas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados gravam" ON public.prep_lojas FOR ALL TO authenticated USING (true) WITH CHECK (true);