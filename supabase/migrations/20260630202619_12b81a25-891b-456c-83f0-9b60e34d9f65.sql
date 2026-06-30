
CREATE POLICY "documentos_select" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'documentos');
CREATE POLICY "documentos_insert" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos_update" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos_delete" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'documentos');
