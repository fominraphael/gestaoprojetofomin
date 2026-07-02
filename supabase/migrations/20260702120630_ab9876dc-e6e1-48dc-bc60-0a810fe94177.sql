
-- 1) Fix ON CONFLICT (external_id) — replace partial unique with full unique constraint
DROP INDEX IF EXISTS public.uq_toyota_estoque_external_id;
ALTER TABLE public.toyota_estoque_veiculos
  ADD CONSTRAINT uq_toyota_estoque_external_id UNIQUE (external_id);

-- 2) Drop old policies that reference toyota_usuario_filial
DROP POLICY IF EXISTS "Toyota users can view estoque from their filiais" ON public.toyota_estoque_veiculos;
DROP POLICY IF EXISTS "Toyota users can update estoque in their filiais" ON public.toyota_estoque_veiculos;
DROP POLICY IF EXISTS "Toyota users can delete estoque in their filiais" ON public.toyota_estoque_veiculos;
DROP POLICY IF EXISTS "Toyota users can insert estoque in their filiais" ON public.toyota_estoque_veiculos;

-- 3) Rename current toyota_filiais -> toyota_patios (planilha "Filial" agora é "Pátio")
ALTER TABLE public.toyota_filiais RENAME TO toyota_patios;
ALTER TABLE public.toyota_usuario_filial RENAME TO toyota_usuario_patio;
ALTER TABLE public.toyota_usuario_patio RENAME COLUMN filial_id TO patio_id;

-- 4) New toyota_filiais table (agrupador de pátios)
CREATE TABLE public.toyota_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.toyota_filiais TO authenticated;
GRANT ALL ON public.toyota_filiais TO service_role;
ALTER TABLE public.toyota_filiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read filiais" ON public.toyota_filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert filiais" ON public.toyota_filiais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins update filiais" ON public.toyota_filiais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins delete filiais" ON public.toyota_filiais FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER update_toyota_filiais_updated_at BEFORE UPDATE ON public.toyota_filiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Pátio pertence a uma Filial (opcional; SET NULL ao apagar filial)
ALTER TABLE public.toyota_patios
  ADD COLUMN filial_id UUID REFERENCES public.toyota_filiais(id) ON DELETE SET NULL;
CREATE INDEX idx_toyota_patios_filial ON public.toyota_patios(filial_id);

-- 6) Usuário vinculado a uma Filial (nunca a um pátio)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS filial_id UUID REFERENCES public.toyota_filiais(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_filial ON public.profiles(filial_id);

-- 7) Recriar policies de veículos usando o novo vínculo (Filial do usuário == Filial do pátio)
CREATE POLICY "Estoque select by filial link"
  ON public.toyota_estoque_veiculos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.toyota_patios p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = toyota_estoque_veiculos.filial_id
        AND pr.filial_id IS NOT NULL
        AND p.filial_id = pr.filial_id
    )
  );

CREATE POLICY "Estoque insert by filial link"
  ON public.toyota_estoque_veiculos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.toyota_patios p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = toyota_estoque_veiculos.filial_id
        AND pr.filial_id IS NOT NULL
        AND p.filial_id = pr.filial_id
    )
  );

CREATE POLICY "Estoque update by filial link"
  ON public.toyota_estoque_veiculos FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.toyota_patios p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = toyota_estoque_veiculos.filial_id
        AND pr.filial_id IS NOT NULL
        AND p.filial_id = pr.filial_id
    )
  );

CREATE POLICY "Estoque delete admin only"
  ON public.toyota_estoque_veiculos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
