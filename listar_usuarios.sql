-- Listar TODOS os usuarios para encontrar os IDs corretos
SELECT id, username, tipo_usuario, modulos, status, ativo
FROM profiles
ORDER BY created_at DESC;
