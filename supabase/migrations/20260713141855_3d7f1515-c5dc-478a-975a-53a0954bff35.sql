
ALTER TABLE public.compras_cadastros DROP CONSTRAINT compras_cadastros_categoria_check;
ALTER TABLE public.compras_cadastros ADD CONSTRAINT compras_cadastros_categoria_check
  CHECK (categoria = ANY (ARRAY['loja_estoque','tipo_compra','motivo_pendencia','motivo_cancelamento','tipo_debito','estado_uf','campo_formulario','documento']));

ALTER TABLE public.compras_cadastros
  ADD COLUMN IF NOT EXISTS tipo_pessoa text
  CHECK (tipo_pessoa IN ('PF','PJ'));

ALTER TABLE public.compras_cadastros
  DROP CONSTRAINT IF EXISTS compras_cadastros_categoria_valor_uf_key;
ALTER TABLE public.compras_cadastros
  DROP CONSTRAINT IF EXISTS compras_cadastros_categoria_valor_uf_tipo_pessoa_key;
ALTER TABLE public.compras_cadastros
  ADD CONSTRAINT compras_cadastros_categoria_valor_uf_tipo_pessoa_key
  UNIQUE (categoria, valor, uf, tipo_pessoa);

INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, ativo, uf, obrigatorio, grupo, tipo_pessoa)
VALUES
  ('documento','dut_atpv_procuracao','DUT ou ATPV ou Procuração',10,true,'GO',true,'documento',NULL),
  ('documento','crlv','CRLV',20,true,'GO',true,'documento',NULL),
  ('documento','foto_manual','Foto Manual',30,true,'GO',false,'documento',NULL),
  ('documento','foto_chave_reserva','Foto Chave reserva',40,true,'GO',false,'documento',NULL),
  ('documento','consultas_detran_prf_dnit_pa2','Consultas DETRAN, PRF, DNIT e PA2',50,true,'GO',true,'documento',NULL),
  ('documento','vistoria_cautelar','Vistoria cautelar',60,true,'GO',true,'documento',NULL),
  ('documento','avaliacao_autoavaliar','Avaliação AUTOAVALIAR',70,true,'GO',false,'documento',NULL),
  ('documento','avaliacao_nbs','Avaliação NBS',80,true,'GO',true,'documento',NULL),
  ('documento','termo_responsabilidade','Termo de responsabilidade',90,true,'GO',true,'documento',NULL),
  ('documento','copia_proposta','Cópia da proposta',100,true,'GO',true,'documento',NULL),
  ('documento','atac','ATAC',110,true,'GO',false,'documento',NULL),
  ('documento','outros','Outros documentos',120,true,'GO',false,'documento',NULL),
  ('documento','contrato_social','Contrato social',200,true,'GO',true,'documento','PJ'),
  ('documento','procuracao_pj','Procuração (se houver)',210,true,'GO',false,'documento','PJ'),
  ('documento','cnh_socio','CNH do sócio que assinou',220,true,'GO',true,'documento','PJ'),
  ('documento','cnd','CND',230,true,'GO',true,'documento','PJ'),
  ('documento','nf_emissor','NF (emissor de nota / IE ativa)',240,true,'GO',true,'documento','PJ'),
  ('documento','dut_atpv','DUT ou ATPV',10,true,'ES',true,'documento',NULL),
  ('documento','crlv','CRLV',20,true,'ES',true,'documento',NULL),
  ('documento','foto_manual','Foto Manual',30,true,'ES',false,'documento',NULL),
  ('documento','foto_chave_reserva','Foto Chave reserva',40,true,'ES',false,'documento',NULL),
  ('documento','consultas_detran_prf_dnit','Consultas DETRAN, PRF e DNIT',50,true,'ES',true,'documento',NULL),
  ('documento','vistoria_cautelar','Vistoria cautelar',60,true,'ES',true,'documento',NULL),
  ('documento','termo_responsabilidade','Termo de responsabilidade',70,true,'ES',true,'documento',NULL),
  ('documento','copia_proposta','Cópia da proposta',80,true,'ES',true,'documento',NULL),
  ('documento','atac','ATAC',90,true,'ES',false,'documento',NULL),
  ('documento','outros','Outros documentos',100,true,'ES',false,'documento',NULL),
  ('documento','contrato_social','Contrato social',200,true,'ES',true,'documento','PJ'),
  ('documento','cnh_socio','CNH do sócio que assinou',210,true,'ES',true,'documento','PJ'),
  ('documento','cnd','CND',220,true,'ES',true,'documento','PJ'),
  ('documento','nf_emissor','NF (emissor de nota / IE ativa)',230,true,'ES',true,'documento','PJ')
ON CONFLICT (categoria, valor, uf, tipo_pessoa) DO NOTHING;
