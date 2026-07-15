-- Adicionar campo "Tem inscrição estadual?" para PJ
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS tem_inscricao_estadual boolean DEFAULT NULL;

COMMENT ON COLUMN public.compras_chamados.tem_inscricao_estadual
  IS 'Apenas para PJ: true = tem IE (fluxo normal), false = não tem IE (nf_emissor não obrigatório)';
