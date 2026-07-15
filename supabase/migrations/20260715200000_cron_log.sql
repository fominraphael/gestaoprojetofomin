-- Tabela para registrar execuções do cron de notificações
CREATE TABLE IF NOT EXISTS public.cron_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  detalhes jsonb,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz
);

ALTER TABLE public.cron_log ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode escrever/ler (via server-side)
CREATE POLICY "cron_log_service_all" ON public.cron_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Índices para consultas de histórico
CREATE INDEX idx_cron_log_job_name ON public.cron_log (job_name);
CREATE INDEX idx_cron_log_iniciado_em ON public.cron_log (iniciado_em DESC);
