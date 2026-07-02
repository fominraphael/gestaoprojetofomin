ALTER TABLE public.toyota_estoque_veiculos
  ADD COLUMN IF NOT EXISTS codigo_tcuv TEXT,
  ADD COLUMN IF NOT EXISTS dossie_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS dossie_enviado_em TIMESTAMPTZ;

UPDATE public.toyota_estoque_veiculos
SET resultado_laudo = 'aprovado'
WHERE resultado_laudo IS NOT NULL
  AND lower(resultado_laudo) ~ '(avaliado|aprovado)'
  AND resultado_laudo <> 'aprovado';