// Utilitário de preenchimento do PDF do veículo (AcroForm).
//
// Substitua PDF_BASE64 pela string Base64 do seu PDF pré-marcado. As tags
// abaixo devem existir como campos de texto (text fields) do AcroForm com
// EXATAMENTE estes nomes:
//   veiculo, chassi, km, dn, distribuidor, avaliador, tecnico,
//   data01 (dia), data02 (mês), data03 (ano), hora, minuto

export const PDF_BASE64 = ""; // <- cole aqui o Base64 gigante do seu PDF

export interface DadosVeiculoPdf {
  veiculo: string;
  chassi: string;
  km: string;
  dn: string;
  distribuidor: string;
  avaliador: string;
  tecnico: string;
  /** Data ISO ou Date; se omitido, usa `new Date()`. */
  dataHora?: string | Date;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64
    .replace(/^data:application\/pdf;base64,/, "")
    .replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function partesDataHora(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    data01: pad(d.getDate()),
    data02: pad(d.getMonth() + 1),
    data03: d.getFullYear().toString(),
    hora: pad(d.getHours()),
    minuto: pad(d.getMinutes()),
  };
}

/**
 * Carrega o PDF em Base64, preenche os campos e retorna os bytes achatados.
 */
export async function gerarPdfVeiculo(dados: DadosVeiculoPdf): Promise<Uint8Array> {
  if (!PDF_BASE64) {
    throw new Error(
      "PDF_BASE64 vazio em src/lib/pdf-veiculo.ts. Cole a string Base64 do template.",
    );
  }

  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(base64ToBytes(PDF_BASE64), {
    ignoreEncryption: true,
  });
  const form = doc.getForm();

  const setField = (nome: string, valor: unknown) => {
    try {
      const campo = form.getTextField(nome);
      campo.setText(""); // limpa qualquer tag/valor residual
      campo.setText(String(valor ?? ""));
    } catch (e) {
      console.warn(`[pdf-veiculo] Campo "${nome}" ausente no template:`, e);
    }
  };

  const when = dados.dataHora
    ? new Date(dados.dataHora)
    : new Date();
  const dh = partesDataHora(when);

  setField("veiculo", dados.veiculo);
  setField("chassi", dados.chassi);
  setField("km", dados.km);
  setField("dn", dados.dn);
  setField("distribuidor", dados.distribuidor);
  setField("avaliador", dados.avaliador);
  setField("tecnico", dados.tecnico);
  setField("data01", dh.data01);
  setField("data02", dh.data02);
  setField("data03", dh.data03);
  setField("hora", dh.hora);
  setField("minuto", dh.minuto);

  try {
    form.flatten();
  } catch (e) {
    console.warn("[pdf-veiculo] Falha ao achatar formulário:", e);
  }

  return doc.save({ useObjectStreams: true });
}

/** Dispara o download do PDF no navegador. */
export function baixarPdf(bytes: Uint8Array, nomeArquivo: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
