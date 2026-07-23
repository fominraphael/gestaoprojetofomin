-- Copia o perfil do usuario 5d0e73ff... para o usuario 8715d7d9...
-- Rode este script no SQL Editor do Supabase Dashboard

-- 1. Copia tipo_usuario e modulos do usuario origem para o destino
UPDATE profiles
SET
  tipo_usuario = (SELECT tipo_usuario FROM profiles WHERE id = '5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7'),
  modulos = (SELECT modulos FROM profiles WHERE id = '5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7')
WHERE id = '8715d7d9-349d-4feb-99cb-512fa9a005d1';

-- 2. Verifica o resultado
SELECT id, username, tipo_usuario, modulos
FROM profiles
WHERE id IN ('5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7', '8715d7d9-349d-4feb-99cb-512fa9a005d1');
