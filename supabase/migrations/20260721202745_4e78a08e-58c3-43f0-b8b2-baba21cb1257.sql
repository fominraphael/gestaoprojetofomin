-- Adicionando a nova permissão ao módulo no código não requer migração SQL pois é controlado por src/lib/modules.ts
-- Mas vamos garantir que o tipo de usuário ADM de loja/ASSESSOR seja reconhecido corretamente se necessário.
SELECT 1;