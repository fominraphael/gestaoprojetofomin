/**
 * Regras de "veículo acelerado" e da ação "Anunciar Portal" (Estoque Matriz).
 * Funções puras: calculadas na leitura, sem jobs — a expiração do OLX e o
 * fechamento automático do "Anunciar Portal" acontecem sozinhos.
 */

/** Janela de vigência do destaque OLX, contada a partir do check de conclusão. */
export const DIAS_ACELERADO_OLX = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Webmotors acelerado quando "WebMotors Plano(s)" contém o texto configurado. */
export function webmotorsAcelerado(planos: string | null | undefined, referencia: string): boolean {
  const ref = normalizar(referencia ?? "");
  if (!ref || !planos) return false;
  return normalizar(planos).includes(ref);
}

export interface RegistroDestaqueOlx {
  concluido: boolean;
  concluido_em: string | null;
}

export type EstadoOlx =
  /** Sem flag, ou flag cujo destaque já venceu (30 dias). */
  | { tipo: "nenhum" }
  /** Flagado: aparece em Ações como "Destacar OLX" aguardando o check. */
  | { tipo: "solicitado" }
  /** Destacado e dentro da vigência. */
  | { tipo: "acelerado"; ate: Date };

export function estadoDestaqueOlx(
  registro: RegistroDestaqueOlx | null | undefined,
  agora: Date = new Date(),
): EstadoOlx {
  if (!registro) return { tipo: "nenhum" };
  if (!registro.concluido || !registro.concluido_em) return { tipo: "solicitado" };
  const ate = new Date(new Date(registro.concluido_em).getTime() + DIAS_ACELERADO_OLX * DIA_MS);
  return agora.getTime() < ate.getTime() ? { tipo: "acelerado", ate } : { tipo: "nenhum" };
}

export interface CanaisAnuncio {
  canal_site_proprio: boolean;
  canal_olx: boolean;
  canal_webmotors: boolean;
}

const CANAIS_PORTAL: { nome: string; publicado: (a: CanaisAnuncio) => boolean }[] = [
  { nome: "Site Próprio", publicado: (a) => a.canal_site_proprio },
  { nome: "OLX", publicado: (a) => a.canal_olx },
  { nome: "WebMotors", publicado: (a) => a.canal_webmotors },
];

/** Portais exigidos pela célula da matriz que ainda não constam na base de anúncios. */
export function portaisFaltantes(
  exigidos: string[] | null | undefined,
  anuncio: CanaisAnuncio | null | undefined,
): string[] {
  const set = new Set((exigidos ?? []).map((c) => normalizar(c).replace(/[^a-z0-9]/g, "")));
  return CANAIS_PORTAL.filter(
    (c) => set.has(normalizar(c.nome).replace(/[^a-z0-9]/g, "")) && !(anuncio && c.publicado(anuncio)),
  ).map((c) => c.nome);
}
