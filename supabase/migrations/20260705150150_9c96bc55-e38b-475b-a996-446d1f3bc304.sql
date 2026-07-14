
-- Garantir fominraphael como admin (idempotente)
INSERT INTO public.user_roles (user_id, role)
SELECT '0a3c7691-c558-4aae-88d8-2b7a5b4273c8'::uuid, 'admin'::app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- Excluir usuário root em cascata (auth.users -> profiles/user_roles via FK ON DELETE CASCADE)
DELETE FROM public.user_roles WHERE user_id = 'b1c35cfd-f22e-475b-bddd-e68130ce592b';
DELETE FROM public.profiles WHERE id = 'b1c35cfd-f22e-475b-bddd-e68130ce592b';
DELETE FROM auth.users WHERE id = 'b1c35cfd-f22e-475b-bddd-e68130ce592b';
