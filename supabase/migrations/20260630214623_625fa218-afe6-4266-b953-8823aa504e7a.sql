
-- ============================================================
-- ETAPA 2 + 3: Migração para Supabase Auth + RLS endurecida
-- ============================================================

-- 1) Estender profiles com metadados do app
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_usuario text DEFAULT 'Lojista',
  ADD COLUMN IF NOT EXISTS modulos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS pode_criar_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS campos_customizados jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles(lower(username));

-- 2) Trigger atualizada: copia metadata do signup p/ profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_username text := COALESCE(meta->>'username', split_part(NEW.email,'@',1));
  v_role app_role := COALESCE((meta->>'role')::app_role, 'user'::app_role);
BEGIN
  INSERT INTO public.profiles (
    id, username, tipo_usuario, modulos, empresa_id, cnpj,
    pode_criar_admin, campos_customizados, ativo, status
  ) VALUES (
    NEW.id,
    v_username,
    COALESCE(meta->>'tipo_usuario', 'Lojista'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(meta->'modulos')), ARRAY['gestao']::text[]),
    NULLIF(meta->>'empresa_id','')::uuid,
    meta->>'cnpj',
    COALESCE((meta->>'pode_criar_admin')::boolean, false),
    COALESCE(meta->'campos_customizados', '{}'::jsonb),
    COALESCE((meta->>'ativo')::boolean, true),
    COALESCE(meta->>'status', 'approved')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Migrar 3 usuários existentes para auth.users
--    Senhas provisórias geradas (devem ser trocadas no primeiro login)
DO $$
DECLARE
  rec RECORD;
  v_email text;
  v_pwd text;
  v_uid uuid;
BEGIN
  FOR rec IN SELECT * FROM public.usuarios_sistema LOOP
    v_email := lower(rec.username) || '@gestao.local';
    v_pwd := CASE rec.username
      WHEN 'root' THEN 'jf4V00xdo3d4I9Qw'
      WHEN 'fominraphael' THEN 'HVecDHnvF5GNUzwi'
      WHEN 'loja' THEN 'dgZhrl36OkZNp0jq'
      ELSE encode(gen_random_bytes(12), 'base64')
    END;

    -- Pula se já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      CONTINUE;
    END IF;

    v_uid := rec.id;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated', 'authenticated',
      v_email,
      crypt(v_pwd, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'username', rec.username,
        'tipo_usuario', rec.tipo_usuario,
        'modulos', to_jsonb(rec.modulos),
        'empresa_id', rec.empresa_id::text,
        'cnpj', rec.cnpj,
        'pode_criar_admin', rec.pode_criar_admin,
        'campos_customizados', rec.campos_customizados,
        'ativo', rec.ativo,
        'status', rec.status,
        'role', rec.role
      ),
      rec.created_at, rec.updated_at, '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', v_uid::text,
      now(), now(), now()
    );
  END LOOP;
END $$;

-- 4) RLS ENDURECIDA — remover policies abertas e aplicar auth.uid() + has_role

-- profiles: já tinha policies próprias, vamos garantir
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;

CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = id);
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- user_roles: só admin gerencia; usuário vê os próprios
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tarefas: usuário só vê/edita as próprias (precisa coluna user_id)
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Atribuir tarefas existentes ao root
UPDATE public.tarefas SET user_id = 'b1c35cfd-f22e-475b-bddd-e68130ce592b'
WHERE user_id IS NULL;

ALTER TABLE public.tarefas ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS tarefas_user_id_idx ON public.tarefas(user_id);

DROP POLICY IF EXISTS "tarefas_all" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_select" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_insert" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_update" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_delete" ON public.tarefas;

CREATE POLICY "tarefas_owner_select" ON public.tarefas FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tarefas_owner_insert" ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tarefas_owner_update" ON public.tarefas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tarefas_owner_delete" ON public.tarefas FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- empresas: leitura para qualquer autenticado; escrita só admin
DROP POLICY IF EXISTS "empresas_all" ON public.empresas;
CREATE POLICY "empresas_read_auth" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "empresas_admin_write" ON public.empresas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- documentos_tipo: leitura autenticado, escrita admin
DROP POLICY IF EXISTS "documentos_tipo_all" ON public.documentos_tipo;
CREATE POLICY "doctipo_read_auth" ON public.documentos_tipo FOR SELECT TO authenticated USING (true);
CREATE POLICY "doctipo_admin_write" ON public.documentos_tipo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- documentos_arquivo: usuário vê os da sua empresa; admin vê tudo
DROP POLICY IF EXISTS "documentos_arquivo_all" ON public.documentos_arquivo;
CREATE POLICY "docarq_select" ON public.documentos_arquivo FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "docarq_admin_write" ON public.documentos_arquivo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tipos_usuario_config: só admin
DROP POLICY IF EXISTS "tipos_usuario_config_all" ON public.tipos_usuario_config;
CREATE POLICY "tipocfg_admin_all" ON public.tipos_usuario_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tipocfg_read_auth" ON public.tipos_usuario_config FOR SELECT TO authenticated USING (true);

-- usuarios_sistema: LEGACY — bloquear todo acesso direto (só service_role)
DROP POLICY IF EXISTS "usuarios_sistema_all" ON public.usuarios_sistema;
CREATE POLICY "usuarios_sistema_admin_read" ON public.usuarios_sistema FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 5) Revogar acesso anônimo a tudo (não precisamos mais)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tarefas FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.empresas FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.documentos_tipo FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.documentos_arquivo FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tipos_usuario_config FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.usuarios_sistema FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_tipo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_arquivo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_usuario_config TO authenticated;
GRANT SELECT ON public.usuarios_sistema TO authenticated;

-- 6) Promover admin role aos administradores existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.usuarios_sistema WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
