
-- =========================================================
-- EMPRESAS
-- =========================================================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO anon, authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas_all" ON public.empresas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- DOCUMENTOS_TIPO
-- =========================================================
CREATE TABLE public.documentos_tipo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_tipo TO anon, authenticated;
GRANT ALL ON public.documentos_tipo TO service_role;
ALTER TABLE public.documentos_tipo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_tipo_all" ON public.documentos_tipo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- DOCUMENTOS_ARQUIVO
-- =========================================================
CREATE TABLE public.documentos_arquivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_id UUID NOT NULL REFERENCES public.documentos_tipo(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho INTEGER,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docarq_empresa ON public.documentos_arquivo(empresa_id);
CREATE INDEX idx_docarq_tipo ON public.documentos_arquivo(tipo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_arquivo TO anon, authenticated;
GRANT ALL ON public.documentos_arquivo TO service_role;
ALTER TABLE public.documentos_arquivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_arquivo_all" ON public.documentos_arquivo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- TIPOS_USUARIO_CONFIG
-- =========================================================
CREATE TABLE public.tipos_usuario_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  campos_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_usuario_config TO anon, authenticated;
GRANT ALL ON public.tipos_usuario_config TO service_role;
ALTER TABLE public.tipos_usuario_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_usuario_config_all" ON public.tipos_usuario_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- USUARIOS_SISTEMA  (password_hash NOT exposed via view)
-- =========================================================
CREATE TABLE public.usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  tipo_usuario TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  modulos TEXT[] NOT NULL DEFAULT '{}',
  campos_customizados JSONB NOT NULL DEFAULT '{}'::jsonb,
  cnpj TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  pode_criar_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_sistema TO anon, authenticated;
GRANT ALL ON public.usuarios_sistema TO service_role;
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;
-- Allow login validation (full row needed to check password_hash). The app
-- queries this table only via filters that include password_hash on login.
-- Listings must go through the view below.
CREATE POLICY "usuarios_sistema_all" ON public.usuarios_sistema FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Safe view (no password_hash)
CREATE VIEW public.usuarios_sistema_public
WITH (security_invoker = on) AS
SELECT id, username, role, status, tipo_usuario, ativo, modulos,
       campos_customizados, cnpj, empresa_id, pode_criar_admin,
       created_at, updated_at
FROM public.usuarios_sistema;
GRANT SELECT ON public.usuarios_sistema_public TO anon, authenticated;

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_documentos_tipo_updated_at BEFORE UPDATE ON public.documentos_tipo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tipos_usuario_config_updated_at BEFORE UPDATE ON public.tipos_usuario_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_usuarios_sistema_updated_at BEFORE UPDATE ON public.usuarios_sistema
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SEED — Tipos de documento padrão
-- =========================================================
INSERT INTO public.documentos_tipo (nome, descricao) VALUES
  ('ALVARÁ BOMBEIRO', 'Alvará do Corpo de Bombeiros'),
  ('ALVARÁ FUNCIONAMENTO', 'Alvará de Funcionamento da empresa'),
  ('ALVARÁ PUBLICIDADE', 'Alvará de Publicidade/Anúncios'),
  ('CARTÃO CNPJ', 'Comprovante de Inscrição e de Situação Cadastral'),
  ('CARTÃO MUNICIPAL', 'Inscrição Municipal da empresa'),
  ('CARTÃO SINTEGRA', 'Cadastro no Sintegra/ICMS'),
  ('CND ESPECIFICA - RIGUEL', 'Certidão Negativa de Débitos Específica'),
  ('CND ESTADUAL', 'Certidão Negativa de Débitos Estaduais'),
  ('CND FALÊNCIA', 'Certidão Negativa de Falência e Recuperação Judicial'),
  ('CND FEDERAL-INSS', 'Certidão Negativa de Débitos Federais e INSS'),
  ('CND FGTS', 'Certificado de Regularidade do FGTS (CRF)'),
  ('CND MUNICIPAL', 'Certidão Negativa de Débitos Municipais'),
  ('CND SIMPLIFICADA', 'Certidão Negativa Simplificada'),
  ('CND TRABALHISTA', 'Certidão Negativa de Débitos Trabalhistas (CNDT)'),
  ('CONTRATO SOCIAL', 'Contrato Social Consolidado ou Estatuto Social'),
  ('HABITE-SE', 'Habite-se do imóvel da empresa'),
  ('LICENÇA AMBIENTAL', 'Licença Ambiental de Operação/Instalação'),
  ('PROCURACAO - ADMINISTRATIVA', 'Procuração Administrativa'),
  ('PROCURACAO - CONTRATOS', 'Procuração para Assinatura de Contratos'),
  ('PROCURAÇÃO - DETRAN', 'Procuração DETRAN')
ON CONFLICT (nome) DO NOTHING;

-- =========================================================
-- SEED — Tipos de usuário padrão
-- =========================================================
INSERT INTO public.tipos_usuario_config (nome, role, campos_schema) VALUES
  ('Administrador', 'admin', '[]'::jsonb),
  ('Lojista', 'user', '[
    {"nome":"cnpj","label":"CNPJ","tipo":"text","obrigatorio":true},
    {"nome":"razao_social","label":"Razão Social","tipo":"text","obrigatorio":true}
  ]'::jsonb),
  ('ADM de loja', 'user', '[
    {"nome":"cnpj","label":"CNPJ","tipo":"text","obrigatorio":true},
    {"nome":"nome_loja","label":"Nome da Loja","tipo":"text","obrigatorio":false}
  ]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- =========================================================
-- SEED — Usuário root (SHA-256 de "root") — apenas se ainda não existir
-- =========================================================
INSERT INTO public.usuarios_sistema
  (username, password_hash, role, status, tipo_usuario, ativo, modulos, pode_criar_admin)
VALUES
  ('root',
   '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',
   'admin', 'approved', 'Administrador', true,
   ARRAY['documentos','gestao','admin'], true)
ON CONFLICT (username) DO NOTHING;
