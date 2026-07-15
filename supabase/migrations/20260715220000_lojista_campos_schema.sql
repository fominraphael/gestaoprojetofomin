-- Adicionar CNPJ, Razão Social e Celular ao campos_schema do tipo Lojista
-- para que o admin consiga visualizar/gerenciar esses campos

UPDATE public.tipos_usuario_config
SET campos_schema = '[
  {"nome": "cnpj", "label": "CNPJ", "tipo": "text", "obrigatorio": true},
  {"nome": "razao_social", "label": "Razão Social", "tipo": "text", "obrigatorio": true},
  {"nome": "celular", "label": "Celular", "tipo": "text", "obrigatorio": true}
]'::jsonb
WHERE nome = 'Lojista';
