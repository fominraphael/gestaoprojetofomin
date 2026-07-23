-- Remove hífen das placas já salvas na tabela compras_chamados
UPDATE compras_chamados
SET placa = replace(placa, '-', '')
WHERE placa LIKE '%-%';

-- Verificar resultado
SELECT id, placa
FROM compras_chamados
WHERE placa IS NOT NULL
ORDER BY created_at DESC;
