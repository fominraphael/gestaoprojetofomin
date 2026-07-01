GRANT SELECT ON public.tipos_usuario_config TO anon;

CREATE POLICY "tipocfg_read_anon_active_nonadmin"
ON public.tipos_usuario_config
FOR SELECT
TO anon
USING (ativo = true AND role <> 'admin');