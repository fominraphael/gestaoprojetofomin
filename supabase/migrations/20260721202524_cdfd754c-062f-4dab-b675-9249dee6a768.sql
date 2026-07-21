-- Inserindo novos tipos de usuário (perfis do sistema GAS)
INSERT INTO public.tipos_usuario_config (nome, role, campos_schema, ativo)
VALUES 
  ('Gestora de Seminovos', 'user', '[]'::jsonb, true),
  ('Mecânico Toyota', 'user', '[]'::jsonb, true),
  ('Vendedor de Seminovos', 'user', '[]'::jsonb, true)
ON CONFLICT (nome) DO NOTHING;
