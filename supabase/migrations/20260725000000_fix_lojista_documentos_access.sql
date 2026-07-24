-- Fix: Allow Lojista users to view and download documents from ALL companies
-- Lojistas need full read access to documents across all empresas

-- 0. Restore empresas read policy (dropped by 20260724153323)
DROP POLICY IF EXISTS empresas_read_auth ON public.empresas;
CREATE POLICY empresas_read_auth ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- 1. Update documentos_arquivo RLS policy to allow Lojistas
DROP POLICY IF EXISTS docarq_select_scoped ON public.documentos_arquivo;

CREATE POLICY docarq_select_scoped ON public.documentos_arquivo
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        -- Admin sees all
        public.has_role(auth.uid(), 'admin'::app_role)
        -- User sees own empresa documents
        OR p.empresa_id = documentos_arquivo.empresa_id
        -- Lojista sees ALL empresa documents
        OR p.tipo_usuario = 'Lojista'
      )
  )
);

-- 2. Update can_access_documentos_object to allow Lojistas access to all storage
CREATE OR REPLACE FUNCTION public.can_access_documentos_object(_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    -- Lojistas can access all documentos storage
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tipo_usuario = 'Lojista'
    )
    -- Empresa docs: path starts with '<empresa_id>/...'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id IS NOT NULL
        AND _name LIKE (p.empresa_id::text || '/%')
    )
    -- Compras docs: registered in compras_documentos and user can access the chamado
    OR EXISTS (
      SELECT 1 FROM public.compras_documentos cd
      JOIN public.compras_chamados cc ON cc.id = cd.chamado_id
      WHERE cd.storage_path = _name
        AND (
          cc.criado_por = auth.uid()
          OR cc.assumido_por = auth.uid()
        )
    )
    -- Toyota pipeline: authenticated users participating in Toyota module
    OR (_name LIKE 'toyota/%' AND auth.uid() IS NOT NULL);
$$;
