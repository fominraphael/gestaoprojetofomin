
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_recuperacao text;

CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prc_user ON public.password_reset_codes(user_id, expires_at DESC);

GRANT ALL ON public.password_reset_codes TO service_role;

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (server-side admin) reads/writes.
