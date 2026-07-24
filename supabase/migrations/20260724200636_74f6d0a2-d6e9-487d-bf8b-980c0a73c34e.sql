-- toyota_revisoes: remove blanket-true policies (OR-combined bypass)
DROP POLICY IF EXISTS "Permitir leitura para todos os autenticados" ON public.toyota_revisoes;
DROP POLICY IF EXISTS "Permitir inserção para todos os autenticados" ON public.toyota_revisoes;
DROP POLICY IF EXISTS "Permitir atualização para todos os autenticados" ON public.toyota_revisoes;

-- documentos_arquivo: scope to the user's empresa or admin
DROP POLICY IF EXISTS docarq_select_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_insert_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_update_all ON public.documentos_arquivo;
DROP POLICY IF EXISTS docarq_delete_all ON public.documentos_arquivo;

CREATE POLICY docarq_select_scoped ON public.documentos_arquivo
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
  )
);

CREATE POLICY docarq_insert_scoped ON public.documentos_arquivo
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
  )
);

CREATE POLICY docarq_update_scoped ON public.documentos_arquivo
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
  )
);

CREATE POLICY docarq_delete_scoped ON public.documentos_arquivo
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos_arquivo.empresa_id
  )
);