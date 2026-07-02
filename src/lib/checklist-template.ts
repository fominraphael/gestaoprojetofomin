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
  km: string; // "45.230"
  dn: string; // Dealer Number da filial
  nomeDistribuidor: string; // Nome BI Toyota da filial
  avaliadorResponsavel: string;
  tecnicoResponsavel: string;
  data: string; // DD/MM/AAAA
  hora: string; // HH:MM
}

// Coordenadas por template. Ajuste conforme o PDF oficial recebido.
// x,y em pontos (pt); size em pt.
const COORDS = {
  tcuv: {
    veiculoAnoModelo: { x: 130, y: 760, size: 10 },
    chassi: { x: 130, y: 742, size: 10 },
    km: { x: 130, y: 724, size: 10 },
    dn: { x: 420, y: 760, size: 10 },
    nomeDistribuidor: { x: 420, y: 742, size: 10 },
    avaliadorResponsavel: { x: 130, y: 700, size: 10 },
    tecnicoResponsavel: { x: 130, y: 682, size: 10 },
    data: { x: 420, y: 700, size: 10 },
    hora: { x: 490, y: 700, size: 10 },
  },
  tsim: {
    veiculoAnoModelo: { x: 130, y: 760, size: 10 },
    chassi: { x: 130, y: 742, size: 10 },
    km: { x: 130, y: 724, size: 10 },
    dn: { x: 420, y: 760, size: 10 },
    nomeDistribuidor: { x: 420, y: 742, size: 10 },
    avaliadorResponsavel: { x: 130, y: 700, size: 10 },
    tecnicoResponsavel: { x: 130, y: 682, size: 10 },
    data: { x: 420, y: 700, size: 10 },
    hora: { x: 490, y: 700, size: 10 },
  },
} as const;

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
  const page = doc.getPage(0);

  const coords = COORDS[tipo];
  const black = rgb(0, 0, 0);
  const draw = (
    text: string,
    pos: { x: number; y: number; size: number },
  ) => {
    if (!text) return;
    page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font, color: black });
  };

  draw(dados.veiculoAnoModelo, coords.veiculoAnoModelo);
  draw(dados.chassi, coords.chassi);
  draw(dados.km, coords.km);
  draw(dados.dn, coords.dn);
  draw(dados.nomeDistribuidor, coords.nomeDistribuidor);
  draw(dados.avaliadorResponsavel, coords.avaliadorResponsavel);
  draw(dados.tecnicoResponsavel, coords.tecnicoResponsavel);
  draw(dados.data, coords.data);
  draw(dados.hora, coords.hora);

  return doc.save();
}

export function formatarDataHora(iso: string | null): { data: string; hora: string } {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    data: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
