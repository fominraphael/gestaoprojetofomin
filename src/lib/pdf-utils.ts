// Utilitários PDF client-side: extração de texto (pdfjs-dist) e mesclagem (pdf-lib).

/**
 * Extrai todo o texto de um PDF (bytes) usando pdfjs-dist.
 * Retorna string em maiúsculas para facilitar buscas.
 */
export async function extractPdfText(bytes: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // worker embutido como URL para funcionar em Vite
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerSrc;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
  const doc = await loadingTask.promise;
  const chunks: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    chunks.push(
      content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" "),
    );
  }
  return chunks.join(" ").toUpperCase();
}

/**
 * Verifica se o chassi (17 chars) aparece no texto do PDF.
 * Aceita chassi completo OU chassi resumido (últimos 6-8 chars).
 */
export function pdfContemChassi(pdfText: string, chassi: string): boolean {
  if (!chassi) return false;
  const c = chassi.trim().toUpperCase();
  const t = pdfText.replace(/\s+/g, "");
  if (t.includes(c)) return true;
  // fallback: últimos 8 caracteres (comum em ordens de serviço)
  if (c.length >= 8 && t.includes(c.slice(-8))) return true;
  return false;
}

/**
 * Mescla vários PDFs em um único arquivo comprimido.
 * Retorna Uint8Array com os bytes do PDF final.
 */
export async function mesclarPdfs(pdfs: ArrayBuffer[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (const bytes of pdfs) {
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    } catch (e) {
      console.warn("Falha ao mesclar um PDF, ignorando:", e);
    }
  }
  return merged.save({ useObjectStreams: true, addDefaultPage: false });
}
