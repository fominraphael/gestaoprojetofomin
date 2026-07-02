ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS checklist_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS checklist_itens JSONB;