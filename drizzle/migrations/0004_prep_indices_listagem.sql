CREATE INDEX IF NOT EXISTS prep_veiculos_ativo_placa_idx ON public.prep_veiculos(ativo, placa);
CREATE INDEX IF NOT EXISTS prep_veiculos_regional_idx ON public.prep_veiculos(regional);
CREATE INDEX IF NOT EXISTS prep_veiculos_dias_idx ON public.prep_veiculos(dias_em_estoque DESC);
CREATE INDEX IF NOT EXISTS prep_base_linhas_placa_alt_idx ON public.prep_base_linhas(placa_alt);
CREATE INDEX IF NOT EXISTS prep_base_linhas_placa_idx ON public.prep_base_linhas(placa);