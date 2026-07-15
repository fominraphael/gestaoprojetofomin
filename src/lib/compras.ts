// Configurações do módulo Compras Seminovos
import { supabase } from "@/integrations/supabase/client";

export type EstadoUF = "GO" | "ES";
export type TipoPessoa = "PF" | "PJ";
export type TipoCompra = "somente_compra" | "troca_vu" | "troca_vn";
export type StatusChamado =
  | "documentacao"
  | "na_fila_central"
  | "em_analise"
  | "pendenciado"
  | "suspenso"
  | "comprado"
  | "cancelado";

export const STATUS_LABEL: Record<StatusChamado, string> = {
  documentacao: "Em documentação",
  na_fila_central: "Na fila (Central)",
  em_analise: "Em análise (Central)",
  pendenciado: "Pendenciado",
  suspenso: "Suspenso",
  comprado: "Comprado",
  cancelado: "Cancelado",
};

/**
 * ID do perfil de administrador com permissão exclusiva para suspender/reativar chamados.
 * Apenas este usuário pode definir ou remover o status "suspenso".
 */
export const ADMIN_SUSPENSAO_ID = "104982f4-794b-4cf5-b024-adb55609d3d9";

export const TIPO_COMPRA_LABEL: Record<TipoCompra, string> = {
  somente_compra: "Somente compra",
  troca_vu: "Troca por VU",
  troca_vn: "Troca por VN",
};

export interface DocumentoRequisito {
  categoria: string;
  label: string;
}

/**
 * Matriz de documentos por estado e pessoa (PF/PJ).
 * Comuns aparecem sempre; extras PJ complementam.
 */
export const DOCUMENTOS_POR_ESTADO: Record<EstadoUF, {
  pf: DocumentoRequisito[];
  pj_extra: DocumentoRequisito[];
}> = {
  GO: {
    pf: [
      { categoria: "dut_atpv_procuracao", label: "DUT ou ATPV ou Procuração" },
      { categoria: "crlv", label: "CRLV" },
      { categoria: "foto_manual", label: "Foto Manual" },
      { categoria: "foto_chave_reserva", label: "Foto Chave reserva" },
      { categoria: "consultas_detran_prf_dnit_pa2", label: "Consultas DETRAN, PRF, DNIT e PA2" },
      { categoria: "vistoria_cautelar", label: "Vistoria cautelar" },
      { categoria: "avaliacao_autoavaliar", label: "Avaliação AUTOAVALIAR" },
      { categoria: "avaliacao_nbs", label: "Avaliação NBS" },
      { categoria: "termo_responsabilidade", label: "Termo de responsabilidade" },
      { categoria: "copia_proposta", label: "Cópia da proposta" },
      { categoria: "atac", label: "ATAC" },
      { categoria: "outros", label: "Outros documentos" },
    ],
    pj_extra: [
      { categoria: "contrato_social", label: "Contrato social" },
      { categoria: "procuracao_pj", label: "Procuração (se houver)" },
      { categoria: "cnh_socio", label: "CNH do sócio que assinou" },
      { categoria: "cnd", label: "CND" },
      { categoria: "nf_emissor", label: "NF (emissor de nota / IE ativa)" },
    ],
  },
  ES: {
    pf: [
      { categoria: "dut_atpv", label: "DUT ou ATPV" },
      { categoria: "crlv", label: "CRLV" },
      { categoria: "foto_manual", label: "Foto Manual" },
      { categoria: "foto_chave_reserva", label: "Foto Chave reserva" },
      { categoria: "consultas_detran_prf_dnit", label: "Consultas DETRAN, PRF e DNIT" },
      { categoria: "vistoria_cautelar", label: "Vistoria cautelar" },
      { categoria: "termo_responsabilidade", label: "Termo de responsabilidade" },
      { categoria: "copia_proposta", label: "Cópia da proposta" },
      { categoria: "atac", label: "ATAC" },
      { categoria: "outros", label: "Outros documentos" },
    ],
    pj_extra: [
      { categoria: "contrato_social", label: "Contrato social" },
      { categoria: "cnh_socio", label: "CNH do sócio que assinou" },
      { categoria: "cnd", label: "CND" },
      { categoria: "nf_emissor", label: "NF (emissor de nota / IE ativa)" },
    ],
  },
};

export function documentosRequeridos(uf: EstadoUF, tipo: TipoPessoa, temInscricaoEstadual?: boolean | null): DocumentoRequisito[] {
  const base = DOCUMENTOS_POR_ESTADO[uf];
  if (tipo !== "PJ") return base.pf;
  let extras = [...base.pj_extra];
  // Se PJ não tem inscrição estadual, remove nf_emissor
  if (temInscricaoEstadual === false) {
    extras = extras.filter((d) => d.categoria !== "nf_emissor");
  }
  return [...base.pf, ...extras];
}

export const TIPOS_DEBITO = [
  { key: "multas", label: "Multas" },
  { key: "laudo_cautelar", label: "Laudo cautelar" },
  { key: "quitacao", label: "Quitação" },
  { key: "ipva", label: "IPVA" },
  { key: "desalienacao", label: "Desalienação" },
  { key: "chave_manual", label: "Chave / manual" },
  { key: "carregador", label: "Carregador" },
] as const;

export const MOTIVOS_PENDENCIA = [
  "Documento ilegível",
  "Documento vencido",
  "Divergência de dados do veículo",
  "Divergência de dados do cliente",
  "Débito não identificado",
  "Falta de comprovante",
  "Outros",
];

export const MOTIVOS_CANCELAMENTO = [
  "Desistência do cliente",
  "Divergência insanável",
  "Restrição legal",
  "Preço não aprovado",
  "Outros",
];

export const MOTIVOS_SUSPENSAO = [
  "Aguardando laudo de terceiros",
  "Aguardando quitação de débito",
  "Aguardando documentação de terceiros",
  "Aguardando regularização DETRAN",
  "Aguardando decisão judicial",
  "Aguardando desalienação",
  "Outros",
];

export type MotivoCategoria = "pendencia" | "cancelamento" | "suspensao";

/**
 * Carrega motivos do banco (compras_cadastros) para o tipo informado.
 * Itens novos ficam em categoria 'motivo_pendencia' com grupo = tipo.
 * Itens antigos ficam em 'motivo_pendencia' ou 'motivo_cancelamento' sem grupo.
 * Retorna apenas itens ativos, ordenados por ordem.
 * Em caso de erro, retorna o array hardcoded como fallback.
 */
export async function carregarMotivos(tipo: MotivoCategoria): Promise<string[]> {
  let query = supabase
    .from("compras_cadastros")
    .select("label, grupo")
    .eq("ativo", true)
    .order("ordem");

  if (tipo === "suspensao") {
    query = query.eq("categoria", "motivo_pendencia").eq("grupo", "suspensao");
  } else if (tipo === "cancelamento") {
    query = query.or("categoria.eq.motivo_cancelamento,and(categoria.eq.motivo_pendencia,grupo.eq.cancelamento)");
  } else {
    query = query.or("and(categoria.eq.motivo_pendencia,grupo.is.null),and(categoria.eq.motivo_pendencia,grupo.eq.pendencia)");
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro ao carregar motivos de ${tipo}:`, error.message);
  }

  // Se houve erro OU retornou vazio, usa fallback hardcoded
  if (error || !data || data.length === 0) {
    switch (tipo) {
      case "pendencia": return MOTIVOS_PENDENCIA;
      case "cancelamento": return MOTIVOS_CANCELAMENTO;
      case "suspensao": return MOTIVOS_SUSPENSAO;
    }
  }

  return data.map((d: any) => d.label);
}
