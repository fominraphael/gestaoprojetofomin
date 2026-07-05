
-- 1) Tabela de vínculos usuário ↔ filial
CREATE TABLE IF NOT EXISTS public.toyota_usuario_filial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES public.toyota_filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, filial_id)
);

CREATE INDEX IF NOT EXISTS toyota_usuario_filial_user_idx ON public.toyota_usuario_filial(user_id);
CREATE INDEX IF NOT EXISTS toyota_usuario_filial_filial_idx ON public.toyota_usuario_filial(filial_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.toyota_usuario_filial TO authenticated;
GRANT ALL ON public.toyota_usuario_filial TO service_role;

ALTER TABLE public.toyota_usuario_filial ENABLE ROW LEVEL SECURITY;

-- Cada usuário lê seus próprios vínculos; admin lê todos
CREATE POLICY "Usuario_filial select own or admin"
  ON public.toyota_usuario_filial FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario_filial admin insert"
  ON public.toyota_usuario_filial FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario_filial admin update"
  ON public.toyota_usuario_filial FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario_filial admin delete"
  ON public.toyota_usuario_filial FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Função security definer para checagem sem recursão
CREATE OR REPLACE FUNCTION public.has_filial(_user_id UUID, _filial_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (
        SELECT 1 FROM public.toyota_usuario_filial
         WHERE user_id = _user_id AND filial_id = _filial_id
      );
$$;

-- 3) Atualiza policies do estoque para usar filial_destino_id via vínculo M2M
DROP POLICY IF EXISTS "Estoque select by filial link" ON public.toyota_estoque_veiculos;
DROP POLICY IF EXISTS "Estoque update by filial link" ON public.toyota_estoque_veiculos;
DROP POLICY IF EXISTS "Estoque insert by filial link" ON public.toyota_estoque_veiculos;

CREATE POLICY "Estoque select por vinculo de filial"
  ON public.toyota_estoque_veiculos FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (filial_destino_id IS NOT NULL AND public.has_filial(auth.uid(), filial_destino_id))
  );

CREATE POLICY "Estoque update por vinculo de filial"
  ON public.toyota_estoque_veiculos FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (filial_destino_id IS NOT NULL AND public.has_filial(auth.uid(), filial_destino_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (filial_destino_id IS NOT NULL AND public.has_filial(auth.uid(), filial_destino_id))
  );

CREATE POLICY "Estoque insert por vinculo de filial"
  ON public.toyota_estoque_veiculos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (filial_destino_id IS NOT NULL AND public.has_filial(auth.uid(), filial_destino_id))
  );
