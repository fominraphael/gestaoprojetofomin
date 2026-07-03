// Preenchimento dinâmico do Check-list Toyota sobre o PDF template oficial.
// Usa pdf-lib para carregar o template (TCUV ou TSIM) e desenhar os dados
// do veículo/consultor por cima da 1ª página, em Helvetica.
//
// IMPORTANTE: as coordenadas abaixo são um MAPA INICIAL aproximado
// (assumindo A4 retrato ~ 595x842 pt). Ajuste os valores após visualizar
// o resultado sobre o template real da Toyota. O ponto (0,0) do pdf-lib
// é o canto INFERIOR esquerdo — y cresce para cima.

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

type HeaderFieldKey = keyof ChecklistHeaderData;

interface HeaderFieldPosition {
  /** Rótulo exato do PDF oficial usado como contrato do mapeamento. */
  label: string;
  /** Coordenadas absolutas em pontos na Página 1. Não dependem de height/offset. */
  x: number;
  y: number;
  size: number;
  /** Limite visual do campo para impedir invasão do campo paralelo. */
  maxWidth: number;
}

type HeaderMap = Record<HeaderFieldKey, HeaderFieldPosition>;

// Mapeamento fixo do cabeçalho do arquivo "Checklist Novo - 135 itens -EM BRANCO.pdf".
// A ordem abaixo replica o grid visual do template: 5 linhas x 2 colunas.
// Não usar height/getSize, offset, percentuais ou cálculo relativo neste bloco.
const HEADER_FIELD_MAP: HeaderMap = {
  veiculoAnoModelo: {
    label: "Veiculo/ Ano modelo:",
    x: 155,
    y: 724,
    size: 10,
    maxWidth: 170,
  },
  chassi: {
    label: "Chassi:",
    x: 385,
    y: 724,
    size: 10,
    maxWidth: 160,
  },
  km: {
    label: "Quilometragem atual:",
    x: 165,
    y: 704,
    size: 10,
    maxWidth: 120,
  },
  katashiki: {
    label: "Katashiki:",
    x: 385,
    y: 704,
    size: 10,
    maxWidth: 160,
  },
  dn: {
    label: "DN:",
    x: 85,
    y: 684,
    size: 10,
    maxWidth: 75,
  },
  nomeDistribuidor: {
    label: "Nome do distribuidor:",
    x: 430,
    y: 684,
    size: 10,
    maxWidth: 115,
  },
  avaliadorResponsavel: {
    label: "Avaliador Responsável:",
    x: 185,
    y: 664,
    size: 10,
    maxWidth: 135,
  },
  tecnicoResponsavel: {
    label: "Técnico Responsável:",
    x: 430,
    y: 664,
    size: 10,
    maxWidth: 115,
  },
  data: {
    label: "Data:",
    x: 90,
    y: 644,
    size: 10,
    maxWidth: 85,
  },
  hora: {
    label: "Hora:",
    x: 360,
    y: 644,
    size: 10,
    maxWidth: 70,
  },
} as const;

const HEADER_FIELD_ORDER: HeaderFieldKey[] = [
  "veiculoAnoModelo",
  "km",
  "dn",
  "avaliadorResponsavel",
  "data",
  "chassi",
  "katashiki",
  "nomeDistribuidor",
  "tecnicoResponsavel",
  "hora",
];

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
 * Carrega o template base do bucket `documentos`, desenha os dados de
 * cabeçalho e retorna os bytes do PDF preenchido.
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
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPage(0);

  const black = rgb(0, 0, 0);
  const normalizeSingleLine = (text: string): string => text.replace(/\s+/g, " ").trim();
  const truncateToWidth = (text: string, maxWidth: number, size: number): string => {
    const clean = normalizeSingleLine(text);
    if (!clean || font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;

    const ellipsis = "...";
    let end = clean.length;
    while (end > 0) {
      const candidate = `${clean.slice(0, end).trimEnd()}${ellipsis}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) return candidate;
      end -= 1;
    }
    return "";
  };
  const draw = (
    text: string,
    pos: HeaderFieldPosition,
  ) => {
    const value = truncateToWidth(text, pos.maxWidth, pos.size);
    if (!value) return;
    page.drawText(value, {
      x: pos.x,
      y: pos.y,
      size: pos.size,
      font,
      color: black,
    });
  };

  HEADER_FIELD_ORDER.forEach((field) => draw(dados[field], HEADER_FIELD_MAP[field]));

  // MODO DE TESTE (homologação): marca automaticamente TODAS as checkboxes
  // do formulário original do template Toyota, simulando aprovação 100%.
  // Não preenche TextFields do AcroForm aqui para não competir com o mapeamento
  // absoluto fixo do cabeçalho da Página 1.
  if (opts?.testModeAutoCheck) {
    try {
      const form = doc.getForm();
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
      // Preserva as marcações visíveis mesmo após flatten opcional
      try { form.updateFieldAppearances(font); } catch { /* noop */ }
    } catch (e) {
      console.warn("[checklist] Template sem AcroForm ou falha ao marcar:", e);
    }
  }

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
