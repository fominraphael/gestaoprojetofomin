import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface NotificarInput {
  chamadoId: string;
  tipo: "pendenciado" | "resolvido" | "nf_pendente";
  motivo?: string;
  observacao?: string;
}

/**
 * Notifica por e-mail o criador do chamado (pendência) ou a Central (NF/resolução).
 */
export const notificarChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: NotificarInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: chamado } = await supabase
      .from("compras_chamados")
      .select("id, placa, nome, criado_por, status")
      .eq("id", data.chamadoId)
      .maybeSingle();
    if (!chamado) return { ok: false, reason: "chamado não encontrado" };

    // Descobre e-mail do criador via admin API (server-only)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let destinatario: string | null = null;
    if (data.tipo === "pendenciado" || data.tipo === "resolvido") {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(chamado.criado_por);
      destinatario = u?.user?.email ?? null;
    }
    if (!destinatario) return { ok: false, reason: "sem destinatário" };

    const { sendMail } = await import("@/lib/smtp.server");
    const assunto =
      data.tipo === "pendenciado"
        ? `Chamado pendenciado — Placa ${chamado.placa}`
        : `Chamado atualizado — Placa ${chamado.placa}`;
    const html = `
      <p>Olá,</p>
      <p>Seu chamado de compra (placa <strong>${chamado.placa}</strong>, cliente ${chamado.nome}) foi
      <strong>${data.tipo === "pendenciado" ? "pendenciado" : "atualizado"}</strong>.</p>
      ${data.motivo ? `<p><strong>Motivo:</strong> ${data.motivo}</p>` : ""}
      ${data.observacao ? `<p><strong>Observação:</strong> ${data.observacao}</p>` : ""}
      <p>Acesse o sistema para tratar.</p>
    `;
    try {
      await sendMail({ to: destinatario, subject: assunto, html });
      return { ok: true };
    } catch (err) {
      console.error("[compras] falha ao enviar email:", err);
      return { ok: false, reason: String(err) };
    }
  });

/**
 * Gera signed URL para visualização ou download de documento de compras.
 * Usa supabaseAdmin (bypass RLS) para garantir que qualquer usuário autenticado
 * com acesso ao módulo compras possa visualizar/baixar anexos.
 * A verificação de permissão de edição é feita no frontend.
 */
export const getComprasDocSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storagePath: string; download?: boolean }) => {
    if (!input?.storagePath) throw new Error("storagePath é obrigatório.");
    if (!input.storagePath.startsWith("compras/"))
      throw new Error("Path inválido: deve iniciar com compras/");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const expiresIn = 300; // 5 minutos
    const opts = data.download ? { download: true } : undefined;

    const { data: result, error } = await supabaseAdmin.storage
      .from("documentos")
      .createSignedUrl(data.storagePath, expiresIn, opts);

    if (error) {
      throw new Error(`Erro ao gerar link: ${error.message}`);
    }

    return { signedUrl: result.signedUrl };
  });
