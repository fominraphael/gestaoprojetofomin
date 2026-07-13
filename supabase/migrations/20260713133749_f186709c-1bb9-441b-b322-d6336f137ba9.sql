
ALTER TABLE public.compras_cadastros ADD COLUMN IF NOT EXISTS grupo TEXT;

-- Seed base fields as reference registrations (grouped)
INSERT INTO public.compras_cadastros (categoria, valor, label, uf, tipo_campo, obrigatorio, ordem, grupo, ativo)
VALUES
  ('campo_formulario','nome','Nome / Razão social',NULL,'texto',true,1,'cliente',false),
  ('campo_formulario','cpf_cnpj','CPF / CNPJ',NULL,'texto',true,2,'cliente',false),
  ('campo_formulario','placa','Placa',NULL,'texto',true,1,'veiculo',false),
  ('campo_formulario','chassi','Chassi',NULL,'texto',true,2,'veiculo',false),
  ('campo_formulario','renavam','Renavam',NULL,'texto',true,3,'veiculo',false),
  ('campo_formulario','modelo','Modelo',NULL,'texto',true,4,'veiculo',false),
  ('campo_formulario','ano_modelo','Ano/Modelo',NULL,'texto',true,5,'veiculo',false),
  ('campo_formulario','cor_externa','Cor externa',NULL,'texto',true,6,'veiculo',false),
  ('campo_formulario','codigo_avaliacao_nbs','Código avaliação NBS',NULL,'texto',true,7,'veiculo',false),
  ('campo_formulario','valor_avaliado','Valor avaliado (R$)',NULL,'numero',true,8,'veiculo',false)
ON CONFLICT DO NOTHING;
