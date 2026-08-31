ALTER TABLE public.estoque_importacoes ADD COLUMN IF NOT EXISTS arquivo_path TEXT;

CREATE POLICY "Autenticados enviam planilhas de importacao"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'estoque-importacoes');

CREATE POLICY "Autenticados leem planilhas de importacao"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'estoque-importacoes');