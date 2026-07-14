
-- =========================
-- Compras Seminovos
-- =========================

CREATE TABLE public.compras_chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  filial_id UUID REFERENCES public.toyota_filiais(id) ON DELETE SET NULL,

  -- Cliente
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF','PJ')),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,

  -- Veículo
  placa TEXT NOT NULL,
  chassi TEXT,
  renavam TEXT,
  cor_externa TEXT,
  modelo TEXT,
  ano_modelo TEXT,
  loja_estoque TEXT,
  codigo_avaliacao_nbs TEXT,
  valor_avaliado NUMERIC(14,2),
  tipo_compra TEXT NOT NULL CHECK (tipo_compra IN ('somente_compra','troca_vu','troca_vn')),

  -- Estado / fluxo
  estado_uf TEXT NOT NULL CHECK (estado_uf IN ('GO','ES')),
  status TEXT NOT NULL DEFAULT 'documentacao' CHECK (status IN (
    'documentacao',       -- solicitante preenchendo/enviando docs
    'em_analise',         -- Central analisando
    'pendenciado',        -- Central pendenciou; solicitante deve resolver
    'comprado',           -- concluído
    'cancelado'
  )),

  -- NF paralelo (PJ)
  nf_status TEXT CHECK (nf_status IN ('nao_aplicavel','aguardando_analise','aprovada','reprovada')) DEFAULT 'nao_aplicavel',
  nf_observacao TEXT,

  motivo_pendencia TEXT,
  observacao_pendencia TEXT,
  campos_liberados TEXT[] DEFAULT ARRAY[]::TEXT[],

  motivo_cancelamento TEXT,
  observacao_cancelamento TEXT,

  observacao_compra TEXT,

  concluido_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Só um chamado ativo por placa
CREATE UNIQUE INDEX compras_chamados_placa_ativa_uniq
  ON public.compras_chamados (upper(placa))
  WHERE status NOT IN ('comprado','cancelado');

CREATE INDEX compras_chamados_status_idx ON public.compras_chamados(status);
CREATE INDEX compras_chamados_criado_por_idx ON public.compras_chamados(criado_por);
CREATE INDEX compras_chamados_filial_idx ON public.compras_chamados(filial_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_chamados TO authenticated;
GRANT ALL ON public.compras_chamados TO service_role;

ALTER TABLE public.compras_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_chamados_select_auth" ON public.compras_chamados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "compras_chamados_insert_auth" ON public.compras_chamados
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "compras_chamados_update_auth" ON public.compras_chamados
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "compras_chamados_delete_admin" ON public.compras_chamados
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER compras_chamados_updated_at
  BEFORE UPDATE ON public.compras_chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
CREATE TABLE public.compras_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.compras_chamados(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,      -- ex: 'dut', 'crlv', 'foto_manual', 'nf', ...
  descricao TEXT,
  storage_path TEXT NOT NULL,
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX compras_documentos_chamado_idx ON public.compras_documentos(chamado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_documentos TO authenticated;
GRANT ALL ON public.compras_documentos TO service_role;
ALTER TABLE public.compras_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras_documentos_all_auth" ON public.compras_documentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================
CREATE TABLE public.compras_debitos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.compras_chamados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'multas','laudo_cautelar','quitacao','ipva','desalienacao','chave_manual','carregador'
  )),
  status TEXT NOT NULL CHECK (status IN ('pago','pendente')),
  comprovante_path TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chamado_id, tipo)
);
CREATE INDEX compras_debitos_chamado_idx ON public.compras_debitos(chamado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_debitos TO authenticated;
GRANT ALL ON public.compras_debitos TO service_role;
ALTER TABLE public.compras_debitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras_debitos_all_auth" ON public.compras_debitos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================
CREATE TABLE public.compras_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.compras_chamados(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,           -- 'criado','pendenciado','resolvido','comprado','cancelado','nf_enviada','nf_aprovada','nf_reprovada','documento_anexado'
  motivo TEXT,
  observacao TEXT,
  anexo_path TEXT,
  autor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX compras_historico_chamado_idx ON public.compras_historico(chamado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_historico TO authenticated;
GRANT ALL ON public.compras_historico TO service_role;
ALTER TABLE public.compras_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras_historico_all_auth" ON public.compras_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
