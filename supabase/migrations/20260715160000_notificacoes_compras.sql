-- ============================================================
-- 1. Campo central_compras no profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS central_compras boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Colunas de controle de notificações em compras_chamados
-- ============================================================
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS status_entrou_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notificacao_ultima_envio jsonb NOT NULL DEFAULT '{}'::jsonb;
-- status_entrou_em: timestamp de quando entrou no status atual
-- notificacao_ultima_envio: { "documentacao": "2026-07-15T10:00:00Z", "na_fila_central": ... }

-- ============================================================
-- 3. Tabela de notificações (log + push status)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compras_notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id uuid NOT NULL REFERENCES public.compras_chamados(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES auth.users(id),
  tipo text NOT NULL,          -- 'popup' | 'email' | 'push'
  status_notif text NOT NULL DEFAULT 'pendente', -- 'pendente' | 'enviado' | 'lido' | 'erro'
  titulo text NOT NULL,
  mensagem text NOT NULL,
  link text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  lido_em timestamptz,
  enviado_em timestamptz
);

ALTER TABLE public.compras_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select_auth ON public.compras_notificacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY notif_insert_auth ON public.compras_notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY notif_update_auth ON public.compras_notificacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Coluna central_compras na tela de admin de usuários
-- ============================================================
-- (já coberto pelo item 1 — basta o frontend ler/gravar o campo)

-- ============================================================
-- 5. Atualizar handle_new_user para incluir central_compras
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_username text := COALESCE(meta->>'username', split_part(NEW.email,'@',1));
  v_role app_role := COALESCE((meta->>'role')::app_role, 'user'::app_role);
BEGIN
  INSERT INTO public.profiles (
    id, username, tipo_usuario, modulos, empresa_id, cnpj,
    pode_criar_admin, central_compras, campos_customizados, ativo, status, email_recuperacao, nome_fantasia
  ) VALUES (
    NEW.id,
    v_username,
    COALESCE(meta->>'tipo_usuario', 'Lojista'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(meta->'modulos')), ARRAY[]::text[]),
    NULLIF(meta->>'empresa_id','')::uuid,
    meta->>'cnpj',
    COALESCE((meta->>'pode_criar_admin')::boolean, false),
    COALESCE((meta->>'central_compras')::boolean, false),
    COALESCE(meta->'campos_customizados', '{}'::jsonb),
    COALESCE((meta->>'ativo')::boolean, true),
    COALESCE(meta->>'status', 'pending'),
    NULLIF(meta->>'email_recuperacao',''),
    NULLIF(meta->>'nome_fantasia','')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 6. Index para performance do checker
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chamados_status_entrou
  ON public.compras_chamados(status_entrou_em);

CREATE INDEX IF NOT EXISTS idx_notif_chamado_dest
  ON public.compras_notificacoes(chamado_id, destinatario_id);
