-- 1) Corrige o label/valor "goiais" para "Goiás" na tabela compras_cadastros (loja_estoque)
UPDATE public.compras_cadastros
SET valor = 'Goiás', label = 'Goiás', updated_at = now()
WHERE categoria = 'loja_estoque'
  AND (valor ILIKE '%goiais%' OR label ILIKE '%goiais%');

-- 2) Atualiza loja_estoque de todos os chamados para "Goiás"
UPDATE public.compras_chamados
SET loja_estoque = 'Goiás', updated_at = now();
