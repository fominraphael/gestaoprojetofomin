-- ========== CONFIGURAÇÃO ==========
CREATE TABLE public.estoque_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo integer NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_origens TO authenticated;
GRANT ALL ON public.estoque_origens TO service_role;
ALTER TABLE public.estoque_origens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_origens_select" ON public.estoque_origens FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_origens_admin" ON public.estoque_origens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_empresas_nbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id uuid NOT NULL REFERENCES public.estoque_origens(id) ON DELETE CASCADE,
  codigo_chassi_resumido text NOT NULL,
  nome_exibicao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem_id, codigo_chassi_resumido)
);
CREATE INDEX idx_estoque_empresas_nbs_origem ON public.estoque_empresas_nbs(origem_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_empresas_nbs TO authenticated;
GRANT ALL ON public.estoque_empresas_nbs TO service_role;
ALTER TABLE public.estoque_empresas_nbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_nbs_select" ON public.estoque_empresas_nbs FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_nbs_admin" ON public.estoque_empresas_nbs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_finalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_finalidades TO authenticated;
GRANT ALL ON public.estoque_finalidades TO service_role;
ALTER TABLE public.estoque_finalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_finalidades_select" ON public.estoque_finalidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_finalidades_admin" ON public.estoque_finalidades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_faixas_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia_inicio integer NOT NULL,
  dia_fim integer NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_faixas_dias TO authenticated;
GRANT ALL ON public.estoque_faixas_dias TO service_role;
ALTER TABLE public.estoque_faixas_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_faixas_select" ON public.estoque_faixas_dias FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_faixas_admin" ON public.estoque_faixas_dias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.estoque_faixas_dias (nome, dia_inicio, dia_fim, ordem) VALUES
  ('0 a 15', 0, 15, 1),
  ('16 a 30', 16, 30, 2),
  ('31 a 45', 31, 45, 3),
  ('46 a 60', 46, 60, 4);

CREATE TABLE public.estoque_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classificacao text NOT NULL CHECK (classificacao IN ('A+','A','B','C','D')),
  faixa_id uuid NOT NULL REFERENCES public.estoque_faixas_dias(id) ON DELETE CASCADE,
  tipo_regra text NOT NULL DEFAULT 'ajuste' CHECK (tipo_regra IN ('base','ajuste','finalidade')),
  percentual numeric(8,3) NOT NULL DEFAULT 0,
  arredonda_990 boolean NOT NULL DEFAULT false,
  piso_fipe_ativo boolean NOT NULL DEFAULT false,
  piso_fipe_percentual numeric(8,3),
  teto_fipe_ativo boolean NOT NULL DEFAULT false,
  teto_fipe_percentual numeric(8,3),
  canais_exigidos text[] NOT NULL DEFAULT ARRAY[]::text[],
  gera_tarefa boolean NOT NULL DEFAULT false,
  nome_tarefa text,
  nova_finalidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classificacao, faixa_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_regras TO authenticated;
GRANT ALL ON public.estoque_regras TO service_role;
ALTER TABLE public.estoque_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_regras_select" ON public.estoque_regras FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_regras_admin" ON public.estoque_regras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_regra_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id uuid NOT NULL REFERENCES public.estoque_regras(id) ON DELETE CASCADE,
  leads_min integer,
  leads_max integer,
  percentual numeric(8,3) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_estoque_regra_leads_regra ON public.estoque_regra_leads(regra_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_regra_leads TO authenticated;
GRANT ALL ON public.estoque_regra_leads TO service_role;
ALTER TABLE public.estoque_regra_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_regra_leads_select" ON public.estoque_regra_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_regra_leads_admin" ON public.estoque_regra_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== DADOS ==========
CREATE TABLE public.estoque_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chassi text NOT NULL,
  origem_id uuid NOT NULL REFERENCES public.estoque_origens(id) ON DELETE RESTRICT,
  chassi_resumido text NOT NULL,
  empresa_nbs_id uuid REFERENCES public.estoque_empresas_nbs(id) ON DELETE SET NULL,
  regional text,
  loja text,
  modelo text,
  ano_mod text,
  cor text,
  placa text,
  km integer,
  custo_total numeric(14,2),
  valor_anunciado_planilha numeric(14,2),
  fipe numeric(14,2),
  percentual_fipe_planilha numeric(8,3),
  dias_em_estoque integer NOT NULL DEFAULT 0,
  fotos_qtd integer,
  leads_60_dias integer NOT NULL DEFAULT 0,
  classificacao text,
  acao_planilha text,
  codigo_fipe text,
  finalidade text,
  finalidade_atual text,
  valor_anuncio_calculado numeric(14,2),
  faixa_id_atual uuid REFERENCES public.estoque_faixas_dias(id) ON DELETE SET NULL,
  em_repasse boolean NOT NULL DEFAULT false,
  ultimo_calculo_em timestamptz,
  importado_em timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chassi, origem_id, chassi_resumido)
);
CREATE INDEX idx_estoque_veiculos_chassi ON public.estoque_veiculos(chassi);
CREATE INDEX idx_estoque_veiculos_deleted ON public.estoque_veiculos(deleted_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_veiculos TO authenticated;
GRANT ALL ON public.estoque_veiculos TO service_role;
ALTER TABLE public.estoque_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_veiculos_select" ON public.estoque_veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_veiculos_insert" ON public.estoque_veiculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estoque_veiculos_update" ON public.estoque_veiculos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estoque_veiculos_delete_admin" ON public.estoque_veiculos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_vendas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional text,
  loja text,
  vendedor text,
  nome_cliente text,
  placa text,
  modelo text,
  versao text,
  km integer,
  ano_modelo text,
  finalidade text,
  data_venda date,
  valor_venda numeric(14,2),
  valor_custo numeric(14,2),
  valor_imposto numeric(14,2),
  lucro_bruto numeric(14,2),
  dias_em_estoque integer,
  chassi text,
  codigo_fipe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chassi, data_venda, valor_venda)
);
CREATE INDEX idx_estoque_vendas_fipe ON public.estoque_vendas_historico(codigo_fipe, ano_modelo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_vendas_historico TO authenticated;
GRANT ALL ON public.estoque_vendas_historico TO service_role;
ALTER TABLE public.estoque_vendas_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_vendas_select" ON public.estoque_vendas_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_vendas_write" ON public.estoque_vendas_historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estoque_vendas_update" ON public.estoque_vendas_historico FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estoque_vendas_delete_admin" ON public.estoque_vendas_historico FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_anuncios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chassi text NOT NULL UNIQUE,
  codigo text,
  conta text,
  placa text,
  marca text,
  modelo text,
  versao text,
  ano_fabricacao text,
  ano_modelo text,
  cor text,
  km integer,
  preco_venda numeric(14,2),
  qtd_fotos integer,
  status text,
  canal_site_proprio boolean NOT NULL DEFAULT false,
  canal_olx boolean NOT NULL DEFAULT false,
  canal_webmotors boolean NOT NULL DEFAULT false,
  plataformas jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  importado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_anuncios TO authenticated;
GRANT ALL ON public.estoque_anuncios TO service_role;
ALTER TABLE public.estoque_anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_anuncios_select" ON public.estoque_anuncios FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_anuncios_insert" ON public.estoque_anuncios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estoque_anuncios_update" ON public.estoque_anuncios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estoque_anuncios_delete_admin" ON public.estoque_anuncios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_valor_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.estoque_veiculos(id) ON DELETE CASCADE,
  valor_anterior numeric(14,2),
  valor_novo numeric(14,2),
  classificacao text,
  faixa_nome text,
  regra_tipo text,
  percentual numeric(8,3),
  memoria_calculo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_estoque_valor_hist_veiculo ON public.estoque_valor_historico(veiculo_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.estoque_valor_historico TO authenticated;
GRANT ALL ON public.estoque_valor_historico TO service_role;
ALTER TABLE public.estoque_valor_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_valor_hist_select" ON public.estoque_valor_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_valor_hist_insert" ON public.estoque_valor_historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estoque_valor_hist_delete_admin" ON public.estoque_valor_historico FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_tarefas_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.estoque_veiculos(id) ON DELETE CASCADE,
  regra_id uuid REFERENCES public.estoque_regras(id) ON DELETE SET NULL,
  faixa_nome text,
  nome text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  concluido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_estoque_tarefas_lead_veiculo ON public.estoque_tarefas_lead(veiculo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_tarefas_lead TO authenticated;
GRANT ALL ON public.estoque_tarefas_lead TO service_role;
ALTER TABLE public.estoque_tarefas_lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_tarefas_select" ON public.estoque_tarefas_lead FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_tarefas_insert" ON public.estoque_tarefas_lead FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estoque_tarefas_update" ON public.estoque_tarefas_lead FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estoque_tarefas_delete_admin" ON public.estoque_tarefas_lead FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.estoque_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('estoque','vendas','anuncios')),
  arquivo_nome text,
  total_linhas integer NOT NULL DEFAULT 0,
  total_importados integer NOT NULL DEFAULT 0,
  total_atualizados integer NOT NULL DEFAULT 0,
  total_ignorados integer NOT NULL DEFAULT 0,
  relatorio jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.estoque_importacoes TO authenticated;
GRANT ALL ON public.estoque_importacoes TO service_role;
ALTER TABLE public.estoque_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_importacoes_select" ON public.estoque_importacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "estoque_importacoes_insert" ON public.estoque_importacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "estoque_importacoes_delete_admin" ON public.estoque_importacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== TRIGGERS updated_at ==========
CREATE TRIGGER trg_estoque_origens_updated BEFORE UPDATE ON public.estoque_origens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_nbs_updated BEFORE UPDATE ON public.estoque_empresas_nbs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_finalidades_updated BEFORE UPDATE ON public.estoque_finalidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_faixas_updated BEFORE UPDATE ON public.estoque_faixas_dias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_regras_updated BEFORE UPDATE ON public.estoque_regras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_veiculos_updated BEFORE UPDATE ON public.estoque_veiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_anuncios_updated BEFORE UPDATE ON public.estoque_anuncios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_tarefas_updated BEFORE UPDATE ON public.estoque_tarefas_lead FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();