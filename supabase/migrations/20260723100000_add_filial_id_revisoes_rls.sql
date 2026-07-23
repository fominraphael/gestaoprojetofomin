-- Migration: Adiciona filial_id em toyota_revisoes + RLS policies
-- ============================================================================

-- 1. Adiciona coluna filial_id (nullable para não quebrar dados antigos)
ALTER TABLE public.toyota_revisoes
  ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.toyota_filiais(id);

-- 2. Garante que a função has_filial existe (já existe em migrações anteriores)
-- CREATE OR REPLACE é seguro pois já existe.

-- 3. Remove policies antigas (se existirem) e cria novas
DO $$
BEGIN
  -- Remove policies antigas da tabela toyota_revisoes
  DROP POLICY IF EXISTS "Revisoes select" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes insert" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes update" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes delete" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes select por vinculo de filial" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes insert por vinculo de filial" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes update por vinculo de filial" ON public.toyota_revisoes;
  DROP POLICY IF EXISTS "Revisoes delete admin only" ON public.toyota_revisoes;
END
$$;

-- 4. Habilita RLS (se não estiver habilitado)
ALTER TABLE public.toyota_revisoes ENABLE ROW LEVEL SECURITY;

-- 5. SELECT: perfis do módulo Toyota podem ler, filtrado por filial
CREATE POLICY "Revisoes select por vinculo de filial"
  ON public.toyota_revisoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      filial_id IS NOT NULL
      AND public.has_filial(auth.uid(), filial_id)
    )
  );

-- 6. INSERT: Vendedor de Seminovos ou Administrador, com filial vinculada
CREATE POLICY "Revisoes insert por vinculo de filial"
  ON public.toyota_revisoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      solicitante_id = auth.uid()
      AND filial_id IS NOT NULL
      AND public.has_filial(auth.uid(), filial_id)
    )
  );

-- 7. UPDATE: Gestora de Seminovos/Consultor Pós-Vendas/Mecânico Toyota/Administrador
CREATE POLICY "Revisoes update por vinculo de filial"
  ON public.toyota_revisoes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      filial_id IS NOT NULL
      AND public.has_filial(auth.uid(), filial_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      filial_id IS NOT NULL
      AND public.has_filial(auth.uid(), filial_id)
    )
  );

-- 8. DELETE: apenas Admin
CREATE POLICY "Revisoes delete admin only"
  ON public.toyota_revisoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
