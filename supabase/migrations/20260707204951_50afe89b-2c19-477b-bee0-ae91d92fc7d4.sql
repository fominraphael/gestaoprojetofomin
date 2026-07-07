ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS certificado_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS certificado_uploaded_at TIMESTAMPTZ;