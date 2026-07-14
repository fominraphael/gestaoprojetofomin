-- Adiciona status "suspenso" ao módulo Compras Seminovos
-- Apenas o admin com perfil ID 104982f4-794b-4cf5-b024-adb55609d3d9 pode utilizar este status.

-- 1. Adicionar colunas de suspensão na tabela de chamados
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS motivo_suspensao    text,
  ADD COLUMN IF NOT EXISTS observacao_suspensao text,
  ADD COLUMN IF NOT EXISTS suspenso_em         timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por        uuid REFERENCES auth.users(id);

-- 2. Remover o CHECK constraint de status antigo (sem 'suspenso')
ALTER TABLE public.compras_chamados
  DROP CONSTRAINT IF EXISTS compras_chamados_status_check;

-- 3. Recriar o CHECK constraint incluindo 'suspenso'
ALTER TABLE public.compras_chamados
  ADD CONSTRAINT compras_chamados_status_check
  CHECK (status IN (
    'documentacao',
    'na_fila_central',
    'em_analise',
    'pendenciado',
    'suspenso',
    'comprado',
    'cancelado'
  ));
