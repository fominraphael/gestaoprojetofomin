
ALTER TABLE public.toyota_estoque_veiculos
  DROP CONSTRAINT IF EXISTS toyota_estoque_veiculos_status_aprovacao_check;

ALTER TABLE public.toyota_estoque_veiculos
  ADD CONSTRAINT toyota_estoque_veiculos_status_aprovacao_check
  CHECK (status_aprovacao IN (
    'analise',
    'pendente_preparacao',
    'em_posvendas',
    'devolvido_preparador',
    'aguardando_analise_central',
    'enviado_toyota',
    'aprovado_toyota',
    'reprovado_toyota',
    'aprovado',
    'rejeitado'
  ));

ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS checklist_data jsonb,
  ADD COLUMN IF NOT EXISTS health_check_pdf_path text,
  ADD COLUMN IF NOT EXISTS health_check_uploaded_at timestamptz;
