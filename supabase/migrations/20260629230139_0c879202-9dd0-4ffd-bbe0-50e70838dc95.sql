
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS categoria_origem tarefa_categoria,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Backfill: itens já no histórico passam a contar como excluídos agora, vindos do backlog
UPDATE public.tarefas
SET categoria_origem = COALESCE(categoria_origem, 'backlog'),
    deleted_at = COALESCE(deleted_at, now())
WHERE categoria = 'historico';

CREATE INDEX IF NOT EXISTS idx_tarefas_deleted_at ON public.tarefas(deleted_at) WHERE categoria = 'historico';

-- Função de limpeza definitiva
CREATE OR REPLACE FUNCTION public.purge_old_trash()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.tarefas
  WHERE categoria = 'historico'
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - INTERVAL '30 days';
$$;

-- Agenda diária (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-old-trash');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-old-trash',
  '0 3 * * *',
  $$SELECT public.purge_old_trash();$$
);
