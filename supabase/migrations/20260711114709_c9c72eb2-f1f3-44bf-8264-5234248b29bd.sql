
-- Add UF binding and new category "campo_formulario" for per-state custom fields
ALTER TABLE public.compras_cadastros
  ADD COLUMN IF NOT EXISTS uf TEXT NULL,
  ADD COLUMN IF NOT EXISTS tipo_campo TEXT NULL,
  ADD COLUMN IF NOT EXISTS obrigatorio BOOLEAN NOT NULL DEFAULT false;

-- Recreate the CHECK on categoria to include the new one
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.compras_cadastros'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%categoria%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.compras_cadastros DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.compras_cadastros
  ADD CONSTRAINT compras_cadastros_categoria_check
  CHECK (categoria IN (
    'loja_estoque','tipo_compra','motivo_pendencia',
    'motivo_cancelamento','tipo_debito','estado_uf','campo_formulario'
  ));

-- Store custom field values per chamado
ALTER TABLE public.compras_chamados
  ADD COLUMN IF NOT EXISTS campos_extras JSONB NOT NULL DEFAULT '{}'::jsonb;
