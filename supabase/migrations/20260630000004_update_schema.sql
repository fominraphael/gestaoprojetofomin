-- Migration to add company, modules and CNPJ login info to usuarios_sistema, and seed documentos_tipo
ALTER TABLE public.usuarios_sistema 
  ADD COLUMN IF NOT EXISTS cnpj text UNIQUE,
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modulos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Add UNIQUE constraint on documentos_tipo.nome if it does not exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documentos_tipo_nome_unique'
  ) THEN
    ALTER TABLE public.documentos_tipo ADD CONSTRAINT documentos_tipo_nome_unique UNIQUE (nome);
  END IF;
END $$;

-- Seed initial documents_tipo
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
