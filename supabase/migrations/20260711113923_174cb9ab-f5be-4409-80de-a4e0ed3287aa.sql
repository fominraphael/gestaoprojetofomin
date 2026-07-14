
CREATE TABLE public.compras_cadastros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('loja_estoque','tipo_compra','motivo_pendencia','motivo_cancelamento','tipo_debito','estado_uf')),
  valor TEXT NOT NULL,
  label TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, valor)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_cadastros TO authenticated;
GRANT ALL ON public.compras_cadastros TO service_role;

ALTER TABLE public.compras_cadastros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadastros_select_auth"
  ON public.compras_cadastros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cadastros_admin_write"
  ON public.compras_cadastros FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cadastros_updated
  BEFORE UPDATE ON public.compras_cadastros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial (idempotente via UNIQUE)
INSERT INTO public.compras_cadastros (categoria, valor, label, ordem) VALUES
  ('estado_uf','GO','Goiás',1),
  ('estado_uf','ES','Espírito Santo',2),
  ('tipo_compra','somente_compra','Somente compra',1),
  ('tipo_compra','troca_vu','Troca por VU',2),
  ('tipo_compra','troca_vn','Troca por VN',3),
  ('tipo_debito','multas','Multas',1),
  ('tipo_debito','laudo_cautelar','Laudo cautelar',2),
  ('tipo_debito','quitacao','Quitação',3),
  ('tipo_debito','ipva','IPVA',4),
  ('tipo_debito','desalienacao','Desalienação',5),
  ('tipo_debito','chave_manual','Chave / manual',6),
  ('tipo_debito','carregador','Carregador',7),
  ('motivo_pendencia','doc_ilegivel','Documento ilegível',1),
  ('motivo_pendencia','doc_vencido','Documento vencido',2),
  ('motivo_pendencia','div_veiculo','Divergência de dados do veículo',3),
  ('motivo_pendencia','div_cliente','Divergência de dados do cliente',4),
  ('motivo_pendencia','debito_nao_id','Débito não identificado',5),
  ('motivo_pendencia','falta_comprovante','Falta de comprovante',6),
  ('motivo_pendencia','outros','Outros',99),
  ('motivo_cancelamento','desistencia','Desistência do cliente',1),
  ('motivo_cancelamento','divergencia','Divergência insanável',2),
  ('motivo_cancelamento','restricao','Restrição legal',3),
  ('motivo_cancelamento','preco','Preço não aprovado',4),
  ('motivo_cancelamento','outros','Outros',99)
ON CONFLICT (categoria, valor) DO NOTHING;
