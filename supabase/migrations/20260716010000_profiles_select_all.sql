-- Permitir que todos os usuários autenticados leiam perfis (necessário para listar
-- solicitante/central no módulo Compras).  A política self_select já existe;
-- esta complementa para leitura coletiva.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_select_all_authenticated'
  ) THEN
    CREATE POLICY "profiles_select_all_authenticated"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
