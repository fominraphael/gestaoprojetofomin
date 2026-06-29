
ALTER TABLE public.tarefas ADD COLUMN inicio_previsto date;
ALTER TABLE public.tarefas ADD COLUMN estimativa_dias integer;
ALTER TABLE public.tarefas ADD COLUMN inicio_real date;
ALTER TABLE public.tarefas ADD COLUMN fim_real date;

-- Backfill from old columns
UPDATE public.tarefas
SET inicio_previsto = prazo_inicio,
    estimativa_dias = CASE
      WHEN prazo_inicio IS NOT NULL AND prazo_fim IS NOT NULL
        THEN GREATEST((prazo_fim - prazo_inicio)::int, 0)
      ELSE NULL
    END;

-- Generated column for fim_previsto
ALTER TABLE public.tarefas
  ADD COLUMN fim_previsto date
  GENERATED ALWAYS AS (
    CASE
      WHEN inicio_previsto IS NOT NULL AND estimativa_dias IS NOT NULL
        THEN inicio_previsto + estimativa_dias
      ELSE NULL
    END
  ) STORED;

ALTER TABLE public.tarefas DROP COLUMN prazo_inicio;
ALTER TABLE public.tarefas DROP COLUMN prazo_fim;

CREATE INDEX IF NOT EXISTS tarefas_fim_previsto_idx ON public.tarefas(fim_previsto);
