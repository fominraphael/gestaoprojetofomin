-- Garantir que todos os autenticados possam ler empresas
-- Remove qualquer política conflitante e recria de forma limpa
DROP POLICY IF EXISTS "empresas_all" ON public.empresas;
DROP POLICY IF EXISTS "empresas_read_auth" ON public.empresas;
DROP POLICY IF EXISTS "empresas_admin_write" ON public.empresas;

-- Leitura liberada para qualquer autenticado
CREATE POLICY "empresas_read_auth" ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- Escrita só admin
CREATE POLICY "empresas_admin_insert" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresas_admin_update" ON public.empresas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresas_admin_delete" ON public.empresas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
