DROP POLICY IF EXISTS docarq_select ON public.documentos_arquivo;
CREATE POLICY docarq_select ON public.documentos_arquivo FOR SELECT TO authenticated USING (true);