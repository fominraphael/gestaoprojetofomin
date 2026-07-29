-- =============================================================
-- FIX COMPLETO: documentos
-- SELECT: modulo documentos OU admin
-- INSERT: qualquer autenticado (upload livre, controle no frontend)
-- UPDATE/DELETE: somente admin
-- =============================================================

-- 1. empresas: leitura para qualquer autenticado
DROP POLICY IF EXISTS empresas_read_auth ON public.empresas;
CREATE POLICY empresas_read_auth ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- 2. documentos_tipo: leitura para qualquer autenticado
DROP POLICY IF EXISTS doctipo_read_auth ON public.documentos_tipo;
CREATE POLICY doctipo_read_auth ON public.documentos_tipo
  FOR SELECT TO authenticated USING (true);

-- =============================================================
-- 3. documentos_arquivo (TABELA) — reset completo
-- =============================================================
DROP POLICY IF EXISTS docarq_select_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_select_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_admin ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_admin ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_scoped ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_admin ON public.documentos_arquivo;

-- SELECT: admin ou modulo documentos
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

-- INSERT: qualquer autenticado pode anexar documentos
CREATE POLICY docarq_insert_open ON public.documentos_arquivo
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: somente admin
CREATE POLICY docarq_update_admin ON public.documentos_arquivo
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE: somente admin
CREATE POLICY docarq_delete_admin ON public.documentos_arquivo
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- 4. Storage (bucket documentos) — reset completo
-- =============================================================
DROP POLICY IF EXISTS documentos_select_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_insert_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_update_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_delete_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_select ON storage.objects;
DROP POLICY IF EXISTS documentos_insert ON storage.objects;
DROP POLICY IF EXISTS documentos_update ON storage.objects;
DROP POLICY IF EXISTS documentos_delete ON storage.objects;

-- SELECT: admin ou modulo documentos
CREATE POLICY documentos_select_scoped ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

-- INSERT: qualquer autenticado pode enviar para bucket documentos
CREATE POLICY documentos_insert_open ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND auth.uid() IS NOT NULL);

-- UPDATE: admin ou modulo documentos
CREATE POLICY documentos_update_scoped ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name))
  WITH CHECK (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

-- DELETE: admin ou modulo documentos
CREATE POLICY documentos_delete_scoped ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

-- =============================================================
-- 5. can_access_documentos_object — modulo documentos = acesso
-- =============================================================
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.modulos @> ARRAY['documentos'::text]
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name
        AND (cc.criado_por = auth.uid() OR cc.assumido_por = auth.uid())
    )
    OR (_name LIKE 'toyota/%' AND auth.uid() IS NOT NULL);
$$;
