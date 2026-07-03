// Preenchimento dinâmico do Check-list Toyota sobre o PDF template oficial.
// O template deve ser um PDF Formulário (AcroForm) com campos de texto
// nomeados previamente. O cabeçalho é preenchido via pdf-lib getForm(), sem
// coordenadas X/Y, e depois achatado com form.flatten().

import { supabase } from "@/integrations/supabase/client";

export interface ChecklistHeaderData {
  veiculoAnoModelo: string; // "Corolla Altis 2023/2024"
  chassi: string;
  katashiki: string;
  km: string; // "45.230"
  dn: string; // Dealer Number da filial
  nomeDistribuidor: string; // Nome BI Toyota da filial
  avaliadorResponsavel: string;
  tecnicoResponsavel: string;
  data: string; // DD/MM/AAAA
  hora: string; // HH:MM
}

/**
 * Marcações do check-list preenchidas em tela pelo Pós-Vendas.
 * chave = "SecaoIndex.ItemIndex" (ex: "0.3"); valor = status marcado.
 */
export type MarcacoesMap = Record<string, "" | "✓" | "N/A">;

const ACROFORM_HEADER_FIELDS = {
  veiculoAnoModelo: "Corolla / 2010",
  chassi: "999999999999999999",
  km: "12.298",
  dn: "12312313",
  nomeDistribuidor: "Kurumá Cachoeiro",
  avaliadorResponsavel: "Douglas",
  tecnicoResponsavel: "Marcos Vinicius",
  data: "12 05 2026",
  hora: "00 30",
} as const satisfies Record<Exclude<keyof ChecklistHeaderData, "katashiki">, string>;

export type TemplateTipo = "tcuv" | "tsim";

export function detectarTipoTemplate(elegibilidade: string | null): TemplateTipo | null {
  if (!elegibilidade) return null;
  const e = elegibilidade.toUpperCase();
  if (e.includes("TCUV")) return "tcuv";
  if (e.includes("TSIM")) return "tsim";
  return null;
}

async function getTemplatePath(tipo: TemplateTipo): Promise<string | null> {
  const key = tipo === "tcuv" ? "toyota_template_tcuv_path" : "toyota_template_tsim_path";
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  const v = data.value as { path?: string } | string | null;
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.path ?? null;
}

/**
 * Carrega o template base do bucket `documentos`, preenche o AcroForm do
 * cabeçalho e retorna os bytes do PDF achatado.
 */
export async function gerarChecklistPreenchido(
  tipo: TemplateTipo,
  dados: ChecklistHeaderData,
  marcacoes?: MarcacoesMap,
  opts?: { testModeAutoCheck?: boolean; skipMarcacoesPages?: boolean },
): Promise<Uint8Array> {
  const path = await getTemplatePath(tipo);
  if (!path) {
    throw new Error(
      `Template ${tipo.toUpperCase()} não configurado. Vá em Configurações → Templates de Check-list.`,
    );
  }

  const { data: file, error } = await supabase.storage.from("documentos").download(path);
  if (error || !file) {
    throw new Error(`Falha ao baixar o template ${tipo.toUpperCase()}: ${error?.message ?? ""}`);
  }
  const bytes = await file.arrayBuffer();

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0, 0, 0);

  try {
    form.getTextField(ACROFORM_HEADER_FIELDS.veiculoAnoModelo).setText(dados.veiculoAnoModelo);
    form.getTextField(ACROFORM_HEADER_FIELDS.chassi).setText(dados.chassi);
    form.getTextField(ACROFORM_HEADER_FIELDS.km).setText(dados.km);
    form.getTextField(ACROFORM_HEADER_FIELDS.dn).setText(dados.dn);
    form.getTextField(ACROFORM_HEADER_FIELDS.nomeDistribuidor).setText(dados.nomeDistribuidor);
    form.getTextField(ACROFORM_HEADER_FIELDS.avaliadorResponsavel).setText(dados.avaliadorResponsavel);
    form.getTextField(ACROFORM_HEADER_FIELDS.tecnicoResponsavel).setText(dados.tecnicoResponsavel);
    form.getTextField(ACROFORM_HEADER_FIELDS.data).setText(dados.data);
    form.getTextField(ACROFORM_HEADER_FIELDS.hora).setText(dados.hora);
  } catch (error) {
    console.log("Erro ao preencher um dos campos do formulário:", error);
  }

  // MODO DE TESTE (homologação): marca automaticamente TODAS as checkboxes
  // do formulário original do template Toyota, simulando aprovação 100%.
  // Não preenche TextFields do AcroForm aqui para não competir com o mapeamento
  // absoluto fixo do cabeçalho da Página 1.
  if (opts?.testModeAutoCheck) {
    try {
      const fields = form.getFields();
      const { PDFCheckBox } = await import("pdf-lib");
      for (const f of fields) {
        try {
          if (f instanceof PDFCheckBox) {
            f.check();
          }
        } catch {
          // campo com estado inesperado — ignora e segue
        }
      }
    } catch (e) {
      console.warn("[checklist] Template sem AcroForm ou falha ao marcar:", e);
    }
  }

  form.flatten();

  if (marcacoes && !opts?.skipMarcacoesPages) {
    const { CHECKLIST_MODELOS } = await import("./toyota-checklist");
    const modelo = CHECKLIST_MODELOS[tipo.toUpperCase() as "TCUV" | "TSIM"];
    const pageW = 595;
    const pageH = 842;
    const marginX = 40;
    const marginY = 50;
    const lineHeight = 13;
    let current = doc.addPage([pageW, pageH]);
    let y = pageH - marginY;
    current.drawText(`Check-list ${tipo.toUpperCase()} — Marcações do Pós-Vendas`, {
      x: marginX,
      y,
      size: 12,
      font: fontBold,
      color: black,
    });
    y -= lineHeight * 2;
    current.drawText(`Chassi: ${dados.chassi}  •  KM: ${dados.km}  •  ${dados.data} ${dados.hora}`, {
      x: marginX,
      y,
      size: 9,
      font,
      color: black,
    });
    y -= lineHeight * 1.5;

    const newPage = () => {
      current = doc.addPage([pageW, pageH]);
      y = pageH - marginY;
    };

    modelo.secoes.forEach((sec, si) => {
      if (y < marginY + lineHeight * 3) newPage();
      current.drawText(sec.titulo, {
        x: marginX,
        y,
        size: 10,
        font: fontBold,
        color: black,
      });
      y -= lineHeight;
      sec.itens.forEach((item, ii) => {
        if (y < marginY + lineHeight) newPage();
        const key = `${si}.${ii}`;
        const marca = marcacoes[key] || "";
        const box = marca === "✓" ? "[X]" : marca === "N/A" ? "[N/A]" : "[ ]";
        const line = `${box}  ${item}`;
        const truncated = line.length > 110 ? line.slice(0, 107) + "..." : line;
        current.drawText(truncated, {
          x: marginX,
          y,
          size: 9,
          font,
          color: black,
        });
        y -= lineHeight;
      });
      y -= lineHeight * 0.5;
    });
  }

  return doc.save({ useObjectStreams: true });
}

export function formatarDataHora(iso: string | null): { data: string; hora: string } {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    data: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
