-- Excluir usuarios com username 'root' e 'loja' de auth.users (cascade para profiles e user_roles)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM profiles WHERE username IN ('root', 'loja')
);

-- Excluir tambem da tabela usuarios_sistema (usada pela view usuarios_sistema_public)
DELETE FROM usuarios_sistema
WHERE username IN ('root', 'loja');
