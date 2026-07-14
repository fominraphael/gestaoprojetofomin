
-- === tarefas: remove public policies ===
DROP POLICY IF EXISTS "Acesso público de leitura" ON public.tarefas;
DROP POLICY IF EXISTS "Acesso público de inserção" ON public.tarefas;
DROP POLICY IF EXISTS "Acesso público de atualização" ON public.tarefas;
DROP POLICY IF EXISTS "Acesso público de exclusão" ON public.tarefas;

-- === compras_chamados: scope SELECT/UPDATE ===
DROP POLICY IF EXISTS compras_chamados_select_auth ON public.compras_chamados;
DROP POLICY IF EXISTS compras_chamados_update_auth ON public.compras_chamados;

CREATE POLICY compras_chamados_select_scoped ON public.compras_chamados
  FOR SELECT TO authenticated
  USING (
    criado_por = auth.uid()
    OR assumido_por = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY compras_chamados_update_scoped ON public.compras_chamados
  FOR UPDATE TO authenticated
  USING (
    criado_por = auth.uid()
    OR assumido_por = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    criado_por = auth.uid()
    OR assumido_por = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- === helper: can user access a chamado? ===
CREATE OR REPLACE FUNCTION public.can_access_chamado(_chamado_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.compras_chamados c
    WHERE c.id = _chamado_id
      AND (
        c.criado_por = auth.uid()
        OR c.assumido_por = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_chamado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_chamado(uuid) TO authenticated;

-- === compras_documentos / debitos / historico: scope via join ===
DROP POLICY IF EXISTS compras_documentos_all_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_debitos_all_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_historico_all_auth ON public.compras_historico;

CREATE POLICY compras_documentos_scoped ON public.compras_documentos
  FOR ALL TO authenticated
  USING (public.can_access_chamado(chamado_id))
  WITH CHECK (public.can_access_chamado(chamado_id));

CREATE POLICY compras_debitos_scoped ON public.compras_debitos
  FOR ALL TO authenticated
  USING (public.can_access_chamado(chamado_id))
  WITH CHECK (public.can_access_chamado(chamado_id));

CREATE POLICY compras_historico_scoped ON public.compras_historico
  FOR ALL TO authenticated
  USING (public.can_access_chamado(chamado_id))
  WITH CHECK (public.can_access_chamado(chamado_id));

-- === documentos_arquivo: scope by caller's empresa (admin sees all) ===
DROP POLICY IF EXISTS docarq_select ON public.documentos_arquivo;

CREATE POLICY docarq_select_scoped ON public.documentos_arquivo
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
    )
  );

-- === storage.objects for bucket 'documentos': scope by ownership ===
DROP POLICY IF EXISTS documentos_select ON storage.objects;
DROP POLICY IF EXISTS documentos_insert ON storage.objects;
DROP POLICY IF EXISTS documentos_update ON storage.objects;
DROP POLICY IF EXISTS documentos_delete ON storage.objects;

-- Helper: caller authorized for a given storage object name in bucket 'documentos'
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    -- Empresa docs: path starts with '<empresa_id>/...'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    -- Compras docs: registered in compras_documentos and user can access the chamado
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name
        AND (
          cc.criado_por = auth.uid()
          OR cc.assumido_por = auth.uid()
        )
    )
    -- Toyota pipeline: authenticated users participating in Toyota module
    OR (_name LIKE 'toyota/%' AND auth.uid() IS NOT NULL);
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_documentos_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_documentos_object(text) TO authenticated;

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

-- === SECURITY DEFINER functions: revoke public EXECUTE ===
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_filial(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_trash() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_filial(uuid, uuid) TO authenticated;

-- Drop the public recovery-email lookup function; login flow will use a server function
DROP FUNCTION IF EXISTS public.get_username_by_recovery_email(text);
