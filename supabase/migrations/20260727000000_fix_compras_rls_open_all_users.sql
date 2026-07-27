-- =============================================================
-- FIX: Restaurar políticas RLS abertas para o módulo Compras
-- Usuários com acesso ao módulo devem ver TODOS os chamados,
-- anexar documentos, resolver pendências, etc.
-- Regras de negócio (quem pode pendenciar, comprar, cancelar,
-- etc.) são controladas no frontend, não no RLS.
-- =============================================================

-- =============================================================
-- 1. compras_chamados: SELECT/UPDATE abertos para todos autenticados
--    INSERT: apenas o criador (auth.uid() = criado_por)
--    DELETE: apenas admin
-- =============================================================

DROP POLICY IF EXISTS compras_chamados_select_scoped ON public.compras_chamados;
DROP POLICY IF EXISTS compras_chamados_update_scoped ON public.compras_chamados;

-- Garante que as políticas open existam (idempotente)
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_chamados'
      AND policyname = 'compras_chamados_select_open'
  ) THEN
    CREATE POLICY compras_chamados_select_open ON public.compras_chamados
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_chamados'
      AND policyname = 'compras_chamados_update_open'
  ) THEN
    CREATE POLICY compras_chamados_update_open ON public.compras_chamados
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Limpa políticas antigas de INSERT/DELETE que possam existir de migrações anteriores
-- (a migração original criou "compras_chamados_insert_auth" e "compras_chamados_delete_admin")
DROP POLICY IF EXISTS compras_chamados_insert_auth ON public.compras_chamados;
DROP POLICY IF EXISTS compras_chamados_delete_admin ON public.compras_chamados;

-- INSERT: apenas o criador (auth.uid() = criado_por)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_chamados'
      AND policyname = 'compras_chamados_insert_creator'
  ) THEN
    CREATE POLICY compras_chamados_insert_creator ON public.compras_chamados
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
  END IF;
END $$;

-- DELETE: apenas admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_chamados'
      AND policyname = 'compras_chamados_delete_admin_new'
  ) THEN
    CREATE POLICY compras_chamados_delete_admin_new ON public.compras_chamados
      FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Limpa políticas antigas com nomes que possam conflitar
DROP POLICY IF EXISTS compras_chamados_select_auth ON public.compras_chamados;
DROP POLICY IF EXISTS compras_chamados_update_auth ON public.compras_chamados;

-- =============================================================
-- 2. compras_documentos: ALL open para todos autenticados
-- =============================================================

DROP POLICY IF EXISTS compras_documentos_select_scoped ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_insert_scoped ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_update_scoped ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_delete_scoped ON public.compras_documentos;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_documentos'
      AND policyname = 'compras_documentos_all_open'
  ) THEN
    CREATE POLICY compras_documentos_all_open ON public.compras_documentos
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP POLICY IF EXISTS compras_documentos_select_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_insert_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_update_auth ON public.compras_documentos;
DROP POLICY IF EXISTS compras_documentos_delete_auth ON public.compras_documentos;

-- =============================================================
-- 3. compras_debitos: ALL open para todos autenticados
-- =============================================================

DROP POLICY IF EXISTS compras_debitos_select_scoped ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_insert_scoped ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_update_scoped ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_delete_scoped ON public.compras_debitos;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_debitos'
      AND policyname = 'compras_debitos_all_open'
  ) THEN
    CREATE POLICY compras_debitos_all_open ON public.compras_debitos
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP POLICY IF EXISTS compras_debitos_select_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_insert_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_update_auth ON public.compras_debitos;
DROP POLICY IF EXISTS compras_debitos_delete_auth ON public.compras_debitos;

-- =============================================================
-- 4. compras_historico: ALL open para todos autenticados
-- =============================================================

DROP POLICY IF EXISTS compras_historico_select_scoped ON public.compras_historico;
DROP POLICY IF EXISTS compras_historico_insert_scoped ON public.compras_historico;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras_historico'
      AND policyname = 'compras_historico_all_open'
  ) THEN
    CREATE POLICY compras_historico_all_open ON public.compras_historico
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP POLICY IF EXISTS compras_historico_select_auth ON public.compras_historico;
DROP POLICY IF EXISTS compras_historico_insert_auth ON public.compras_historico;
