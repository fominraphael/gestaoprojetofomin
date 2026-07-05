// Edge Function: gerar-dossie
// Mescla checklist + laudo cautelar + health check de um veículo, comprime via
// CloudConvert se necessário e salva em storage atualizando dossie_pdf_path.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const BUCKET = "documentos";
const LIMITE_COMPRESSAO = 2_900_000; // 2.9MB
const LIMITE_FINAL = 3_145_728; // 3MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  veiculo_id: string;
}

async function baixar(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    console.warn("Falha ao baixar", path, error?.message);
    return null;
  }
  return await data.arrayBuffer();
}

async function mesclar(pdfs: ArrayBuffer[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const buf of pdfs) {
    try {
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } catch (e) {
      console.warn("PDF inválido ignorado:", (e as Error).message);
    }
  }
  out.setTitle("");
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setProducer("");
  out.setCreator("");
  return await out.save({ useObjectStreams: true, addDefaultPage: false });
}

async function comprimirCloudConvert(
  pdfBytes: Uint8Array,
): Promise<Uint8Array> {
  const cloudconvertKey = Deno.env.get("CLOUDCONVERT_API_KEY");
  if (!cloudconvertKey) {
    throw new Error("A chave CLOUDCONVERT_API_KEY não foi encontrada nos Secrets.");
  }

  console.log(`Iniciando CloudConvert. Tamanho original: ${pdfBytes.byteLength} bytes`);

  // 1. Cria job
  const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cloudconvertKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-it": { operation: "import/upload" },
        "optimize-it": {
          operation: "optimize",
          input: "import-it",
          profile: "web",
        },
        "export-it": { operation: "export/url", input: "optimize-it" },
      },
    }),
  });

  if (!jobRes.ok) {
    const txt = await jobRes.text();
    throw new Error(`Falha ao criar Job na CloudConvert: ${txt}`);
  }
  const jobData = await jobRes.json();
  const importTask = jobData.data.tasks.find(
    (t: { name: string }) => t.name === "import-it",
  );

  // 2. Upload
  const formData = new FormData();
  for (const [key, value] of Object.entries(
    importTask.result.form.parameters as Record<string, string>,
  )) {
    formData.append(key, value);
  }
  formData.append(
    "file",
    new Blob([pdfBytes], { type: "application/pdf" }),
    "dossie.pdf",
  );

  const uploadRes = await fetch(importTask.result.form.url, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error("Falha ao fazer upload do PDF para a CloudConvert");
  }

  // 3. Polling
  let jobStatus: string;
  // deno-lint-ignore no-explicit-any
  let exportTask: any;
  do {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await fetch(
      `https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`,
      { headers: { "Authorization": `Bearer ${cloudconvertKey}` } },
    );
    const statusData = await statusRes.json();
    jobStatus = statusData.data.status;
    if (jobStatus === "error") {
      throw new Error("Erro interno na CloudConvert durante a otimização");
    }
    exportTask = statusData.data.tasks.find(
      (t: { name: string }) => t.name === "export-it",
    );
  } while (jobStatus !== "finished");

  // 4. Download
  const fileUrl = exportTask.result.files[0].url;
  const fileRes = await fetch(fileUrl);
  const out = new Uint8Array(await fileRes.arrayBuffer());
  console.log(`CloudConvert finalizado. Novo tamanho: ${out.byteLength} bytes`);
  return out;
}

async function processar(veiculo_id: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: clearErr } = await supabase
    .from("toyota_estoque_veiculos")
    .update({ dossie_pdf_path: null, dossie_enviado_em: null })
    .eq("id", veiculo_id);
  if (clearErr) {
    console.error("Falha ao limpar dossiê anterior:", clearErr.message);
  }

  const { data: v, error } = await supabase
    .from("toyota_estoque_veiculos")
    .select(
      "id,checklist_pdf_path,laudo_arquivo_path,laudo_url,health_check_pdf_path",
    )
    .eq("id", veiculo_id)
    .maybeSingle();
  if (error || !v) {
    console.error("Veículo não encontrado:", error?.message);
    return;
  }

  const pdfs: ArrayBuffer[] = [];
  if (v.checklist_pdf_path) {
    const b = await baixar(supabase, v.checklist_pdf_path);
    if (b) pdfs.push(b);
  }
  if (v.laudo_arquivo_path) {
    const b = await baixar(supabase, v.laudo_arquivo_path);
    if (b) pdfs.push(b);
  } else if (v.laudo_url) {
    try {
      const r = await fetch(v.laudo_url);
      if (r.ok) pdfs.push(await r.arrayBuffer());
    } catch (e) {
      console.warn("Falha baixando laudo_url:", (e as Error).message);
    }
  }
  if (v.health_check_pdf_path) {
    const b = await baixar(supabase, v.health_check_pdf_path);
    if (b) pdfs.push(b);
  }
  if (pdfs.length === 0) {
    console.warn("Nenhum PDF disponível para veículo", veiculo_id);
    return;
  }

  let pdfFinalBytes = await mesclar(pdfs);
  console.log(`Merge: ${pdfFinalBytes.byteLength} bytes`);

  if (pdfFinalBytes.byteLength > LIMITE_COMPRESSAO) {
    try {
      pdfFinalBytes = await comprimirCloudConvert(pdfFinalBytes);
    } catch (e) {
      console.error("Falha na etapa de compressão com CloudConvert:", e);
      throw new Error(
        `Erro de Compressão (CloudConvert): ${(e as Error).message}`,
      );
    }
  }

  if (pdfFinalBytes.byteLength > LIMITE_FINAL) {
    const tamanhoMB = (pdfFinalBytes.byteLength / 1024 / 1024).toFixed(2);
    throw new Error(
      `O Dossiê gerado ficou com ${tamanhoMB}MB, excedendo o limite de 3MB. A compressão falhou ou não reduziu o suficiente.`,
    );
  }

  const path = `toyota/dossies/${veiculo_id}/${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([pdfFinalBytes], { type: "application/pdf" }), {
      upsert: true,
      contentType: "application/pdf",
    });
  if (upErr) {
    console.error("Upload falhou:", upErr.message);
    return;
  }
  const { error: updErr } = await supabase
    .from("toyota_estoque_veiculos")
    .update({
      dossie_pdf_path: path,
      dossie_enviado_em: new Date().toISOString(),
    })
    .eq("id", veiculo_id);
  if (updErr) console.error("Update falhou:", updErr.message);
  else console.log("Dossiê pronto:", path);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { veiculo_id } = (await req.json()) as Payload;
    if (!veiculo_id) {
      return new Response(JSON.stringify({ error: "veiculo_id ausente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(
      processar(veiculo_id).catch((error) => {
        console.error(
          "Falha ao gerar dossiê em segundo plano:",
          error?.message ?? error,
        );
      }),
    );

    return new Response(
      JSON.stringify({ ok: true, veiculo_id, status: "processing" }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
