ALTER TABLE public.rotina_atividades ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.rotina_tarefas ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_rotina_atividades_deleted_at ON public.rotina_atividades (deleted_at);
CREATE INDEX IF NOT EXISTS idx_rotina_tarefas_deleted_at ON public.rotina_tarefas (deleted_at);