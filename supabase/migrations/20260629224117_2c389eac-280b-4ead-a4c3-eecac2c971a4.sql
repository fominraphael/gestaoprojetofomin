ALTER TYPE tarefa_categoria ADD VALUE IF NOT EXISTS 'solicitacao';

DO $$ BEGIN
  CREATE TYPE tarefa_tipo AS ENUM ('Reunião', 'Treinamento', 'Desenho', 'Estudo de caso', 'Outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS tipo tarefa_tipo,
  ADD COLUMN IF NOT EXISTS solicitante text;