-- ============================================================
-- Evolução do módulo Rotina → Notion Interno (Frentes)
-- ============================================================

-- 1. Adicionar campos icone e descricao à tabela de setores (agora "Frentes")
ALTER TABLE public.rotina_setores
  ADD COLUMN IF NOT EXISTS icone text NOT NULL DEFAULT '📋',
  ADD COLUMN IF NOT EXISTS descricao text NOT NULL DEFAULT '';

-- 2. Criar tabela de checkpoint diário da rotina
-- Cada linha = "esta atividade foi concluída neste dia"
CREATE TABLE IF NOT EXISTS public.rotina_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES public.rotina_atividades(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  concluido_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(atividade_id, data)
);

-- 3. RLS para checkpoints
ALTER TABLE public.rotina_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkpoints_select" ON public.rotina_checkpoints
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "checkpoints_insert" ON public.rotina_checkpoints
  FOR INSERT TO authenticated WITH CHECK (concluido_por = auth.uid());

CREATE POLICY "checkpoints_delete" ON public.rotina_checkpoints
  FOR DELETE TO authenticated
  USING (
    concluido_por = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. Migrar dados existentes: copiar icone de cor para icone (emoji padrão)
-- Se já existirem setores, manter o emoji como 📋 (padrão)
UPDATE public.rotina_setores SET icone = '📋' WHERE icone IS NULL OR icone = '';
