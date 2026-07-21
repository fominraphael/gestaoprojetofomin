-- Enum for Status (from GAS project)
DO $$ BEGIN
    CREATE TYPE public.toyota_revisao_status AS ENUM (
      'aguardando_aprovacao',
      'aprovado_pos_vendas',
      'devolvido_seminovos',
      'os_aberta',
      'em_execucao',
      'aguardando_documentos',
      'finalizado',
      'cancelado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table for Revisions
CREATE TABLE IF NOT EXISTS public.toyota_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  solicitante_id uuid REFERENCES auth.users(id),
  consultor_seminovos text NOT NULL,
  placa text NOT NULL,
  modelo text NOT NULL,
  chassi text NOT NULL,
  km_atual numeric,
  km_validado_mecanico numeric,
  revisao boolean DEFAULT false,
  certificacao boolean DEFAULT false,
  prioridade text DEFAULT 'NORMAL',
  observacao_seminovos text,
  status public.toyota_revisao_status DEFAULT 'aguardando_aprovacao',
  gestora_id uuid REFERENCES auth.users(id),
  data_aprovacao timestamptz,
  observacao_gestora text,
  responsavel_pos_vendas_id uuid REFERENCES auth.users(id),
  numero_os text,
  tipo_os text,
  data_abertura_os timestamptz,
  observacao_pos_vendas text,
  data_finalizacao timestamptz,
  observacao_finalizacao text,
  mecanico_id uuid REFERENCES auth.users(id),
  data_inicio_execucao timestamptz,
  link_health_check text,
  link_pdf_revalidacao text,
  link_pdf_certificacao text,
  observacao_mecanico text,
  data_execucao_concluida timestamptz
);

-- RLS and Grants
ALTER TABLE public.toyota_revisoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Permitir leitura para todos os autenticados" ON public.toyota_revisoes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir inserção para todos os autenticados" ON public.toyota_revisoes FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir atualização para todos os autenticados" ON public.toyota_revisoes FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

GRANT SELECT, INSERT, UPDATE ON public.toyota_revisoes TO authenticated;
GRANT ALL ON public.toyota_revisoes TO service_role;
