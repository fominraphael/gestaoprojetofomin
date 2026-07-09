CREATE OR REPLACE FUNCTION public.get_username_by_recovery_email(_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.profiles
  WHERE lower(email_recuperacao) = lower(_email)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_username_by_recovery_email(TEXT) TO anon, authenticated;