import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint de cron para verificar e enviar notificações de chamados.
 *
 * Protegido por CRON_SECRET (variável de ambiente).
 * Chame via POST com header Authorization: Bearer <CRON_SECRET>.
 *
 * Exemplo:
 *   curl -X POST https://moduloabsn.com/api/public/cron/verificar-notificacoes \
 *     -H "Authorization: Bearer SEU_SECRET_AQUI"
 */
export const Route = createFileRoute("/api/public/cron/verificar-notificacoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const inicio = Date.now();
        const iniciadoEm = new Date().toISOString();

        try {
          const { verificarNotificacoes } = await import("@/lib/notificacoes.functions");
          const resultado = await verificarNotificacoes();

          const finalizadoEm = new Date().toISOString();
          const duracaoMs = Date.now() - inicio;

          // Log no banco
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("cron_log").insert({
            job_name: "verificar_notificacoes",
            status: "ok",
            detalhes: resultado,
            iniciado_em: iniciadoEm,
            finalizado_em: finalizadoEm,
          });

          console.log(
            `[cron] verificar_notificacoes ok — ${duracaoMs}ms, ` +
              `processados=${(resultado as any).processados ?? 0}, ` +
              `enviados=${(resultado as any).enviados ?? 0}`,
          );

          return new Response(JSON.stringify({ ok: true, ...resultado, duracaoMs }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          const finalizadoEm = new Date().toISOString();

          // Log erro no banco
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("cron_log").insert({
              job_name: "verificar_notificacoes",
              status: "erro",
              detalhes: { error: err.message || String(err) },
              iniciado_em: iniciadoEm,
              finalizado_em: finalizadoEm,
            });
          } catch {
            // Se falhar o log, não quebra
          }

          console.error("[cron] verificar_notificacoes erro:", err.message || err);

          return new Response(JSON.stringify({ ok: false, error: err.message || String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
