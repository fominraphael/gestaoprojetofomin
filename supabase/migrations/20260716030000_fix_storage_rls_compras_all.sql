-- =============================================================
-- FIX 1: can_access_documentos_object — liberar para qualquer
--         autenticado no módulo Compras (path compras/*)
-- =============================================================
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    -- Qualquer autenticado pode acessar objetos em compras/
    OR (
      _name LIKE 'compras/%'
      AND auth.uid() IS NOT NULL
    )
    OR (
      _name LIKE 'toyota/%'
      AND auth.uid() IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.toyota_usuario_filial WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.toyota_usuario_patio WHERE user_id = auth.uid())
      )
    );
$function$;

-- =============================================================
-- FIX 2: Resetar políticas de storage para 'documentos'
-- =============================================================
DROP POLICY IF EXISTS documentos_select_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_insert_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_update_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_delete_scoped ON storage.objects;

CREATE POLICY documentos_select_scoped ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

CREATE POLICY documentos_insert_scoped ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

CREATE POLICY documentos_update_scoped ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name))
  WITH CHECK (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

CREATE POLICY documentos_delete_scoped ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.can_access_documentos_object(name));

-- =============================================================
-- FIX 3: Resetar políticas de compras_documentos / debitos
--         para garantir que todos os autenticados possam
--         INSERT/UPDATE/DELETE (restrição no frontend)
-- =============================================================
DROP POLICY IF EXISTS compras_documentos_select_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_insert_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_update_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_delete_auth ON public.compras_documentos;

CREATE POLICY compras_documentos_select_auth ON public.compras_documentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY compras_documentos_insert_auth ON public.compras_documentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY compras_documentos_update_auth ON public.compras_documentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY compras_documentos_delete_auth ON public.compras_documentos
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS compras_debitos_select_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_insert_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_update_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_delete_auth ON public.compras_debitos;

CREATE POLICY compras_debitos_select_auth ON public.compras_debitos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY compras_debitos_insert_auth ON public.compras_debitos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY compras_debitos_update_auth ON public.compras_debitos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY compras_debitos_delete_auth ON public.compras_debitos
  FOR DELETE TO authenticated USING (true);
