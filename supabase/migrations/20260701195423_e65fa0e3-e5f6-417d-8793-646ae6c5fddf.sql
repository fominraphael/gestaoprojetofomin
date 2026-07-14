
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS email_notificacao TEXT;
ALTER TABLE public.documentos_arquivo ADD COLUMN IF NOT EXISTS data_vencimento DATE;
ALTER TABLE public.documentos_arquivo ADD COLUMN IF NOT EXISTS notificado_em DATE;
CREATE INDEX IF NOT EXISTS idx_documentos_arquivo_vencimento ON public.documentos_arquivo(data_vencimento) WHERE data_vencimento IS NOT NULL;
