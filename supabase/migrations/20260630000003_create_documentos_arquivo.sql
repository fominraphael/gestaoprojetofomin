CREATE TABLE IF NOT EXISTS public.documentos_arquivo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_id uuid NOT NULL REFERENCES public.documentos_tipo(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now()
);
