// Diagnóstico de campos AcroForm em um PDF em Base64.
// Usado no painel de Configurações para conferir se o template importado
// contém os campos com os nomes esperados pelo sistema.

export interface CampoDetectado {
  nome: string;
  tipo: string; // "PDFTextField" | "PDFCheckBox" | etc.
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function listarCamposPdf(base64: string): Promise<CampoDetectado[]> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(base64ToBytes(base64), {
    ignoreEncryption: true,
  });
  const form = doc.getForm();
  const fields = form.getFields();
  return fields.map((f) => ({
    nome: f.getName(),
    tipo: f.constructor?.name ?? "Desconhecido",
  }));
}
