// Preenchimento do cabeçalho do Check-list Toyota sobre um PDF (AcroForm)
// pré-marcado, fornecido em Base64 via Configurações.
//
// Arquitetura:
// - Existem 6 templates possíveis: {TCUV, TSIM} × {HEV, Utilitário, Passeio}.
// - Cada template é um PDF cujos checkboxes JÁ estão marcados corretamente;
//   armazenamos apenas a string Base64 em `system_settings.value.base64`.
// - Nesta rotina, apenas o cabeçalho (AcroForm text fields) é preenchido
//   dinamicamente e o PDF é achatado com `form.flatten()`.

import { supabase } from "@/integrations/supabase/client";

export type TemplateTipo = "tcuv" | "tsim";
export type TemplateGrupo = "hev" | "utilitario" | "passeio";

/** Nomes dos campos AcroForm que o sistema preenche no cabeçalho. */
export const CAMPOS_ESPERADOS_TEMPLATE: readonly string[] = [
  "veiculo",
  "chassi",
  "km",
  "dn",
  "distribuidor",
  "avaliador",
  "tecnico",
  "data01",
  "data02",
  "data03",
  "hora",
  "minuto",
] as const;

export interface ChecklistHeaderData {
  modelo: string; // usado para roteamento (ex.: "Hilux SRX")
  marca?: string; // opcional: "Lexus", "Toyota"
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

/** Chaves em `system_settings` para cada combinação tipo × grupo. */
export function templateSettingKey(tipo: TemplateTipo, grupo: TemplateGrupo): string {
  return `toyota_template_${tipo}_${grupo}_base64`;
}

export function detectarTipoTemplate(elegibilidade: string | null): TemplateTipo | null {
  if (!elegibilidade) return null;
  const e = elegibilidade.toUpperCase();
  if (e.includes("TCUV")) return "tcuv";
  if (e.includes("TSIM")) return "tsim";
  return null;
}

/**
 * Roteamento por modelo/marca:
 *  - Grupo 1 (HEV): "Hybrid", "Híbrido", "Prius" ou marca "Lexus".
 *  - Grupo 2 (Utilitário): "Hilux" ou "SW4".
 *  - Grupo 3 (Passeio): demais.
 */
export function detectarGrupoVeiculo(modelo: string, marca?: string | null): TemplateGrupo {
  const m = (modelo ?? "").toLowerCase();
  const ma = (marca ?? "").toLowerCase();
  if (ma.includes("lexus") || /hybrid|híbrido|hibrido|prius/.test(m)) return "hev";
  if (/hilux|sw4/.test(m)) return "utilitario";
  return "passeio";
}

async function getTemplateBase64(
  tipo: TemplateTipo,
  grupo: TemplateGrupo,
): Promise<string | null> {
  const key = templateSettingKey(tipo, grupo);
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  const v = data.value as { base64?: string } | string | null;
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.base64 ?? null;
}

function base64ToBytes(b64: string): Uint8Array {
  // Remove data URL prefix e whitespace/quebras de linha eventuais
  const clean = b64.replace(/^data:application\/pdf;base64,/, "").replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Carrega o Base64 do template correspondente, preenche o AcroForm do
 * cabeçalho e retorna os bytes do PDF achatado.
 */
export async function gerarChecklistPreenchido(
  tipo: TemplateTipo,
  dados: ChecklistHeaderData,
): Promise<Uint8Array> {
  const grupo = detectarGrupoVeiculo(dados.modelo, dados.marca);
  const b64 = await getTemplateBase64(tipo, grupo);
  if (!b64) {
    throw new Error(
      `Template ${tipo.toUpperCase()} / ${grupo.toUpperCase()} não configurado. ` +
        `Vá em Configurações → Templates de Check-list.`,
    );
  }

  const bytes = base64ToBytes(b64);

  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();

  const preencherCampo = (nome: string, valor: unknown) => {
    try {
      const campo = form.getTextField(nome);
      if (campo) {
        // Limpa qualquer valor padrão / texto residual travado no template
        campo.setText("");
        // Injeta o dado real do sistema
        campo.setText(String(valor ?? ""));
      }
    } catch (e) {
      console.warn(`[checklist] Campo [${nome}] não encontrado ou erro ao preencher:`, e);
    }
  };

  try {
    preencherCampo("veiculo", dados.veiculoAnoModelo);
    preencherCampo("chassi", dados.chassi);
    preencherCampo("km", dados.km);
    preencherCampo("dn", dados.dn);
    preencherCampo("distribuidor", dados.nomeDistribuidor);
    preencherCampo("avaliador", dados.avaliadorResponsavel);
    preencherCampo("tecnico", dados.tecnicoResponsavel);

    // Tratamento e quebra da Data (data01, data02, data03)
    const dataString = dados.data || "";
    const dataParts = dataString.includes("/")
      ? dataString.split("/")
      : dataString.split("-");
    if (dataParts.length >= 3) {
      const isAnoPrimeiro = dataParts[0].length === 4;
      preencherCampo("data01", isAnoPrimeiro ? dataParts[2] : dataParts[0]); // Dia
      preencherCampo("data02", dataParts[1]); // Mês
      preencherCampo("data03", isAnoPrimeiro ? dataParts[0] : dataParts[2]); // Ano
    }

    // Tratamento e quebra da Hora (hora, minuto)
    const horaString = dados.hora || "";
    const horaParts = horaString.split(":");
    if (horaParts.length >= 2) {
      preencherCampo("hora", horaParts[0]);
      preencherCampo("minuto", horaParts[1]);
    }
  } catch (error) {
    console.error("Erro geral no processamento do cabeçalho do AcroForm:", error);
  }


  try {
    form.flatten();
  } catch (e) {
    console.warn("[checklist] Falha ao achatar formulário:", e);
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

/**
 * Remove versão/motorização do modelo, mantendo apenas o nome principal.
 * Ex.: "COROLLA CROSS XRE 2.0 16V FLEX" → "COROLLA CROSS"
 *      "HILUX SRX 2.8 4X4 AUT" → "HILUX SRX" (SRX é 3ª palavra, mantida como parte do trim curto)
 * Regra: para no primeiro token que casa com marcador de versão/motor
 * (números, "1.8", "2.0", "16V", "FLEX", "AUT", "CVT", "TB", "4X4", "HYBRID", "HEV").
 */
export function formatarModeloCurto(modelo: string | null | undefined): string {
  if (!modelo) return "";
  const stopRe = /^(\d|\d+[.,]\d+|\d+V|FLEX|AUT|AUTOM|CVT|MT|TB|TURBO|4X4|4X2|HYBRID|HEV|HÍBRIDO|HIBRIDO|GASOLINA|DIESEL|H\d)$/i;
  const tokens = modelo.trim().split(/\s+/);
  const out: string[] = [];
  for (const t of tokens) {
    if (stopRe.test(t)) break;
    out.push(t);
    if (out.length >= 3) break; // no máximo 3 tokens (nome + variante curta)
  }
  return (out.length ? out.join(" ") : tokens.slice(0, 2).join(" ")).trim();
}

/** "COROLLA CROSS" + 2026 → "COROLLA CROSS / 2026" */
export function formatarModeloComAno(
  modelo: string | null | undefined,
  ano: number | string | null | undefined,
): string {
  const curto = formatarModeloCurto(modelo);
  if (!ano) return curto;
  return curto ? `${curto} / ${ano}` : String(ano);
}

/** Formata número de KM com separador de milhar pt-BR. 12110 → "12.110" */
export function formatarKm(km: number | string | null | undefined): string {
  if (km == null || km === "") return "";
  const n = typeof km === "number" ? km : Number(String(km).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("pt-BR").format(n);
}
