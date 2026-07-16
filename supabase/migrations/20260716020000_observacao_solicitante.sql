-- Campo para observação do solicitante na criação do chamado (separado da observação de compra)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compras_chamados' AND column_name = 'observacao_solicitante'
  ) THEN
    ALTER TABLE compras_chamados ADD COLUMN observacao_solicitante text;
  END IF;
END
$$;
