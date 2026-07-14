CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SHA-256 hash of "root"
INSERT INTO public.usuarios_sistema (username, password_hash, role, status)
VALUES ('root', '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2', 'admin', 'approved')
ON CONFLICT (username) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_sistema TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_sistema TO authenticated;
GRANT ALL ON public.usuarios_sistema TO service_role;

ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público de leitura" ON public.usuarios_sistema FOR SELECT USING (true);
CREATE POLICY "Acesso público de inserção" ON public.usuarios_sistema FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso público de atualização" ON public.usuarios_sistema FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público de exclusão" ON public.usuarios_sistema FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_usuarios_sistema_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE TRIGGER update_usuarios_sistema_updated_at
BEFORE UPDATE ON public.usuarios_sistema
FOR EACH ROW EXECUTE FUNCTION public.update_usuarios_sistema_updated_at();
