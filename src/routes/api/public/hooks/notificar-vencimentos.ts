import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/notificar-vencimentos")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const nodemailer = (await import("nodemailer")).default;

          const hoje = new Date().toISOString().slice(0, 10);

          // Busca arquivos vencendo hoje que ainda não foram notificados
          const { data: arquivos, error } = await supabaseAdmin
            .from("documentos_arquivo")
            .select("id, arquivo_nome, data_vencimento, empresa_id, tipo_id")
            .eq("data_vencimento", hoje)
            .is("notificado_em", null);

          if (error) throw error;
          if (!arquivos || arquivos.length === 0) {
            return new Response(JSON.stringify({ ok: true, enviados: 0 }), {
              headers: { "Content-Type": "application/json" },
            });
          }

          // Empresas e tipos referenciados
          const empresaIds = [...new Set(arquivos.map((a) => a.empresa_id))];
          const tipoIds = [...new Set(arquivos.map((a) => a.tipo_id))];

          const [{ data: empresas }, { data: tipos }] = await Promise.all([
            supabaseAdmin.from("empresas").select("id, nome, cnpj, email_notificacao").in("id", empresaIds),
            supabaseAdmin.from("documentos_tipo").select("id, nome").in("id", tipoIds),
          ]);

          const empresaMap = new Map((empresas || []).map((e: any) => [e.id, e]));
          const tipoMap = new Map((tipos || []).map((t: any) => [t.id, t]));

          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false, // STARTTLS na porta 587
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          let enviados = 0;
          const erros: string[] = [];

          for (const arq of arquivos) {
            const empresa: any = empresaMap.get(arq.empresa_id);
            const tipo: any = tipoMap.get(arq.tipo_id);
            const destinatario = empresa?.email_notificacao;
            if (!destinatario) continue;

            const assunto = `[Alerta] Documento vence hoje — ${tipo?.nome || "Documento"}`;
            const html = `
              <p>Olá,</p>
              <p>Este é um alerta automático informando que o documento abaixo <strong>vence hoje (${hoje})</strong>:</p>
              <ul>
                <li><strong>Empresa:</strong> ${empresa?.nome || "-"} (${empresa?.cnpj || "-"})</li>
                <li><strong>Tipo:</strong> ${tipo?.nome || "-"}</li>
                <li><strong>Arquivo:</strong> ${arq.arquivo_nome}</li>
                <li><strong>Vencimento:</strong> ${arq.data_vencimento}</li>
              </ul>
              <p>Providencie a renovação/atualização o quanto antes.</p>
            `;

            try {
              await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: destinatario,
                subject: assunto,
                html,
              });
              await supabaseAdmin
                .from("documentos_arquivo")
                .update({ notificado_em: new Date().toISOString() })
                .eq("id", arq.id);
              enviados++;
            } catch (e: any) {
              erros.push(`${arq.id}: ${e.message}`);
            }
          }

          return new Response(
            JSON.stringify({ ok: true, enviados, total: arquivos.length, erros }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
