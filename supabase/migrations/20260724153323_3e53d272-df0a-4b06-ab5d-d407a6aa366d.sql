
-- 1. compras_chamados: restrict SELECT and UPDATE
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

-- 2. compras_documentos
DROP POLICY IF EXISTS compras_documentos_select_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_insert_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_update_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_delete_auth ON public.compras_documentos;

CREATE POLICY compras_documentos_select_scoped ON public.compras_documentos
  FOR SELECT TO authenticated USING (public.can_access_chamado(chamado_id));
CREATE POLICY compras_documentos_insert_scoped ON public.compras_documentos
  FOR INSERT TO authenticated WITH CHECK (public.can_access_chamado(chamado_id));
CREATE POLICY compras_documentos_update_scoped ON public.compras_documentos
  FOR UPDATE TO authenticated
  USING (public.can_access_chamado(chamado_id))
  WITH CHECK (public.can_access_chamado(chamado_id));
CREATE POLICY compras_documentos_delete_scoped ON public.compras_documentos
  FOR DELETE TO authenticated USING (public.can_access_chamado(chamado_id));

-- 3. compras_debitos
DROP POLICY IF EXISTS compras_debitos_select_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_insert_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_update_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_delete_auth ON public.compras_debitos;

CREATE POLICY compras_debitos_select_scoped ON public.compras_debitos
  FOR SELECT TO authenticated USING (public.can_access_chamado(chamado_id));
CREATE POLICY compras_debitos_insert_scoped ON public.compras_debitos
  FOR INSERT TO authenticated WITH CHECK (public.can_access_chamado(chamado_id));
CREATE POLICY compras_debitos_update_scoped ON public.compras_debitos
  FOR UPDATE TO authenticated
  USING (public.can_access_chamado(chamado_id))
  WITH CHECK (public.can_access_chamado(chamado_id));
CREATE POLICY compras_debitos_delete_scoped ON public.compras_debitos
  FOR DELETE TO authenticated USING (public.can_access_chamado(chamado_id));

-- 4. compras_historico
DROP POLICY IF EXISTS compras_historico_select_auth ON public.compras_historico;
DROP POLICY IF EXISTS compras_historico_insert_auth ON public.compras_historico;

CREATE POLICY compras_historico_select_scoped ON public.compras_historico
  FOR SELECT TO authenticated USING (public.can_access_chamado(chamado_id));
CREATE POLICY compras_historico_insert_scoped ON public.compras_historico
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_chamado(chamado_id) AND (autor_id IS NULL OR autor_id = auth.uid()));

-- 5. compras_notificacoes
DROP POLICY IF EXISTS notif_select_auth ON public.compras_notificacoes;
DROP POLICY IF EXISTS notif_insert_auth ON public.compras_notificacoes;
DROP POLICY IF EXISTS notif_update_auth ON public.compras_notificacoes;

CREATE POLICY notif_select_scoped ON public.compras_notificacoes
  FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY notif_insert_scoped ON public.compras_notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_chamado(chamado_id));
CREATE POLICY notif_update_scoped ON public.compras_notificacoes
  FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (destinatario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6. profiles: remove open SELECT policy (profiles_self_select already covers self+admin)
DROP POLICY IF EXISTS profiles_select_all_authenticated ON public.profiles;

-- 7. empresas: remove duplicate open read policy
DROP POLICY IF EXISTS empresas_read_auth ON public.empresas;

-- 8. can_access_documentos_object: remove the fallback that grants access to any authenticated user
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
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
