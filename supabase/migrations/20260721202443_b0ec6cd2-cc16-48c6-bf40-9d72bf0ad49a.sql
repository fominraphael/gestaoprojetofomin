CREATE TABLE IF NOT EXISTS public.cron_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  job_name text NOT NULL,
  status text NOT NULL,
  detalhes jsonb,
  iniciado_em timestamptz,
  finalizado_em timestamptz
);

ALTER TABLE public.cron_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cron_log TO service_role;
GRANT INSERT ON public.cron_log TO authenticated;
