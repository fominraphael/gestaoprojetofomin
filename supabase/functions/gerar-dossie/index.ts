// Edge Function: gerar-dossie
// Monta o dossiê Toyota a partir de 3 documentos obrigatórios:
// 1) Check-list, 2) Laudo cautelar e 3) Health Check.
// A lógica foi organizada como uma junção de 3 "blocos" fixos, semelhante a
// concatenar 3 HTMLs na ordem exigida pelo sistema: nada entra fora de ordem,
// nada é ignorado silenciosamente e o dossiê só é salvo se os 3 PDFs forem válidos.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const BUCKET = "documentos";
const LIMITE_COMPRESSAO = 2_900_000; // 2.9MB
const LIMITE_FINAL = 3_145_728; // 3MB
const FETCH_TIMEOUT_MS = 25_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  veiculo_id: string;
  pular_compressao?: boolean;
}

type SupabaseClient = ReturnType<typeof createClient>;

type OrigemDocumento = { tipo: "storage"; path: string } | { tipo: "url"; url: string };

interface DocumentoDossieEntrada {
  ordem: 1 | 2 | 3;
  chave: "checklist" | "laudo" | "health";
  titulo: string;
  origem: OrigemDocumento | null;
}

interface DocumentoDossiePronto extends DocumentoDossieEntrada {
  bytes: ArrayBuffer;
  paginas: number;
  tamanhoBytes: number;
}

function normalizarErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isPdf(bytes: ArrayBuffer): boolean {
  const header = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 8)));
  return header.includes("%PDF");
}

async function baixarStorage(supabase: SupabaseClient, path: string, titulo: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(`${titulo}: falha ao baixar do Storage (${error?.message ?? "arquivo vazio"}).`);
  }
  const bytes = await data.arrayBuffer();
  if (!bytes.byteLength) throw new Error(`${titulo}: arquivo baixado está vazio.`);
  return bytes;
}

async function baixarUrl(url: string, titulo: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`${titulo}: URL respondeu HTTP ${res.status}.`);
    }
    const bytes = await res.arrayBuffer();
    if (!bytes.byteLength) throw new Error(`${titulo}: arquivo remoto está vazio.`);
    return bytes;
  } catch (e) {
    const motivo = normalizarErro(e);
    throw new Error(`${titulo}: falha ao baixar URL externa (${motivo}).`);
  } finally {
    clearTimeout(timer);
  }
}

async function carregarDocumento(
  supabase: SupabaseClient,
  entrada: DocumentoDossieEntrada,
): Promise<DocumentoDossiePronto> {
  if (!entrada.origem) {
    throw new Error(`${entrada.titulo}: documento obrigatório ausente.`);
  }

  const bytes =
    entrada.origem.tipo === "storage"
      ? await baixarStorage(supabase, entrada.origem.path, entrada.titulo)
      : await baixarUrl(entrada.origem.url, entrada.titulo);

  if (!isPdf(bytes)) {
    throw new Error(`${entrada.titulo}: o arquivo baixado não parece ser um PDF válido.`);
  }

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const paginas = doc.getPageCount();
    if (paginas <= 0) {
      throw new Error("PDF sem páginas.");
    }
    return {
      ...entrada,
      bytes,
      paginas,
      tamanhoBytes: bytes.byteLength,
    };
  } catch (e) {
    throw new Error(`${entrada.titulo}: PDF inválido ou protegido (${normalizarErro(e)}).`);
  }
}

async function mesclarDossie(documentos: DocumentoDossiePronto[]): Promise<Uint8Array> {
  const ordenados = [...documentos].sort((a, b) => a.ordem - b.ordem);
  const out = await PDFDocument.create();

  for (const docEntrada of ordenados) {
    const src = await PDFDocument.load(docEntrada.bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }

  // Remove metadados e mantém a saída leve/compatível com sistemas que rejeitam
  // arquivos grandes ou com dados extras do gerador original.
  out.setTitle("");
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setProducer("");
  out.setCreator("");

  return await out.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 200,
  });
}

async function comprimirCloudConvert(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const cloudconvertKey = Deno.env.get("CLOUDCONVERT_API_KEY");
  if (!cloudconvertKey) {
    throw new Error("A chave CLOUDCONVERT_API_KEY não foi encontrada nos Secrets.");
  }

  console.log(`Iniciando CloudConvert. Tamanho original: ${pdfBytes.byteLength} bytes`);

  // 1. Cria job
  const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cloudconvertKey}`,
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
  const importTask = jobData.data.tasks.find((t: { name: string }) => t.name === "import-it");

  // 2. Upload
  const formData = new FormData();
  for (const [key, value] of Object.entries(importTask.result.form.parameters as Record<string, string>)) {
    formData.append(key, value);
  }
  formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "dossie.pdf");

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
    const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
      headers: { Authorization: `Bearer ${cloudconvertKey}` },
    });
    const statusData = await statusRes.json();
    jobStatus = statusData.data.status;
    if (jobStatus === "error") {
      throw new Error("Erro interno na CloudConvert durante a otimização");
    }
    exportTask = statusData.data.tasks.find((t: { name: string }) => t.name === "export-it");
  } while (jobStatus !== "finished");

  // 4. Download
  const fileUrl = exportTask.result.files[0].url;
  const fileRes = await fetch(fileUrl);
  const out = new Uint8Array(await fileRes.arrayBuffer());
  console.log(`CloudConvert finalizado. Novo tamanho: ${out.byteLength} bytes`);
  return out;
}

async function processar(veiculo_id: string, pular_compressao = false) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { error: clearErr } = await supabase
    .from("toyota_estoque_veiculos")
    .update({ dossie_pdf_path: null, dossie_enviado_em: null })
    .eq("id", veiculo_id);
  if (clearErr) {
    console.error("Falha ao limpar dossiê anterior:", clearErr.message);
  }

  const { data: v, error } = await supabase
    .from("toyota_estoque_veiculos")
    .select("id,chassi,placa,modelo,ano_modelo,checklist_pdf_path,laudo_arquivo_path,laudo_url,health_check_pdf_path")
    .eq("id", veiculo_id)
    .maybeSingle();
  if (error || !v) {
    throw new Error(`Veículo não encontrado: ${error?.message ?? veiculo_id}`);
  }

  const entradas: DocumentoDossieEntrada[] = [
    {
      ordem: 1,
      chave: "checklist",
      titulo: "01 - Check-list Toyota",
      origem: v.checklist_pdf_path ? { tipo: "storage", path: v.checklist_pdf_path } : null,
    },
    {
      ordem: 2,
      chave: "laudo",
      titulo: "02 - Laudo cautelar",
      origem: v.laudo_arquivo_path
        ? { tipo: "storage", path: v.laudo_arquivo_path }
        : v.laudo_url
          ? { tipo: "url", url: v.laudo_url }
          : null,
    },
    {
      ordem: 3,
      chave: "health",
      titulo: "03 - Health Check",
      origem: v.health_check_pdf_path ? { tipo: "storage", path: v.health_check_pdf_path } : null,
    },
  ];

  const documentos = await Promise.all(entradas.map((entrada) => carregarDocumento(supabase, entrada)));

  const resumo = documentos.map((d) => `${d.titulo}: ${d.paginas} pág., ${d.tamanhoBytes} bytes`).join(" | ");
  console.log(`[dossie] Documentos carregados para ${veiculo_id}: ${resumo}`);

  let pdfFinalBytes = await mesclarDossie(documentos);
  console.log(`[dossie] Merge final: ${pdfFinalBytes.byteLength} bytes`);

  if (!pular_compressao && pdfFinalBytes.byteLength > LIMITE_COMPRESSAO) {
    try {
      pdfFinalBytes = await comprimirCloudConvert(pdfFinalBytes);
    } catch (e) {
      console.error("Falha na etapa de compressão com CloudConvert:", e);
      throw new Error(`Erro de Compressão (CloudConvert): ${normalizarErro(e)}`);
    }
  }

  if (!pular_compressao && pdfFinalBytes.byteLength > LIMITE_FINAL) {
    const tamanhoMB = (pdfFinalBytes.byteLength / 1024 / 1024).toFixed(2);
    throw new Error(
      `O Dossiê gerado ficou com ${tamanhoMB}MB, excedendo o limite de 3MB. A compressão falhou ou não reduziu o suficiente.`,
    );
  }

  const path = `toyota/dossies/${veiculo_id}/${Date.now()}-dossie.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([pdfFinalBytes], { type: "application/pdf" }), {
      upsert: true,
      contentType: "application/pdf",
    });
  if (upErr) {
    throw new Error(`Upload do dossiê falhou: ${upErr.message}`);
  }
  const { error: updErr } = await supabase
    .from("toyota_estoque_veiculos")
    .update({
      dossie_pdf_path: path,
      dossie_enviado_em: new Date().toISOString(),
    })
    .eq("id", veiculo_id);
  if (updErr) throw new Error(`Update do dossiê falhou: ${updErr.message}`);
  console.log("Dossiê pronto:", path);
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
        console.error("Falha ao gerar dossiê em segundo plano:", error?.message ?? error);
      }),
    );

    return new Response(JSON.stringify({ ok: true, veiculo_id, status: "processing" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: normalizarErro(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
