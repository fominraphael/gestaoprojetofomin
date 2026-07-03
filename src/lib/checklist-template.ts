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

  const setField = (name: string, value: string) => {
    try {
      form.getTextField(name).setText(value ?? "");
    } catch (err) {
      console.warn(`[checklist] Campo "${name}" ausente no template:`, err);
    }
  };

  try {
    setField("veiculo", dados.veiculoAnoModelo);
    setField("chassi", dados.chassi);
    setField("km", dados.km);
    setField("dn", dados.dn);
    setField("distribuidor", dados.nomeDistribuidor);
    setField("avaliador", dados.avaliadorResponsavel);
    setField("tecnico", dados.tecnicoResponsavel);

    // Tratamento da Data (Separando DD, MM e YYYY)
    const dataString = dados.data || "";
    const dataParts = dataString.includes("/")
      ? dataString.split("/")
      : dataString.split("-");
    if (dataParts.length >= 3) {
      const isAnoPrimeiro = dataParts[0].length === 4;
      setField("data01", isAnoPrimeiro ? dataParts[2] : dataParts[0]); // Dia
      setField("data02", dataParts[1]); // Mês
      setField("data03", isAnoPrimeiro ? dataParts[0] : dataParts[2]); // Ano
    }

    // Tratamento da Hora (Separando HH e MM)
    const horaString = dados.hora || "";
    const horaParts = horaString.split(":");
    if (horaParts.length >= 2) {
      setField("hora", horaParts[0]); // Hora
      setField("minuto", horaParts[1]); // Minuto
    }
  } catch (error) {
    console.error("Erro ao preencher um dos campos do cabeçalho:", error);
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
