ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_fantasia text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_username text := COALESCE(meta->>'username', split_part(NEW.email,'@',1));
  v_role app_role := COALESCE((meta->>'role')::app_role, 'user'::app_role);
BEGIN
  INSERT INTO public.profiles (
    id, username, tipo_usuario, modulos, empresa_id, cnpj,
    pode_criar_admin, campos_customizados, ativo, status, email_recuperacao, nome_fantasia
  ) VALUES (
    NEW.id,
    v_username,
    COALESCE(meta->>'tipo_usuario', 'Lojista'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(meta->'modulos')), ARRAY[]::text[]),
    NULLIF(meta->>'empresa_id','')::uuid,
    meta->>'cnpj',
    COALESCE((meta->>'pode_criar_admin')::boolean, false),
    COALESCE(meta->'campos_customizados', '{}'::jsonb),
    COALESCE((meta->>'ativo')::boolean, true),
    COALESCE(meta->>'status', 'pending'),
    NULLIF(meta->>'email_recuperacao',''),
    NULLIF(meta->>'nome_fantasia','')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;