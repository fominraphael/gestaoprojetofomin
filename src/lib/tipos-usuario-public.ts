import { createServerFn } from "@tanstack/react-start";

/**
 * Server function pública (sem auth) que retorna os tipos de usuário ativos.
 * Usa service_role para bypassar RLS — necessário para a tela de registro
 * onde o usuário ainda não está autenticado.
 */
export const obterTiposParaRegistro = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("tipos_usuario_config")
      .select("id, nome, role, campos_schema, ativo, created_at")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw error;

    return ((data as any[]) || [])
      .filter((t: any) => t.nome !== "Administrador" && t.role !== "admin")
      .map((t: any) => ({
        id: t.id,
        nome: t.nome,
        role: t.role,
        campos_schema: t.campos_schema || [],
        ativo: t.ativo,
        created_at: t.created_at,
      }));
  },
);
