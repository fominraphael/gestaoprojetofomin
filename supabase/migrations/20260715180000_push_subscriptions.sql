-- ============================================================
-- Tabela de inscrições Push (Web Push API)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  user_agent text
);

-- Cada usuário pode ter múltiplas subscriptions (vários dispositivos/navegadores)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_endpoint
  ON public.push_subscriptions(endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem gerenciar suas próprias subscriptions
CREATE POLICY push_sub_select_own ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY push_sub_insert_own ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_sub_delete_own ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role pode acessar tudo (para envio de push pelo backend)
-- As policies acima não se aplicam a service_role, que bypassa RLS

-- ============================================================
-- Tabela para armazenar chaves VAPID (opcional, fallback para env vars)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vapid_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_key text NOT NULL,
  private_key text NOT NULL,
  subject text NOT NULL DEFAULT 'mailto:admin@moduloabsn.com',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vapid_keys ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode acessar (sem policies = sem acesso via client)
