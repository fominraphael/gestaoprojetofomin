-- DIAGNÓSTICO: Ver os dois perfis completos
SELECT id, username, tipo_usuario, modulos, status, ativo
FROM profiles
WHERE id IN ('5d0e73ff-d0c6-4dc8-b8d3-39b91ffc95a7', '8715d7d9-349d-4feb-99cb-512fa9a005d1');
