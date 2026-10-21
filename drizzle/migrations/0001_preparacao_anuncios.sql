CREATE TABLE public.prep_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL UNIQUE,
  regional text,
  loja_bruta text,
  modelo text,
  ano_mod text,
  cor text,
  km integer,
  custo_total numeric,
  valor_anunciado numeric,
  fipe numeric,
  dias_em_estoque integer,
  fotos_qtd integer,
  leads_60_dias integer,
  classificacao text,
  chassi text,
  finalidade text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  inativado_em timestamptz,
  ultima_importacao_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prep_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('estoque','os','banco_fotos','gosystem','tcuv','auditoria')),
  arquivo_nome text,
  usuario_id uuid,
  usuario_nome text,
  total_linhas integer NOT NULL DEFAULT 0,
  total_validas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso','erro')),
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prep_base_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('os','banco_fotos','gosystem','tcuv','auditoria')),
  importacao_id uuid REFERENCES public.prep_importacoes(id) ON DELETE CASCADE,
  placa text NOT NULL,
  placa_alt text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prep_base_linhas_tipo_placa_idx ON public.prep_base_linhas(tipo, placa);
CREATE TABLE public.prep_config_indicadores (
  indicador text PRIMARY KEY CHECK (indicador IN ('os','foto','tcuv','auditoria')),
  habilitado boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.prep_config_indicadores(indicador, habilitado, config) VALUES
 ('os', true, '{}'), ('foto', true, '{"min_fotos":5,"dias_gosystem":7}'),
 ('tcuv', true, '{}'), ('auditoria', true, '{}');
CREATE TABLE public.prep_lojas_agrupamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_origem text NOT NULL UNIQUE,
  loja_canonica text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prep_lojas_direcionamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_sem_operacao text NOT NULL UNIQUE,
  loja_responsavel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prep_regional_responsavel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_tipo text NOT NULL CHECK (chave_tipo IN ('loja','regional')),
  chave text NOT NULL,
  responsavel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chave_tipo, chave)
);
CREATE TABLE public.prep_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  texto text NOT NULL,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prep_observacoes_placa_idx ON public.prep_observacoes(placa);
CREATE TABLE public.prep_observacoes_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observacao_id uuid NOT NULL REFERENCES public.prep_observacoes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  nome_original text NOT NULL,
  tamanho integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['prep_veiculos','prep_importacoes','prep_base_linhas','prep_config_indicadores','prep_lojas_agrupamento','prep_lojas_direcionamento','prep_regional_responsavel','prep_observacoes','prep_observacoes_anexos'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Autenticados leem" ON public.%I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['prep_veiculos','prep_base_linhas','prep_lojas_agrupamento','prep_lojas_direcionamento','prep_regional_responsavel'] LOOP
    EXECUTE format('CREATE POLICY "Autenticados gravam" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE POLICY "Config editavel" ON public.prep_config_indicadores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Registra importacao" ON public.prep_importacoes FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Cria observacao" ON public.prep_observacoes FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());
CREATE POLICY "Remove propria observacao" ON public.prep_observacoes FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Cria anexo" ON public.prep_observacoes_anexos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.prep_observacoes o WHERE o.id = observacao_id AND o.autor_id = auth.uid()));

CREATE TRIGGER prep_veiculos_updated BEFORE UPDATE ON public.prep_veiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "prep anexos leitura" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'prep-anexos');
CREATE POLICY "prep anexos upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prep-anexos');