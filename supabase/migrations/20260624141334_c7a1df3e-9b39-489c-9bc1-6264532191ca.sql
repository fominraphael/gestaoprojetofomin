
CREATE TYPE public.tarefa_status AS ENUM ('Não iniciada', 'Em andamento', 'Concluído');
CREATE TYPE public.tarefa_prioridade AS ENUM ('Baixa', 'Média', 'Alta');
CREATE TYPE public.tarefa_categoria AS ENUM ('backlog', 'roadmap', 'historico');

CREATE TABLE public.tarefas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  titulo text NOT NULL,
  descricao_como text,
  descricao_porque text,
  projeto text,
  responsaveis text,
  status public.tarefa_status NOT NULL DEFAULT 'Não iniciada',
  prioridade public.tarefa_prioridade,
  prazo_inicio date,
  prazo_fim date,
  categoria public.tarefa_categoria NOT NULL DEFAULT 'backlog',
  tags text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público de leitura" ON public.tarefas FOR SELECT USING (true);
CREATE POLICY "Acesso público de inserção" ON public.tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso público de atualização" ON public.tarefas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público de exclusão" ON public.tarefas FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tarefas_categoria ON public.tarefas(categoria);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_tarefas_prazo_fim ON public.tarefas(prazo_fim);
