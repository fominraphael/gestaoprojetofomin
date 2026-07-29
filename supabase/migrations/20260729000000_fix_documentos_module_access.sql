-- Regra:
--   SELECT (ver/baixar): admin OU usuario com modulo "documentos" em profiles.modulos
--   INSERT/UPDATE/DELETE: exclusivo do ADMIN

-- 1. empresas: leitura para qualquer autenticado
DROP POLICY IF EXISTS empresas_read_auth ON public.empresas;
CREATE POLICY empresas_read_auth ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- 2. documentos_tipo: leitura para qualquer autenticado
DROP POLICY IF EXISTS doctipo_read_auth ON public.documentos_tipo;
CREATE POLICY doctipo_read_auth ON public.documentos_tipo
  FOR SELECT TO authenticated USING (true);

-- 3. documentos_arquivo
DROP POLICY IF EXISTS docarq_select_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_select_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_all ON public.documentos_arquivo;

-- SELECT: admin ou usuario com modulo documentos (ver e baixar de todas as empresas)
CREATE POLICY docarq_select_all ON public.documentos_arquivo
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.modulos @> ARRAY['documentos'::text]
    )
  );

-- INSERT: admin OU usuario com modulo documentos
CREATE POLICY docarq_insert_all ON public.documentos_arquivo
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.modulos @> ARRAY['documentos'::text]
    )
  );

-- UPDATE: somente admin
CREATE POLICY docarq_update_admin ON public.documentos_arquivo
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- DELETE: somente admin
CREATE POLICY docarq_delete_admin ON public.documentos_arquivo
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. can_access_documentos_object (storage): modulo documentos = ver/baixar
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    -- Usuario com modulo documentos pode ver/baixar do bucket documentos
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.modulos @> ARRAY['documentos'::text]
    )
    -- Empresa docs: path starts with '<empresa_id>/...'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    -- Compras docs
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name
        AND (cc.criado_por = auth.uid() OR cc.assumido_por = auth.uid())
    )
    -- Toyota pipeline
    OR (_name LIKE 'toyota/%' AND auth.uid() IS NOT NULL);
$$;
