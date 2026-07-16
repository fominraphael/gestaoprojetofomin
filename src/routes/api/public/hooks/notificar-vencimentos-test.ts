import { createFileRoute } from "@tanstack/react-router";

// Rota de simulação — dispara um alerta de vencimento para o cenário:
// Empresa: "AB COMERCIO DE VEICULOS LTDA"
// Documento: "CNH THIAGO SILVA FERREIRA" com vencimento HOJE
// Uso: GET/POST /api/public/hooks/notificar-vencimentos-test
async function runSimulation() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendMail } = await import("@/lib/smtp.server");

  const hoje = new Date().toISOString().slice(0, 10);
  const NOME_EMPRESA = "AB COMERCIO DE VEICULOS LTDA";
  const NOME_DOC = "CNH THIAGO SILVA FERREIRA";

  // 1. Buscar empresa
  const { data: empresa, error: eErr } = await supabaseAdmin
    .from("empresas")
    .select("id, nome, cnpj, email_notificacao")
    .ilike("nome", NOME_EMPRESA)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!empresa) throw new Error(`Empresa "${NOME_EMPRESA}" não encontrada.`);
  if (!empresa.email_notificacao)
    throw new Error(`Empresa "${NOME_EMPRESA}" não possui e-mail de notificação configurado.`);

  // 2. Garantir tipo de documento
  let { data: tipo } = await supabaseAdmin
    .from("documentos_tipo")
    .select("id, nome")
    .ilike("nome", NOME_DOC)
    .maybeSingle();
  if (!tipo) {
    const { data: novo, error: tErr } = await supabaseAdmin
      .from("documentos_tipo")
      .insert([{ nome: NOME_DOC, descricao: "Documento de simulação" }])
      .select("id, nome")
      .single();
    if (tErr) throw tErr;
    tipo = novo;
  }

  // 3. Garantir arquivo com vencimento HOJE
  const { data: arqExistente } = await supabaseAdmin
    .from("documentos_arquivo")
    .select("id")
    .eq("empresa_id", empresa.id)
    .eq("tipo_id", tipo.id)
    .maybeSingle();

  let arquivoId = arqExistente?.id;
  if (arquivoId) {
    await supabaseAdmin
      .from("documentos_arquivo")
      .update({ data_vencimento: hoje, notificado_em: null })
      .eq("id", arquivoId);
  } else {
    const { data: novoArq, error: aErr } = await supabaseAdmin
      .from("documentos_arquivo")
      .insert([
        {
          empresa_id: empresa.id,
          tipo_id: tipo.id,
          arquivo_url: "",
          arquivo_nome: `${NOME_DOC}.pdf`,
          storage_path: null,
          data_vencimento: hoje,
        },
      ])
      .select("id")
      .single();
    if (aErr) throw aErr;
    arquivoId = novoArq.id;
  }

  // 4. Enviar e-mail
  const assunto = `[SIMULAÇÃO] Documento vence hoje — ${tipo.nome}`;
  const html = `
    <p><strong>⚠️ Simulação de alerta de vencimento</strong></p>
    <p>Documento vence hoje (${hoje}):</p>
    <ul>
      <li><strong>Empresa:</strong> ${empresa.nome} (${empresa.cnpj})</li>
      <li><strong>Tipo:</strong> ${tipo.nome}</li>
      <li><strong>Vencimento:</strong> ${hoje}</li>
    </ul>
    <p style="color:#666;font-size:12px">E-mail disparado pela rota de simulação.</p>
  `;

  const TESTE_EMAIL = "fominraphael@gmail.com";
  await sendMail({ to: TESTE_EMAIL, subject: assunto, html });

  await supabaseAdmin
    .from("documentos_arquivo")
    .update({ notificado_em: new Date().toISOString() })
    .eq("id", arquivoId);

  return {
    ok: true,
    empresa: empresa.nome,
    destinatario: TESTE_EMAIL,
    documento: tipo.nome,
    vencimento: hoje,
  };
}

async function handle() {
  try {
    const result = await runSimulation();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[notificar-vencimentos-test] falhou:", e?.message, e?.stack);
    return new Response(JSON.stringify({ ok: false, error: e?.message, stack: e?.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/hooks/notificar-vencimentos-test")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
