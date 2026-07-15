-- Liberar leitura de arquivos de compras para todos os usuários autenticados
-- (já que compras_chamados_select_auth permite SELECT para todos)

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
      AND auth.uid() IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      WHERE cd.storage_path = _name
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

REVOKE EXECUTE ON FUNCTION public.can_access_documentos_object(text) FROM PUBLIC, anon;
