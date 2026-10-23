CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.modulos @> ARRAY['documentos'::text])
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.empresa_id IS NOT NULL AND _name LIKE (p.empresa_id::text || '/%'))
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name AND (cc.criado_por = auth.uid() OR cc.assumido_por = auth.uid())
    )
    OR (
      _name LIKE 'compras/%'
      AND split_part(_name, '/', 2) ~ '^[0-9a-f-]{36}$'
      AND public.can_access_chamado(split_part(_name, '/', 2)::uuid)
    )
    OR (_name LIKE 'toyota/%' AND auth.uid() IS NOT NULL);
$function$;