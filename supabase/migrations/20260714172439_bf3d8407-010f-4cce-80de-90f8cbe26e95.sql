
-- 1) Revoke public/anon EXECUTE on SECURITY DEFINER helpers; keep authenticated only where needed by RLS.
REVOKE EXECUTE ON FUNCTION public.can_access_chamado(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_documentos_object(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_filial(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purge_old_trash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Tighten toyota/ storage access to users with a toyota filial/patio association or admins.
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    OR (
      _name LIKE 'compras/%/%'
      AND EXISTS (
        SELECT 1 FROM public.compras_chamados cc
        WHERE cc.id::text = split_part(_name, '/', 2)
          AND (
            cc.criado_por = auth.uid()
            OR cc.assumido_por = auth.uid()
            OR public.has_role(auth.uid(), 'admin'::app_role)
          )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name
        AND (
          cc.criado_por = auth.uid()
          OR cc.assumido_por = auth.uid()
        )
    )
    OR (
      _name LIKE 'toyota/%'
      AND auth.uid() IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.toyota_usuario_filial WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.toyota_usuario_patio WHERE user_id = auth.uid())
      )
    );
$function$;

-- Re-revoke on the replaced function
REVOKE EXECUTE ON FUNCTION public.can_access_documentos_object(text) FROM PUBLIC, anon;

-- 3) Prevent privilege escalation via profiles self-update.
DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;

-- Self update: cannot change sensitive fields
CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND tipo_usuario   IS NOT DISTINCT FROM (SELECT tipo_usuario   FROM public.profiles WHERE id = auth.uid())
  AND modulos        IS NOT DISTINCT FROM (SELECT modulos        FROM public.profiles WHERE id = auth.uid())
  AND pode_criar_admin IS NOT DISTINCT FROM (SELECT pode_criar_admin FROM public.profiles WHERE id = auth.uid())
  AND empresa_id     IS NOT DISTINCT FROM (SELECT empresa_id     FROM public.profiles WHERE id = auth.uid())
  AND status         IS NOT DISTINCT FROM (SELECT status         FROM public.profiles WHERE id = auth.uid())
  AND ativo          IS NOT DISTINCT FROM (SELECT ativo          FROM public.profiles WHERE id = auth.uid())
);

-- Admin insert: only admins may insert profile rows via client; self-insert on signup happens via SECURITY DEFINER trigger.
CREATE POLICY profiles_admin_insert ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
