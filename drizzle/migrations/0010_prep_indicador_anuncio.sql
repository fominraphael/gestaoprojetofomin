ALTER TABLE public.prep_config_indicadores DROP CONSTRAINT IF EXISTS prep_config_indicadores_indicador_check;
ALTER TABLE public.prep_config_indicadores ADD CONSTRAINT prep_config_indicadores_indicador_check CHECK (indicador IN ('os','foto','tcuv','auditoria','anuncio'));
INSERT INTO public.prep_config_indicadores (indicador, habilitado) VALUES ('anuncio', true) ON CONFLICT (indicador) DO NOTHING;
ALTER TABLE public.prep_veiculos ADD COLUMN IF NOT EXISTS anunciado boolean;