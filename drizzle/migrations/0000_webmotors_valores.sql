ALTER TABLE public.estoque_veiculos
  ADD COLUMN IF NOT EXISTS webmotors_valor numeric,
  ADD COLUMN IF NOT EXISTS webmotors_data_referencia date,
  ADD COLUMN IF NOT EXISTS webmotors_url text,
  ADD COLUMN IF NOT EXISTS webmotors_observacao text,
  ADD COLUMN IF NOT EXISTS webmotors_atualizado_em timestamptz;

CREATE TABLE public.estoque_webmotors_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.estoque_veiculos(id) ON DELETE CASCADE,
  placa text NOT NULL,
  valor_anterior numeric,
  valor_novo numeric NOT NULL CHECK (valor_novo > 0),
  data_referencia date,
  url_anuncio text,
  observacao text,
  arquivo_nome text,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wm_hist_veiculo ON public.estoque_webmotors_historico(veiculo_id, created_at DESC);
GRANT SELECT, INSERT ON public.estoque_webmotors_historico TO authenticated;
GRANT ALL ON public.estoque_webmotors_historico TO service_role;
ALTER TABLE public.estoque_webmotors_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wm_hist_select" ON public.estoque_webmotors_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "wm_hist_insert" ON public.estoque_webmotors_historico FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

-- Importação atômica: tudo ou nada, executada com as permissões do usuário (RLS).
CREATE OR REPLACE FUNCTION public.importar_webmotors(_itens jsonb, _arquivo text, _usuario_nome text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  v record;
  n integer := 0;
  val numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    val := (it->>'valor')::numeric;
    IF val IS NULL OR val <= 0 THEN RAISE EXCEPTION 'Valor inválido para %', it->>'veiculo_id'; END IF;
    SELECT id, placa, webmotors_valor INTO v FROM estoque_veiculos WHERE id = (it->>'veiculo_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Veículo não encontrado'; END IF;
    UPDATE estoque_veiculos SET
      webmotors_valor = val,
      webmotors_data_referencia = NULLIF(it->>'data_referencia','')::date,
      webmotors_url = NULLIF(it->>'url',''),
      webmotors_observacao = NULLIF(it->>'observacao',''),
      webmotors_atualizado_em = now()
    WHERE id = v.id;
    INSERT INTO estoque_webmotors_historico(veiculo_id, placa, valor_anterior, valor_novo, data_referencia, url_anuncio, observacao, arquivo_nome, usuario_id, usuario_nome)
    VALUES (v.id, COALESCE(v.placa, it->>'placa'), v.webmotors_valor, val, NULLIF(it->>'data_referencia','')::date, NULLIF(it->>'url',''), NULLIF(it->>'observacao',''), _arquivo, auth.uid(), _usuario_nome);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.importar_webmotors(jsonb, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.importar_webmotors(jsonb, text, text) TO authenticated;