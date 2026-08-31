CREATE TABLE public.estoque_faixas_km (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  km_inicio INTEGER NOT NULL DEFAULT 0,
  km_fim INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_faixas_km TO authenticated;
GRANT ALL ON public.estoque_faixas_km TO service_role;
ALTER TABLE public.estoque_faixas_km ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_faixas_km_select" ON public.estoque_faixas_km FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_faixas_km_write" ON public.estoque_faixas_km FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.estoque_faixas_km (nome, km_inicio, km_fim, ordem) VALUES
  ('0 a 15.000 km', 0, 14999, 0),
  ('15.001 a 30.000 km', 15000, 29999, 1),
  ('30.001 a 45.000 km', 30000, 44999, 2),
  ('45.001 a 60.000 km', 45000, 59999, 3),
  ('Acima de 60.000 km', 60000, 100000000, 4);

CREATE TABLE public.estoque_pref_colunas (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  colunas JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_pref_colunas TO authenticated;
GRANT ALL ON public.estoque_pref_colunas TO service_role;
ALTER TABLE public.estoque_pref_colunas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_pref_colunas_own" ON public.estoque_pref_colunas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());