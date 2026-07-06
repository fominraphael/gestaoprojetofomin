ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS ordem INTEGER;
CREATE INDEX IF NOT EXISTS tarefas_ordem_idx ON public.tarefas(ordem) WHERE deleted_at IS NULL;