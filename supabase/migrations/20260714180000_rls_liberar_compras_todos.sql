-- Libera SELECT/UPDATE em compras_chamados para todos os autenticados
-- (restrição por perfil e status é feita no frontend)

DROP POLICY IF EXISTS compras_chamados_select_scoped ON public.compras_chamados;
DROP POLICY IF EXISTS compras_chamados_update_scoped ON public.compras_chamados;

CREATE POLICY compras_chamados_select_auth ON public.compras_chamados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY compras_chamados_update_auth ON public.compras_chamados
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Libera SELECT/INSERT/UPDATE/DELETE nas tabelas filhas para todos os autenticados

-- compras_documentos
DROP POLICY IF EXISTS compras_documentos_scoped ON public.compras_documentos;

CREATE POLICY compras_documentos_select_auth ON public.compras_documentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY compras_documentos_insert_auth ON public.compras_documentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY compras_documentos_update_auth ON public.compras_documentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY compras_documentos_delete_auth ON public.compras_documentos
  FOR DELETE TO authenticated USING (true);

-- compras_debitos
DROP POLICY IF EXISTS compras_debitos_scoped ON public.compras_debitos;

CREATE POLICY compras_debitos_select_auth ON public.compras_debitos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY compras_debitos_insert_auth ON public.compras_debitos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY compras_debitos_update_auth ON public.compras_debitos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY compras_debitos_delete_auth ON public.compras_debitos
  FOR DELETE TO authenticated USING (true);

-- compras_historico
DROP POLICY IF EXISTS compras_historico_scoped ON public.compras_historico;

CREATE POLICY compras_historico_select_auth ON public.compras_historico
  FOR SELECT TO authenticated USING (true);
CREATE POLICY compras_historico_insert_auth ON public.compras_historico
  FOR INSERT TO authenticated WITH CHECK (true);
