
-- 1) Ajustar constraint para permitir mesmo chassi com chassi_resumido diferente
DROP INDEX IF EXISTS public.uq_toyota_estoque_filial_chassi;

CREATE UNIQUE INDEX uq_toyota_estoque_filial_chassi_resumido
  ON public.toyota_estoque_veiculos (filial_id, chassi, COALESCE(chassi_resumido, ''));

-- 2) Histórico de importações
CREATE TABLE IF NOT EXISTS public.toyota_importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filial_id UUID REFERENCES public.toyota_filiais(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('gosystem', 'bi_toyota')),
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'parcial')),
  arquivo_nome TEXT,
  arquivo_path TEXT,
  total_linhas INTEGER DEFAULT 0,
  total_salvos INTEGER DEFAULT 0,
  total_ignorados INTEGER DEFAULT 0,
  mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.toyota_importacoes TO authenticated;
GRANT ALL ON public.toyota_importacoes TO service_role;

ALTER TABLE public.toyota_importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Toyota users can view own importacoes"
  ON public.toyota_importacoes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

CREATE POLICY "Toyota users can insert importacoes"
  ON public.toyota_importacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3) Regras dinâmicas do sistema (key/value)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can write settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed padrões
INSERT INTO public.system_settings (key, value) VALUES
  ('toyota_regras', jsonb_build_object(
    'origens_aceitas', jsonb_build_array('Toyota - Estoque'),
    'marcas_aceitas', jsonb_build_array('Toyota', 'Lexus'),
    'tcuv_idade_max', 10,
    'tsim_idade_min', 6,
    'tsim_idade_max', 15,
    'laudos_aprovados', jsonb_build_array('AVALIADO', 'APROVADO')
  )),
  ('upload', jsonb_build_object('max_mb', 10)),
  ('alertas', jsonb_build_object('horario_diario', '00:01'))
ON CONFLICT (key) DO NOTHING;
