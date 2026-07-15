// Server-side: Verificação periódica de notificações de chamados
// Chamado por cron (pg_cron) ou manualmente via API
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

interface NotificacaoPendente {
  chamado_id: string;
  placa: string;
  nome_cliente: string;
  status: string;
  destinatario_id: string;
  destinatario_email: string;
  destinatario_nome: string;
  tipo_destinatario: "solicitante" | "responsavel" | "central";
  horas_parado: number;
}

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function minutosDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60);
}

function jaNotificou(notifMap: Record<string, string>, status: string, minIntervaloHoras: number): boolean {
  const ultima = notifMap[status];
  if (!ultima) return false;
  return minutosDesde(ultima) < minIntervaloHoras * 60;
}

function registrarNotificacao(notifMap: Record<string, string>, status: string): Record<string, string> {
  return { ...notifMap, [status]: new Date().toISOString() };
}

export const verificarNotificacoes = createServerFn({ method: "POST" })
  .handler(async () => {
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os chamados não finalizados
    const { data: chamados } = await admin
      .from("compras_chamados")
      .select("id, placa, nome, status, criado_por, assumido_por, status_entrou_em, notificacao_ultima_envio")
      .not("status", "in", "(comprado,cancelado)");

    if (!chamados?.length) return { processados: 0, enviados: 0 };

    // Buscar profiles (email, nome, central_compras)
    const userIds = Array.from(new Set(
      chamados.flatMap((c) => [c.criado_por, c.assumido_por].filter(Boolean)),
    )) as string[];

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, nome_fantasia, email, central_compras")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Usuários com central_compras
    const centralUsers = (profiles ?? []).filter((p: any) => p.central_compras);

    const pendentes: NotificacaoPendente[] = [];

    for (const c of chamados) {
      const notifMap = (c.notificacao_ultima_envio ?? {}) as Record<string, string>;
      const horas = c.status_entrou_em ? horasDesde(c.status_entrou_em) : 999;

      switch (c.status) {
        case "documentacao": {
          // Após 1h parado → solicitante; repetir a cada 24h
          if (horas >= 1 && !jaNotificou(notifMap, "documentacao", 24)) {
            const profile = profileMap.get(c.criado_por);
            if (profile?.email) {
              pendentes.push({
                chamado_id: c.id, placa: c.placa, nome_cliente: c.nome,
                status: c.status, destinatario_id: c.criado_por,
                destinatario_email: profile.email,
                destinatario_nome: profile.nome_fantasia || profile.username,
                tipo_destinatario: "solicitante", horas_parado: horas,
              });
            }
          }
          break;
        }
        case "na_fila_central": {
          // Imediato + repetir a cada 10min → central_compras
          if (!jaNotificou(notifMap, "na_fila_central", 10 / 60)) {
            for (const u of centralUsers) {
              if (u.email) {
                pendentes.push({
                  chamado_id: c.id, placa: c.placa, nome_cliente: c.nome,
                  status: c.status, destinatario_id: u.id,
                  destinatario_email: u.email,
                  destinatario_nome: u.nome_fantasia || u.username,
                  tipo_destinatario: "central", horas_parado: horas,
                });
              }
            }
          }
          break;
        }
        case "em_analise": {
          // Após 1h parado → responsável; repetir a cada 1h
          if (horas >= 1 && c.assumido_por && !jaNotificou(notifMap, "em_analise", 1)) {
            const profile = profileMap.get(c.assumido_por);
            if (profile?.email) {
              pendentes.push({
                chamado_id: c.id, placa: c.placa, nome_cliente: c.nome,
                status: c.status, destinatario_id: c.assumido_por,
                destinatario_email: profile.email,
                destinatario_nome: profile.nome_fantasia || profile.username,
                tipo_destinatario: "responsavel", horas_parado: horas,
              });
            }
          }
          break;
        }
        case "pendenciado": {
          // Imediato + repetir a cada 24h → solicitante
          if (!jaNotificou(notifMap, "pendenciado", 24)) {
            const profile = profileMap.get(c.criado_por);
            if (profile?.email) {
              pendentes.push({
                chamado_id: c.id, placa: c.placa, nome_cliente: c.nome,
                status: c.status, destinatario_id: c.criado_por,
                destinatario_email: profile.email,
                destinatario_nome: profile.nome_fantasia || profile.username,
                tipo_destinatario: "solicitante", horas_parado: horas,
              });
            }
          }
          break;
        }
        case "suspenso": {
          // Após 1h parado → responsável; repetir a cada 1h
          if (horas >= 1 && c.assumido_por && !jaNotificou(notifMap, "suspenso", 1)) {
            const profile = profileMap.get(c.assumido_por);
            if (profile?.email) {
              pendentes.push({
                chamado_id: c.id, placa: c.placa, nome_cliente: c.nome,
                status: c.status, destinatario_id: c.assumido_por,
                destinatario_email: profile.email,
                destinatario_nome: profile.nome_fantasia || profile.username,
                tipo_destinatario: "responsavel", horas_parado: horas,
              });
            }
          }
          break;
        }
      }
    }

    if (!pendentes.length) return { processados: chamados.length, enviados: 0 };

    // Enviar e-mails e registrar notificações
    const { sendMail } = await import("@/lib/smtp.server");
    let enviados = 0;

    for (const n of pendentes) {
      const STATUS_LABELS: Record<string, string> = {
        documentacao: "Em Documentação",
        na_fila_central: "Na Fila (Central)",
        em_analise: "Em Análise (Central)",
        pendenciado: "Pendenciado",
        suspenso: "Suspenso",
        comprado: "Comprado",
        cancelado: "Cancelado",
      };

      const assunto = `[${STATUS_LABELS[n.status] ?? n.status}] Chamado ${n.placa} — ${n.nome_cliente}`;
      const html = `
        <p>Olá <strong>${n.destinatario_nome}</strong>,</p>
        <p>O chamado de compra <strong>${n.placa}</strong> (${n.nome_cliente}) está com status <strong>${STATUS_LABELS[n.status] ?? n.status}</strong> há ${Math.floor(n.horas_parado)}h.</p>
        <p><a href="${process.env.VITE_SUPABASE_URL?.replace(".supabase.co", ".lovable.app")}/compras/${n.chamado_id}">Abrir chamado</a></p>
        <p style="color:#999;font-size:11px">Notificação automática do sistema.</p>
      `;

      try {
        await sendMail({ to: n.destinatario_email, subject: assunto, html });

        await admin.from("compras_notificacoes").insert({
          chamado_id: n.chamado_id,
          destinatario_id: n.destinatario_id,
          tipo: "email",
          status_notif: "enviado",
          titulo: assunto,
          mensagem: html,
          link: `/compras/${n.chamado_id}`,
          enviado_em: new Date().toISOString(),
        });

        // Atualizar ultima notificacao
        const { data: atual } = await admin
          .from("compras_chamados")
          .select("notificacao_ultima_envio")
          .eq("id", n.chamado_id)
          .single();

        const map = (atual?.notificacao_ultima_envio ?? {}) as Record<string, string>;
        await admin
          .from("compras_chamados")
          .update({ notificacao_ultima_envio: registrarNotificacao(map, n.status) })
          .eq("id", n.chamado_id);

        enviados++;
      } catch (err) {
        console.error(`[notif] falha email ${n.chamado_id}:`, err);
        await admin.from("compras_notificacoes").insert({
          chamado_id: n.chamado_id,
          destinatario_id: n.destinatario_id,
          tipo: "email",
          status_notif: "erro",
          titulo: assunto,
          mensagem: String(err),
          link: `/compras/${n.chamado_id}`,
        });
      }
    }

    return { processados: chamados.length, enviados };
  });

// Força notificação manual (botão no chamado)
export const forcarNotificacao = createServerFn({ method: "POST" })
  .inputValidator((d: { chamadoId: string }) => d)
  .handler(async ({ data }) => {
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: chamado } = await admin
      .from("compras_chamados")
      .select("id, placa, nome, status, criado_por, assumido_por")
      .eq("id", data.chamadoId)
      .single();

    if (!chamado) return { ok: false, reason: "chamado não encontrado" };

    // Determinar destinatários conforme status
    const userIds = [chamado.criado_por, chamado.assumido_por].filter(Boolean) as string[];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, nome_fantasia, email, central_compras")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    let destinatarios: { id: string; email: string; nome: string }[] = [];

    if (chamado.status === "na_fila_central") {
      // Central de compras
      const { data: centralProfiles } = await admin
        .from("profiles")
        .select("id, username, nome_fantasia, email")
        .eq("central_compras", true);
      destinatarios = (centralProfiles ?? [])
        .filter((p: any) => p.email)
        .map((p: any) => ({ id: p.id, email: p.email, nome: p.nome_fantasia || p.username }));
    } else if (chamado.status === "em_analise" || chamado.status === "suspenso") {
      // Responsável
      if (chamado.assumido_por) {
        const p = profileMap.get(chamado.assumido_por);
        if (p?.email) destinatarios = [{ id: p.id, email: p.email, nome: p.nome_fantasia || p.username }];
      }
    } else {
      // Solicitante (documentacao, pendenciado, comprado, cancelado)
      if (chamado.criado_por) {
        const p = profileMap.get(chamado.criado_por);
        if (p?.email) destinatarios = [{ id: p.id, email: p.email, nome: p.nome_fantasia || p.username }];
      }
    }

    if (!destinatarios.length) return { ok: false, reason: "sem destinatários" };

    const STATUS_LABELS: Record<string, string> = {
      documentacao: "Em Documentação",
      na_fila_central: "Na Fila (Central)",
      em_analise: "Em Análise (Central)",
      pendenciado: "Pendenciado",
      suspenso: "Suspenso",
      comprado: "Comprado",
      cancelado: "Cancelado",
    };

    const { sendMail } = await import("@/lib/smtp.server");
    let enviados = 0;

    for (const dest of destinatarios) {
      const assunto = `[FORÇADO] [${STATUS_LABELS[chamado.status] ?? chamado.status}] Chamado ${chamado.placa} — ${chamado.nome}`;
      const html = `
        <p>Olá <strong>${dest.nome}</strong>,</p>
        <p>Uma notificação foi disparada manualmente para o chamado <strong>${chamado.placa}</strong> (${chamado.nome}).</p>
        <p>Status atual: <strong>${STATUS_LABELS[chamado.status] ?? chamado.status}</strong></p>
        <p><a href="${process.env.VITE_SUPABASE_URL?.replace(".supabase.co", ".lovable.app")}/compras/${chamado.id}">Abrir chamado</a></p>
        <p style="color:#999;font-size:11px">Notificação disparada manualmente.</p>
      `;

      try {
        await sendMail({ to: dest.email, subject: assunto, html });
        await admin.from("compras_notificacoes").insert({
          chamado_id: chamado.id,
          destinatario_id: dest.id,
          tipo: "email",
          status_notif: "enviado",
          titulo: assunto,
          mensagem: html,
          link: `/compras/${chamado.id}`,
          enviado_em: new Date().toISOString(),
        });
        enviados++;
      } catch (err) {
        console.error(`[notif-forcar] falha email:`, err);
      }
    }

    return { ok: true, enviados };
  });
