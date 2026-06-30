CREATE TABLE IF NOT EXISTS public.documentos_tipo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now()
);
