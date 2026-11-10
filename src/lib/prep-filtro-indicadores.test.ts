import { describe, it, expect } from "vitest";
import { atendeFiltrosIndicadores, type IndicadorId, type ResultadoIndicador, type StatusIndicador } from "./preparacao-anuncios";

const ind = (s: Partial<Record<IndicadorId, StatusIndicador>>) =>
  Object.fromEntries((["os", "foto", "tcuv", "auditoria", "anuncio"] as IndicadorId[]).map((id) => [id, { status: s[id] ?? "ok", motivo: "", dados: [] }])) as unknown as Record<IndicadorId, ResultadoIndicador>;
const f = { os: "sim", foto: "sim", tcuv: "todos", auditoria: "todos", anuncio: "todos" };

describe("filtro de indicadores (AND)", () => {
  it("exige OS e Foto pendentes juntos", () => {
    expect(atendeFiltrosIndicadores(ind({ os: "pendente", foto: "pendente" }), f)).toBe(true);
    expect(atendeFiltrosIndicadores(ind({ os: "pendente" }), f)).toBe(false);
    expect(atendeFiltrosIndicadores(ind({ foto: "pendente" }), f)).toBe(false);
  });
  it("auditoria pendente não faz veículo entrar no filtro OS+Foto", () => {
    expect(atendeFiltrosIndicadores(ind({ auditoria: "pendente" }), f)).toBe(false);
  });
  it("foto aguardando não conta como pendente", () => {
    expect(atendeFiltrosIndicadores(ind({ os: "pendente", foto: "aguardando" }), f)).toBe(false);
  });
});
