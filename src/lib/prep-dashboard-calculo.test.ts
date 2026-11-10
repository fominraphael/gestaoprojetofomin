import { describe, it, expect } from "vitest";
import { agregarDashboard, faixaAging, filtrarDashboard, resumirDashboard, dataReferencia, inicioHistorico, type VeiculoDashboard } from "./prep-dashboard-calculo";
import type { IndicadorId, ResultadoIndicador } from "./preparacao-anuncios";
import { readFileSync } from "node:fs";
const indicadores = (pendentes: IndicadorId[]): Record<IndicadorId, ResultadoIndicador> => {
  const resultado = (id: IndicadorId): ResultadoIndicador => ({ status: pendentes.includes(id) ? "pendente" : "ok", motivo: "", dados: [] });
  return { os: resultado("os"), foto: resultado("foto"), tcuv: resultado("tcuv"), auditoria: resultado("auditoria"), anuncio: resultado("anuncio") };
};
const v = (dias: number | null, pendentes: IndicadorId[], ativo = true): VeiculoDashboard => ({ ativo, loja: { final: "BYD VITÓRIA" }, regional: "ES", dias_em_estoque: dias, indicadores: indicadores(pendentes) });
describe("Dashboard Preparação/Anúncios", () => {
  it("conta veículos ativos e pendentes únicos com abertura pelos cinco indicadores", () => {
    const linhas = agregarDashboard([v(10,["os","foto","tcuv","auditoria","anuncio"]),v(20,[]),v(90,["os"],false)],[],[]);
    expect(resumirDashboard(linhas)).toEqual({ ativos:2, pendentes:1, os:1,foto:1,tcuv:1,auditoria:1,anuncio:1 });
  });
  it("mantém todas as lojas cadastradas incluindo zero pendências", () => {
    const linhas = agregarDashboard([], [{loja:"A",regional:"R"},{loja:"B",regional:"R"}],[]);
    expect(linhas.map(l => [l.loja,l.pendentes])).toEqual([["A",0],["B",0]]);
  });
  it("usa um gestor por loja e resolve acentos sem perder o nome do cadastro", () => {
    const linhas = agregarDashboard([v(10,["os"])],[{loja:"BYD VITÓRIA",regional:"ES"}],[{loja:"BYD VITORIA",gestor:"Passon"}]);
    expect(linhas).toHaveLength(1); expect(linhas[0]?.gestor).toBe("Passon");
  });
  it("combina Regional, Loja e Gestor em todos os totais", () => {
    const linhas = agregarDashboard([v(10,["os"])],[],[{loja:"BYD VITÓRIA",gestor:"Passon"}]);
    expect(resumirDashboard(filtrarDashboard(linhas,{regional:"ES",loja:"BYD VITÓRIA",gestor:"Passon"})).pendentes).toBe(1);
    expect(filtrarDashboard(linhas,{regional:"MG",loja:"BYD VITÓRIA",gestor:"Passon"})).toHaveLength(0);
  });
  it("separa aging em 0–15,16–30,31–60,60+ pelos dias em estoque e indicador", () => {
    expect([0,15,16,30,31,60,61,null].map(faixaAging)).toEqual(["0–15","0–15","16–30","16–30","31–60","31–60","60+","Sem informação"]);
    const linhas = agregarDashboard([v(61,["anuncio"])],[],[]);
    expect(linhas[0]?.aging["60+"]?.anuncio).toBe(1); expect(linhas[0]?.aging["60+"]?.os).toBe(0);
  });
  it("exclui status aguardando da pendência preservando a regra do módulo", () => {
    const carro=v(1,[]); carro.indicadores.foto.status="aguardando";
    expect(resumirDashboard(agregarDashboard([carro],[],[])).pendentes).toBe(0);
  });
  it("usa a data de São Paulo para o snapshot diário", () => {
    expect(dataReferencia(new Date("2026-11-11T02:00:00Z"))).toBe("2026-11-10");
  });
  it("seleciona os últimos três meses com limite correto no fim do mês", () => {
    expect(inicioHistorico(3,new Date("2026-05-31T12:00:00Z"))).toBe("2026-02-28");
  });
  it("garante snapshot diário único e limpeza automática após três meses", () => {
    const sql=readFileSync("drizzle/migrations/0011_prep_dashboard_gestores_historico.sql","utf8");
    expect(sql).toMatch(/data_referencia date NOT NULL UNIQUE/);
    expect(sql).toContain("interval '3 months'"); expect(sql).toContain("cron.schedule('prep-dashboard-retencao'");
    expect(sql).toContain("public.has_modulo('preparacao-anuncios')");
  });
});