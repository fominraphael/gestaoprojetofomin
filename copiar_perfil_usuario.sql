-- PASSO 1: Verificar o tipo_usuario de AMBOS os usuarios
SELECT id, username, tipo_usuario, modulos
FROM profiles
WHERE id IN ('5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7', '8715d7d9-349d-4feb-99cb-512fa9a005d1');

-- PASSO 2: Copiar tipo_usuario E modulos do origem para o destino
UPDATE profiles
SET
  tipo_usuario = src.tipo_usuario,
  modulos = src.modulos
FROM profiles src
WHERE src.id = '5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7'
  AND profiles.id = '8715d7d9-349d-4feb-99cb-512fa9a005d1';

-- PASSO 3: Confirmar resultado
SELECT id, username, tipo_usuario, modulos
FROM profiles
WHERE id = '8715d7d9-349d-4feb-99cb-512fa9a005d1';
