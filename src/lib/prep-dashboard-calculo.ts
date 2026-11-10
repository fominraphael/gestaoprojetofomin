import type { IndicadorId, ResultadoIndicador } from "./preparacao-anuncios";

export const INDICADORES_DASH: { id: IndicadorId; label: string }[] = [
  { id: "os", label: "OS" }, { id: "foto", label: "Foto" }, { id: "tcuv", label: "TCUV" },
  { id: "auditoria", label: "Auditoria" }, { id: "anuncio", label: "Anúncio" },
];
export const FAIXAS_AGING = ["0–15", "16–30", "31–60", "60+", "Sem informação"];
export interface VeiculoDashboard {
  ativo: boolean; regional: string | null; loja: { final: string }; dias_em_estoque: number | null;
  indicadores: Record<IndicadorId, ResultadoIndicador>;
}
export interface LojaDashboard { loja: string; regional: string }
export interface GestorDashboard { loja: string; gestor: string }
/** Empty arrays mean "all values" for that filter. */
export interface FiltrosDashboard { regional: string[]; loja: string[]; gestor: string[] }
export const TODOS_INDICADORES: IndicadorId[] = ["os", "foto", "tcuv", "auditoria", "anuncio"];
export interface DimensaoDashboard {
  loja: string; regional: string; gestor: string; ativos: number; pendentes: number;
  os: number; foto: number; tcuv: number; auditoria: number; anuncio: number;
  aging: Record<string, Record<IndicadorId, number>>;
  /** Vehicles (counted once) pending per aging band; absent in older snapshots. */
  aging_veiculos?: Record<string, number>;
}
const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
export function faixaAging(dias: number | null): string {
  if (dias === null || !Number.isFinite(dias) || dias < 0) return "Sem informação";
  return dias <= 15 ? "0–15" : dias <= 30 ? "16–30" : dias <= 60 ? "31–60" : "60+";
}
export function dimensaoVazia(loja: string, regional: string, gestor: string): DimensaoDashboard {
  return { loja, regional, gestor, ativos: 0, pendentes: 0, os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0,
    aging: Object.fromEntries(FAIXAS_AGING.map(f => [f, { os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0 }])),
    aging_veiculos: Object.fromEntries(FAIXAS_AGING.map(f => [f, 0])) };
}
/** A vehicle counts once in the pending total, but once per pending indicator in the breakdown. */
export function agregarDashboard(veiculos: VeiculoDashboard[], lojas: LojaDashboard[], gestores: GestorDashboard[], indicadores: IndicadorId[] = TODOS_INDICADORES): DimensaoDashboard[] {
  const considerados = INDICADORES_DASH.filter(i => !indicadores.length || indicadores.includes(i.id));
  const mapa = new Map<string, DimensaoDashboard>();
  const gestorDe = (loja: string) => gestores.find(g => normalizar(g.loja) === normalizar(loja))?.gestor ?? "Sem gestor";
  const obter = (loja: string, regional: string) => {
    const chave = `${normalizar(loja)}|${normalizar(regional)}`;
    let linha = mapa.get(chave);
    if (!linha) { linha = dimensaoVazia(loja, regional, gestorDe(loja)); mapa.set(chave, linha); }
    return linha;
  };
  lojas.forEach(l => obter(l.loja, l.regional));
  for (const v of veiculos.filter(v => v.ativo)) {
    const loja = v.loja.final || "Sem loja";
    const cadastro = lojas.find(l => normalizar(l.loja) === normalizar(loja));
    const linha = obter(cadastro?.loja ?? loja, v.regional?.trim() || cadastro?.regional || "Sem regional");
    linha.ativos++;
    const pendentes = considerados.filter(i => v.indicadores[i.id].status === "pendente");
    const faixa = faixaAging(v.dias_em_estoque);
    if (pendentes.length) { linha.pendentes++; if (linha.aging_veiculos) linha.aging_veiculos[faixa] = (linha.aging_veiculos[faixa] ?? 0) + 1; }
    for (const i of pendentes) { linha[i.id]++; const aging = linha.aging[faixa]; if (aging) aging[i.id]++; }
  }
  return [...mapa.values()].sort((a,b) => a.gestor.localeCompare(b.gestor) || a.loja.localeCompare(b.loja));
}
export function filtrarDashboard(linhas: DimensaoDashboard[], filtros: FiltrosDashboard): DimensaoDashboard[] {
  const lojas = filtros.loja.map(normalizar);
  return linhas.filter(l => (!filtros.regional.length || filtros.regional.includes(l.regional)) && (!lojas.length || lojas.includes(normalizar(l.loja))) && (!filtros.gestor.length || filtros.gestor.includes(l.gestor)));
}
/** Dashboard purge rule: stores/regionals with zero pending vehicles are hidden. */
export function expurgarSemPendencia(linhas: DimensaoDashboard[]): DimensaoDashboard[] {
  return linhas.filter(l => l.pendentes > 0);
}
export interface LinhaTabela { nome: string; gestor: string; pendentes: number; valores: Record<IndicadorId, number> }
/** Groups dimensions by regional or loja; rows with no pending vehicles are dropped. */
export function agruparPor(linhas: DimensaoDashboard[], dimensao: "regional" | "loja"): LinhaTabela[] {
  const mapa = new Map<string, LinhaTabela>();
  for (const l of linhas) {
    const nome = l[dimensao];
    const g = mapa.get(nome) ?? { nome, gestor: l.gestor, pendentes: 0, valores: { os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0 } };
    g.pendentes += l.pendentes; TODOS_INDICADORES.forEach(i => { g.valores[i] += l[i]; }); mapa.set(nome, g);
  }
  return [...mapa.values()].filter(g => g.pendentes > 0);
}
export function resumirDashboard(linhas: DimensaoDashboard[]) {
  return linhas.reduce((t,l) => ({ ativos: t.ativos+l.ativos, pendentes: t.pendentes+l.pendentes,
    os: t.os+l.os, foto: t.foto+l.foto, tcuv: t.tcuv+l.tcuv, auditoria: t.auditoria+l.auditoria, anuncio: t.anuncio+l.anuncio }),
  { ativos: 0, pendentes: 0, os: 0, foto: 0, tcuv: 0, auditoria: 0, anuncio: 0 });
}
export function dataReferencia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}
export function inicioHistorico(meses: number, agora = new Date()): string {
  const data = new Date(`${dataReferencia(agora)}T12:00:00Z`);
  const dia = data.getUTCDate(); data.setUTCDate(1); data.setUTCMonth(data.getUTCMonth() - meses);
  const fim = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth()+1, 0)).getUTCDate();
  data.setUTCDate(Math.min(dia, fim)); return data.toISOString().slice(0,10);
}