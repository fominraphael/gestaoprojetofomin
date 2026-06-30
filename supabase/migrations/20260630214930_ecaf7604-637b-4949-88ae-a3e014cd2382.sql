
-- Revogar EXECUTE público nas funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.purge_old_trash() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- has_role precisa ser chamável por authenticated (RLS depende)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
