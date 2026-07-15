-- Permitir que usuários anônimos (não logados) leiam os tipos de usuário
-- necessário para a tela de registro / pré-cadastro

-- Remove políticas antigas que bloqueiam leitura anônima
DROP POLICY IF EXISTS "tipocfg_read_auth" ON public.tipos_usuario_config;

-- Cria política de leitura pública
CREATE POLICY "tipocfg_read_public" ON public.tipos_usuario_config
  FOR SELECT
  USING (true);

-- Garante que anon pode selecionar
GRANT SELECT ON public.tipos_usuario_config TO anon;
