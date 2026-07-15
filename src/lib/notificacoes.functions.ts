// Server-side: Sistema de notificações de chamados
// Envia Web Push (navegador) + E-mail para destinatários conforme regras de status
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const STATUS_LABELS: Record<string, string> = {
  documentacao: "Em Documentação",
  na_fila_central: "Na Fila (Central)",
  em_analise: "Em Análise (Central)",
  pendenciado: "Pendenciado",
  suspenso: "Suspenso",
  comprado: "Comprado",
  cancelado: "Cancelado",
};

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function minutosDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60);
}

function jaNotificou(
  notifMap: Record<string, string>,
  status: string,
  minIntervaloHoras: number,
): boolean {
  const ultima = notifMap[status];
  if (!ultima) return false;
  return minutosDesde(ultima) < minIntervaloHoras * 60;
}

function registrarNotificacao(
  notifMap: Record<string, string>,
  status: string,
): Record<string, string> {
  return { ...notifMap, [status]: new Date().toISOString() };
}

async function buscarDadosUsuarios(
  admin: any,
  userIds: string[],
): Promise<Map<string, { email: string; nome: string }>> {
  const mapa = new Map<string, { email: string; nome: string }>();
  if (!userIds.length) return mapa;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, nome_fantasia")
    .in("id", userIds);

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  for (const p of profiles ?? []) {
    const email = emailMap.get(p.id);
    if (email) {
      mapa.set(p.id, { email, nome: p.nome_fantasia || p.username });
    }
  }

  return mapa;
}

// Enviar Web Push para um usuário (todas as subscriptions ativas)
async function enviarPush(
  admin: any,
  userId: string,
  title: string,
  body: string,
  url: string,
): Promise<number> {
  let enviados = 0;

  try {
    const webpush = await import("web-push");

    // Buscar chaves VAPID das env vars (com fallback para valores hardcoded temporários)
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("[push] VAPID keys não configuradas, pulando push");
      return 0;
    }

    webpush.default.setVapidDetails("mailto:admin@moduloabsn.com", vapidPublicKey, vapidPrivateKey);

    // Buscar subscriptions do usuário
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", userId);

    if (!subs?.length) return 0;

    const payload = JSON.stringify({ title, body, url, tag: `chamado-${url.split("/").pop()}` });

    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
        );

        // Atualizar last_used_at
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);

        enviados++;
      } catch (err: any) {
        // Subscription expirada ou inválida — remover
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          console.warn(`[push] Subscription inválida removida: ${sub.id}`);
        } else {
          console.error(`[push] Falha para ${sub.endpoint}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("[push] Erro ao enviar push:", err);
  }

  return enviados;
}

// Enviar e-mail para um usuário
async function enviarEmail(
  admin: any,
  destinatarioId: string,
  email: string,
  nome: string,
  assunto: string,
  html: string,
  chamadoId: string,
): Promise<boolean> {
  try {
    const { sendMail } = await import("@/lib/smtp.server");
    await sendMail({ to: email, subject: assunto, html });

    await admin.from("compras_notificacoes").insert({
      chamado_id: chamadoId,
      destinatario_id: destinatarioId,
      tipo: "email",
      status_notif: "enviado",
      titulo: assunto,
      mensagem: html,
      link: `/compras/${chamadoId}`,
      enviado_em: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error(`[email] Falha para ${email}:`, err);
    await admin.from("compras_notificacoes").insert({
      chamado_id: chamadoId,
      destinatario_id: destinatarioId,
      tipo: "email",
      status_notif: "erro",
      titulo: assunto,
      mensagem: String(err),
      link: `/compras/${chamadoId}`,
    });
    return false;
  }
}

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

// ============================================================
// VERIFICAÇÃO PERIÓDICA (chamada por cron ou manualmente)
// Regras conforme especificação do usuário
// ============================================================
export const verificarNotificacoes = createServerFn({ method: "POST" }).handler(async () => {
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  // Buscar todos os chamados (inclui finalizados para regras de "comprado"/"cancelado")
  const { data: chamados } = await admin
    .from("compras_chamados")
    .select(
      "id, placa, nome, status, criado_por, assumido_por, status_entrou_em, notificacao_ultima_envio",
    );

  if (!chamados?.length) return { processados: 0, enviados: 0 };

  // Buscar central_compras primeiro para incluir seus IDs na busca de emails
  const { data: centralProfiles } = await admin
    .from("profiles")
    .select("id, username, nome_fantasia")
    .eq("central_compras", true);

  const centralIds = (centralProfiles ?? []).map((p: any) => p.id);

  // Buscar dados de todos os usuários envolvidos
  const userIds = Array.from(
    new Set([
      ...chamados.flatMap((c) => [c.criado_por, c.assumido_por].filter(Boolean)),
      ...centralIds,
    ]),
  ) as string[];

  const dadosMap = await buscarDadosUsuarios(admin, userIds);

  const centralUsers = (centralProfiles ?? [])
    .map((p: any) => ({
      ...p,
      email: dadosMap.get(p.id)?.email ?? "",
      nome: dadosMap.get(p.id)?.nome ?? p.username,
    }))
    .filter((u: any) => u.email);

  const pendentes: NotificacaoPendente[] = [];

  for (const c of chamados) {
    const notifMap = (c.notificacao_ultima_envio ?? {}) as Record<string, string>;
    const horas = c.status_entrou_em ? horasDesde(c.status_entrou_em) : 999;

    switch (c.status) {
      // 1. Em Documentação: após 1h parado → solicitante; repetir a cada 24h
      case "documentacao": {
        if (horas >= 1 && !jaNotificou(notifMap, "documentacao", 24)) {
          const dados = dadosMap.get(c.criado_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.criado_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "solicitante",
              horas_parado: horas,
            });
          }
        }
        break;
      }

      // 2. Na Fila: imediato + repetir a cada 10min → central_compras
      case "na_fila_central": {
        if (!jaNotificou(notifMap, "na_fila_central", 10 / 60)) {
          for (const u of centralUsers) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: u.id,
              destinatario_email: u.email,
              destinatario_nome: u.nome,
              tipo_destinatario: "central",
              horas_parado: horas,
            });
          }
        }
        break;
      }

      // 3. Em Análise Central: após 1h parado → responsável; repetir a cada 1h
      case "em_analise": {
        if (horas >= 1 && c.assumido_por && !jaNotificou(notifMap, "em_analise", 1)) {
          const dados = dadosMap.get(c.assumido_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.assumido_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "responsavel",
              horas_parado: horas,
            });
          }
        }
        break;
      }

      // 4. Pendenciado: imediato + repetir a cada 24h → solicitante
      case "pendenciado": {
        if (!jaNotificou(notifMap, "pendenciado", 24)) {
          const dados = dadosMap.get(c.criado_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.criado_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "solicitante",
              horas_parado: horas,
            });
          }
        }
        break;
      }

      // 5. Suspenso: após 1h parado → responsável; repetir a cada 1h
      case "suspenso": {
        if (horas >= 1 && c.assumido_por && !jaNotificou(notifMap, "suspenso", 1)) {
          const dados = dadosMap.get(c.assumido_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.assumido_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "responsavel",
              horas_parado: horas,
            });
          }
        }
        break;
      }

      // 6. Comprado: única vez → solicitante
      case "comprado": {
        if (!jaNotificou(notifMap, "comprado", 999999)) {
          const dados = dadosMap.get(c.criado_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.criado_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "solicitante",
              horas_parado: 0,
            });
          }
        }
        break;
      }

      // 7. Cancelado: única vez → solicitante
      case "cancelado": {
        if (!jaNotificou(notifMap, "cancelado", 999999)) {
          const dados = dadosMap.get(c.criado_por);
          if (dados) {
            pendentes.push({
              chamado_id: c.id,
              placa: c.placa,
              nome_cliente: c.nome,
              status: c.status,
              destinatario_id: c.criado_por,
              destinatario_email: dados.email,
              destinatario_nome: dados.nome,
              tipo_destinatario: "solicitante",
              horas_parado: 0,
            });
          }
        }
        break;
      }
    }
  }

  if (!pendentes.length) return { processados: chamados.length, enviados: 0 };

  const appUrl = (process.env.VITE_SUPABASE_URL || "").replace(".supabase.co", ".lovable.app");
  let enviados = 0;

  for (const n of pendentes) {
    const label = STATUS_LABELS[n.status] ?? n.status;
    const assunto = `[${label}] Chamado ${n.placa} — ${n.nome_cliente}`;
    const chamadoUrl = `${appUrl}/compras/${n.chamado_id}`;
    const tempoMsg = n.horas_parado > 0 ? ` há ${Math.floor(n.horas_parado)}h` : "";

    const html = `
      <p>Olá <strong>${n.destinatario_nome}</strong>,</p>
      <p>O chamado de compra <strong>${n.placa}</strong> (${n.nome_cliente}) está com status <strong>${label}</strong>${tempoMsg}.</p>
      <p><a href="${chamadoUrl}">Abrir chamado</a></p>
      <p style="color:#999;font-size:11px">Notificação automática do sistema.</p>
    `;

    const pushBody = `${n.placa} (${n.nome_cliente}) — ${label}${tempoMsg}`;

    try {
      // Enviar push + email em paralelo
      const [pushCount] = await Promise.all([
        enviarPush(admin, n.destinatario_id, `GOSYSTEM — ${label}`, pushBody, chamadoUrl),
        enviarEmail(
          admin,
          n.destinatario_id,
          n.destinatario_email,
          n.destinatario_nome,
          assunto,
          html,
          n.chamado_id,
        ),
      ]);

      // Registrar push notification no log
      if (pushCount > 0) {
        await admin.from("compras_notificacoes").insert({
          chamado_id: n.chamado_id,
          destinatario_id: n.destinatario_id,
          tipo: "push",
          status_notif: "enviado",
          titulo: `GOSYSTEM — ${label}`,
          mensagem: pushBody,
          link: `/compras/${n.chamado_id}`,
          enviado_em: new Date().toISOString(),
        });
      }

      // Atualizar última notificação
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
      console.error(`[notif] falha ${n.chamado_id}:`, err);
    }
  }

  return { processados: chamados.length, enviados };
});

// ============================================================
// FORÇAR NOTIFICAÇÃO MANUAL (botão no chamado)
// Dispara push + email imediatamente para o status atual
// ============================================================
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

    // Determinar destinatários conforme regras de status
    let destinatarios: { id: string; email: string; nome: string }[] = [];

    if (chamado.status === "na_fila_central") {
      // Central de compras
      const { data: centralProfiles } = await admin
        .from("profiles")
        .select("id, username, nome_fantasia")
        .eq("central_compras", true);

      const centralIds = (centralProfiles ?? []).map((p: any) => p.id);
      const centralDados = await buscarDadosUsuarios(admin, centralIds);

      destinatarios = (centralProfiles ?? [])
        .map((p: any) => {
          const dados = centralDados.get(p.id);
          return dados ? { id: p.id, email: dados.email, nome: dados.nome } : null;
        })
        .filter(Boolean) as { id: string; email: string; nome: string }[];
    } else if (chamado.status === "em_analise" || chamado.status === "suspenso") {
      // Responsável
      if (chamado.assumido_por) {
        const dadosMap = await buscarDadosUsuarios(admin, [chamado.assumido_por]);
        const dados = dadosMap.get(chamado.assumido_por);
        if (dados)
          destinatarios = [{ id: chamado.assumido_por, email: dados.email, nome: dados.nome }];
      }
    } else {
      // Solicitante (documentacao, pendenciado, comprado, cancelado)
      if (chamado.criado_por) {
        const dadosMap = await buscarDadosUsuarios(admin, [chamado.criado_por]);
        const dados = dadosMap.get(chamado.criado_por);
        if (dados)
          destinatarios = [{ id: chamado.criado_por, email: dados.email, nome: dados.nome }];
      }
    }

    if (!destinatarios.length) return { ok: false, reason: "sem destinatários" };

    const label = STATUS_LABELS[chamado.status] ?? chamado.status;
    const appUrl = (process.env.VITE_SUPABASE_URL || "").replace(".supabase.co", ".lovable.app");
    const chamadoUrl = `${appUrl}/compras/${chamado.id}`;
    let enviados = 0;

    for (const dest of destinatarios) {
      const assunto = `[FORÇADO] [${label}] Chamado ${chamado.placa} — ${chamado.nome}`;
      const pushBody = `${chamado.placa} (${chamado.nome}) — ${label} (notificação manual)`;

      const html = `
        <p>Olá <strong>${dest.nome}</strong>,</p>
        <p>Uma notificação foi disparada manualmente para o chamado <strong>${chamado.placa}</strong> (${chamado.nome}).</p>
        <p>Status atual: <strong>${label}</strong></p>
        <p><a href="${chamadoUrl}">Abrir chamado</a></p>
        <p style="color:#999;font-size:11px">Notificação disparada manualmente.</p>
      `;

      try {
        const [pushCount] = await Promise.all([
          enviarPush(admin, dest.id, `GOSYSTEM — ${label}`, pushBody, chamadoUrl),
          enviarEmail(admin, dest.id, dest.email, dest.nome, assunto, html, chamado.id),
        ]);

        if (pushCount > 0) {
          await admin.from("compras_notificacoes").insert({
            chamado_id: chamado.id,
            destinatario_id: dest.id,
            tipo: "push",
            status_notif: "enviado",
            titulo: `GOSYSTEM — ${label}`,
            mensagem: pushBody,
            link: `/compras/${chamado.id}`,
            enviado_em: new Date().toISOString(),
          });
        }

        enviados++;
      } catch (err) {
        console.error(`[notif-forcar] falha:`, err);
      }
    }

    return { ok: true, enviados };
  });
