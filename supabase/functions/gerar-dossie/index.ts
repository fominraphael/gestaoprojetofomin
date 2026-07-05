// Edge Function: gerar-dossie
// Mescla checklist + laudo cautelar + health check de um veículo, comprime via
// Cloudmersive se necessário e salva em storage atualizando dossie_pdf_path.
// Chamada em fire-and-forget a partir do frontend (Pós-Vendas → Análise Central).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const MAX_DOSSIE_BYTES = 3 * 1024 * 1024; // 3 MB — dispara compressão externa
const STORAGE_MAX_DOSSIE_BYTES = 3 * 1024 * 1024; // 3 MB — limite duro exigido pela Toyota
const BUCKET = "documentos";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  veiculo_id: string;
}

async function baixar(supabase: ReturnType<typeof createClient>, path: string): Promise<ArrayBuffer | null> {
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

/**
 * Compressão via Cloudmersive.
 * Endpoint oficial: POST /convert/edit/pdf/optimize/reduce-file-size
 * - multipart field: inputFile
 * - header: quality, entre 0.0 e 1.0; quanto menor, mais agressivo.
 * A API não possui parâmetro de tamanho alvo. Por isso fazemos tentativas em
 * cadeia, sempre reenviando o menor PDF retornado, até ficar <= 3MB ou parar de
 * reduzir. Se o plano da API rejeitar arquivos grandes, falhamos de forma
 * explícita e não salvamos o dossiê pesado.
 */
async function comprimirCloudmersive(bytes: Uint8Array): Promise<Uint8Array> {
  const cloudmersiveKey = Deno.env.get("CLOUDMERSIVE_API_KEY");
  if (!cloudmersiveKey) {
    throw new Error("Chave CLOUDMERSIVE_API_KEY não encontrada nos Secrets.");
  }

  async function chamar(buf: Uint8Array, quality: string): Promise<Uint8Array> {
    const fd = new FormData();
    fd.append(
      "inputFile",
      new Blob([buf], { type: "application/pdf" }),
      "dossie.pdf",
    );
    fd.append("quality", quality);
    const r = await fetch("https://api.cloudmersive.com/convert/edit/pdf/optimize/reduce-file-size", {
      method: "POST",
      headers: {
        Apikey: cloudmersiveKey!,
        quality,
        Accept: "application/octet-stream",
      },
      body: fd,
    });
    if (!r.ok) {
      const errorText = (await r.text()).slice(0, 800);
      throw new Error(
        `Cloudmersive reduce-file-size quality=${quality} HTTP ${r.status}: ${errorText}`,
      );
    }
    const out = new Uint8Array(await r.arrayBuffer());
    if (out.byteLength === 0) {
      throw new Error(`Cloudmersive retornou arquivo vazio na quality=${quality}.`);
    }
    return out;
  }

  console.log(`Iniciando compressão Cloudmersive. Tamanho original: ${bytes.byteLength} bytes`);

  let melhor = bytes;
  const qualidades = ["0.3", "0.15", "0.08", "0.03", "0.0"];
  for (const [index, quality] of qualidades.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const comprimido = await chamar(melhor, quality);
    console.log(
      `Cloudmersive quality=${quality}: entrada=${melhor.byteLength} bytes, saída=${comprimido.byteLength} bytes`,
    );

    if (comprimido.byteLength < melhor.byteLength) {
      melhor = comprimido;
    }
    if (melhor.byteLength <= STORAGE_MAX_DOSSIE_BYTES) {
      console.log(`Dossiê comprimido abaixo de 3MB: ${melhor.byteLength} bytes`);
      return melhor;
    }
  }

  for (let tentativa = 1; tentativa <= 3 && melhor.byteLength > STORAGE_MAX_DOSSIE_BYTES; tentativa++) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const antes = melhor.byteLength;
    const comprimido = await chamar(melhor, "0.0");
    console.log(
      `Cloudmersive reforço ${tentativa} quality=0.0: entrada=${antes} bytes, saída=${comprimido.byteLength} bytes`,
    );
    if (comprimido.byteLength >= antes) break;
    melhor = comprimido;
  }

  return melhor;
}

async function processar(veiculo_id: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: clearErr } = await supabase
    .from("toyota_estoque_veiculos")
    .update({
      dossie_pdf_path: null,
      dossie_enviado_em: null,
    })
    .eq("id", veiculo_id);
  if (clearErr) {
    console.error("Falha ao limpar dossiê anterior antes da regeração:", clearErr.message);
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

  let merged = await mesclar(pdfs);
  console.log(`Merge: ${merged.byteLength} bytes`);

  if (merged.byteLength > MAX_DOSSIE_BYTES) {
    merged = await comprimirCloudmersive(merged);
  }

  if (merged.byteLength > STORAGE_MAX_DOSSIE_BYTES) {
    throw new Error(
      `Dossiê final ainda acima de 3MB após compressão Cloudmersive: ${merged.byteLength} bytes. Upload bloqueado para não enviar arquivo fora do limite Toyota.`,
    );
  }

  const path = `toyota/dossies/${veiculo_id}/${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([merged], { type: "application/pdf" }), {
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

    // Fire-and-forget no worker: responde 202 na hora, processa em background.
    // Importante: erros precisam ser capturados aqui para aparecerem nos logs;
    // caso contrário a tela pode parecer que manteve o arquivo antigo.
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(
      processar(veiculo_id).catch((error) => {
        console.error("Falha ao gerar dossiê em segundo plano:", error?.message ?? error);
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
