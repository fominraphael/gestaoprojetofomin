
-- Fix categoria check + add flags + drop debitos check + seed
ALTER TABLE public.compras_cadastros DROP CONSTRAINT IF EXISTS compras_cadastros_categoria_check;
ALTER TABLE public.compras_cadastros ADD CONSTRAINT compras_cadastros_categoria_check
  CHECK (categoria IN ('loja_estoque','tipo_compra','motivo_pendencia','motivo_cancelamento','tipo_debito','estado_uf','campo_formulario','documento','status_debito'));

ALTER TABLE public.compras_cadastros
  ADD COLUMN IF NOT EXISTS exige_anexo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_descricao boolean NOT NULL DEFAULT false;

ALTER TABLE public.compras_debitos DROP CONSTRAINT IF EXISTS compras_debitos_status_check;
ALTER TABLE public.compras_debitos DROP CONSTRAINT IF EXISTS compras_debitos_tipo_check;

INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, uf, tipo_pessoa, grupo, exige_anexo, exige_descricao)
SELECT 'status_debito', 'pago', 'Pago / OK', 0, NULL, NULL, NULL, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.compras_cadastros WHERE categoria='status_debito' AND valor='pago' AND grupo IS NULL);

INSERT INTO public.compras_cadastros (categoria, valor, label, ordem, uf, tipo_pessoa, grupo, exige_anexo, exige_descricao)
SELECT 'status_debito', 'pendente', 'Pendente', 1, NULL, NULL, NULL, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.compras_cadastros WHERE categoria='status_debito' AND valor='pendente' AND grupo IS NULL);
