-- Migration to add support for dynamic user types, custom metadata fields, and admin permission flags

-- 1. Create table for dynamic user types
CREATE TABLE IF NOT EXISTS public.tipos_usuario_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  campos_schema jsonb DEFAULT '[]'::jsonb, -- Array of objects: { nome, label, tipo, obrigatorio }
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and public access policies
ALTER TABLE public.tipos_usuario_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público de leitura para tipos" ON public.tipos_usuario_config FOR SELECT USING (true);
CREATE POLICY "Acesso público de inserção para tipos" ON public.tipos_usuario_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso público de atualização para tipos" ON public.tipos_usuario_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público de exclusão para tipos" ON public.tipos_usuario_config FOR DELETE USING (true);

-- Seed initial default user types
INSERT INTO public.tipos_usuario_config (nome, role, campos_schema) VALUES
  ('Administrador', 'admin', '[]'::jsonb),
  ('Lojista', 'user', '[{"nome": "cnpj", "label": "CNPJ", "tipo": "text", "obrigatorio": true}, {"nome": "razao_social", "label": "Razão Social", "tipo": "text", "obrigatorio": true}]'::jsonb),
  ('ADM de loja', 'user', '[{"nome": "cnpj", "label": "CNPJ", "tipo": "text", "obrigatorio": true}, {"nome": "nome_loja", "label": "Nome da Loja", "tipo": "text", "obrigatorio": false}]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- 2. Add columns to public.usuarios_sistema
ALTER TABLE public.usuarios_sistema
  ADD COLUMN IF NOT EXISTS tipo_usuario text DEFAULT 'Lojista',
  ADD COLUMN IF NOT EXISTS pode_criar_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS campos_customizados jsonb DEFAULT '{}'::jsonb;

-- Root user should always be allowed to create admins
UPDATE public.usuarios_sistema 
SET pode_criar_admin = true, tipo_usuario = 'Administrador' 
WHERE username = 'root';
