CREATE OR REPLACE FUNCTION public.has_modulo(_mod text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.modulos @> ARRAY[_mod]);
$$;

CREATE OR REPLACE FUNCTION public.is_central_compras()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.central_compras = true);
$$;

CREATE OR REPLACE FUNCTION public.can_access_chamado(_chamado_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_central_compras()
      OR EXISTS (SELECT 1 FROM public.compras_chamados c WHERE c.id = _chamado_id
                 AND (c.criado_por = auth.uid() OR c.assumido_por = auth.uid()));
$$;

-- Replace tautological "true" expressions with module checks
DO $$
DECLARE r record; m text; expr text;
BEGIN
  FOR r IN SELECT tablename, policyname, qual, with_check FROM pg_policies
           WHERE schemaname='public' AND (qual='true' OR with_check='true') LOOP
    m := CASE
      WHEN r.tablename LIKE 'prep\_%' THEN 'preparacao-anuncios'
      WHEN r.tablename LIKE 'estoque\_%' THEN 'estoque-matriz'
      WHEN r.tablename LIKE 'rotina\_%' THEN 'rotina'
      WHEN r.tablename IN ('toyota_filiais','toyota_patios','system_settings') THEN 'toyota'
      WHEN r.tablename = 'documentos_tipo' THEN 'documentos'
      ELSE NULL END;
    IF m IS NULL THEN CONTINUE; END IF;
    expr := format('public.has_modulo(%L)', m);
    IF r.qual = 'true' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, r.tablename, expr);
    END IF;
    IF r.with_check = 'true' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, r.tablename, expr);
    END IF;
  END LOOP;
END $$;

-- Compras: only involved users, purchasing team and admins
ALTER POLICY compras_chamados_select_open ON public.compras_chamados USING (public.can_access_chamado(id));
ALTER POLICY compras_chamados_update_open ON public.compras_chamados USING (public.can_access_chamado(id)) WITH CHECK (public.can_access_chamado(id));
ALTER POLICY compras_debitos_all_open ON public.compras_debitos USING (public.can_access_chamado(chamado_id)) WITH CHECK (public.can_access_chamado(chamado_id));
ALTER POLICY compras_documentos_all_open ON public.compras_documentos USING (public.can_access_chamado(chamado_id)) WITH CHECK (public.can_access_chamado(chamado_id));
ALTER POLICY compras_historico_all_open ON public.compras_historico USING (public.can_access_chamado(chamado_id)) WITH CHECK (public.can_access_chamado(chamado_id));
ALTER POLICY cadastros_select_auth ON public.compras_cadastros USING (public.has_modulo('compras') OR public.is_central_compras());

-- Shared config
ALTER POLICY tipocfg_read_auth ON public.tipos_usuario_config USING (
  public.has_modulo('rotina')
  OR nome = (SELECT p.tipo_usuario FROM public.profiles p WHERE p.id = auth.uid()));
DROP POLICY IF EXISTS empresas_read_auth ON public.empresas;
CREATE POLICY empresas_read_documentos ON public.empresas FOR SELECT TO authenticated USING (public.has_modulo('documentos'));

-- Documentos insert
ALTER POLICY docarq_insert_open ON public.documentos_arquivo WITH CHECK (
  public.has_modulo('documentos')
  OR empresa_id = (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Storage
ALTER POLICY "documentos_insert_open" ON storage.objects WITH CHECK (bucket_id = 'documentos' AND public.can_access_documentos_object(name));
ALTER POLICY "rotina_anexos_select" ON storage.objects USING (bucket_id = 'rotina-anexos' AND public.has_modulo('rotina'));
ALTER POLICY "rotina_anexos_insert" ON storage.objects WITH CHECK (bucket_id = 'rotina-anexos' AND public.has_modulo('rotina'));
ALTER POLICY "rotina_anexos_delete" ON storage.objects USING (bucket_id = 'rotina-anexos' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role)));
ALTER POLICY "Autenticados leem planilhas de importacao" ON storage.objects USING (bucket_id = 'estoque-importacoes' AND public.has_modulo('estoque-matriz'));
ALTER POLICY "Autenticados enviam planilhas de importacao" ON storage.objects WITH CHECK (bucket_id = 'estoque-importacoes' AND public.has_modulo('estoque-matriz'));
ALTER POLICY "prep anexos leitura" ON storage.objects USING (bucket_id = 'prep-anexos' AND public.has_modulo('preparacao-anuncios'));
ALTER POLICY "prep anexos upload" ON storage.objects WITH CHECK (bucket_id = 'prep-anexos' AND public.has_modulo('preparacao-anuncios'));