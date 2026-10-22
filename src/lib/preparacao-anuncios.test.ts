import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  calcularIndicadores, dataValida, indexarLinhas, montarDepara, placasParaInativar, resolverLoja,
  type ConfigIndicador, type IndicadorId, type LinhaBase,
} from "./preparacao-anuncios";

const config = {
  os: { indicador: "os", habilitado: true, config: {} },
  foto: { indicador: "foto", habilitado: true, config: { min_fotos: 5, dias_gosystem: 7 } },
  tcuv: { indicador: "tcuv", habilitado: true, config: {} },
  auditoria: { indicador: "auditoria", habilitado: true, config: {} },
} as Record<IndicadorId, ConfigIndicador>;
const hoje = new Date(2026, 9, 21);
function ctx(linhas: LinhaBase[]) {
  return { porTipo: indexarLinhas(linhas), depara: montarDepara(linhas.filter((l) => l.tipo === "banco_fotos")), config, hoje };
}

describe("resolução de loja", () => {
  it("aplica direcionamento e depois agrupamento", () => {
    const r = resolverLoja("byd vitória",
      [{ loja_sem_operacao: "BYD VITÓRIA", loja_responsavel: "BYD FERNANDO FERRARI SEMINOVOS" }],
      [{ loja_origem: "BYD FERNANDO FERRARI SEMINOVOS", loja_canonica: "BYD FERNANDO FERRARI" }]);
    expect(r).toEqual({ bruta: "BYD VITÓRIA", direcionada: "BYD FERNANDO FERRARI SEMINOVOS", final: "BYD FERNANDO FERRARI" });
  });
});

describe("indicadores", () => {
  it("OS pendente quando a placa está na base", () => {
    expect(calcularIndicadores("ABC1D23", 10, ctx([{ tipo: "os", placa: "ABC1D23", placa_alt: null, dados: {} }])).os.status).toBe("pendente");
  });
  it("foto abaixo de 5 é pendente; com Gosystem recente fica aguardando; no Banco de Fotos fica ok", () => {
    expect(calcularIndicadores("ABC1D23", 4, ctx([])).foto.status).toBe("pendente");
    expect(calcularIndicadores("ABC1D23", 4, ctx([{ tipo: "gosystem", placa: "ABC1D23", placa_alt: null, dados: { "Data Inicio": "18/10/2026" } }])).foto.status).toBe("aguardando");
    expect(calcularIndicadores("ABC1D23", 4, ctx([{ tipo: "gosystem", placa: "ABC1D23", placa_alt: null, dados: { "Data Inicio": "01/10/2026" } }])).foto.status).toBe("pendente");
    expect(calcularIndicadores("ABC1D23", 4, ctx([{ tipo: "banco_fotos", placa: "ABC1234", placa_alt: null, dados: { "PARA NOVA": "ABC1D23" } }])).foto.status).toBe("ok");
  });
  it("TCUV pendente com SOLICITADO data e RETORNO vazio; qualquer valor preenchido gera pendência", () => {
    expect(calcularIndicadores("X1", 9, ctx([{ tipo: "tcuv", placa: "X1", placa_alt: null, dados: { SOLICITADO: "10/10/2026", RETORNO: null } }])).tcuv.status).toBe("pendente");
    expect(calcularIndicadores("X1", 9, ctx([{ tipo: "tcuv", placa: "X1", placa_alt: null, dados: { SOLICITADO: 1, RETORNO: null } }])).tcuv.status).toBe("pendente");
    expect(calcularIndicadores("X1", 9, ctx([{ tipo: "tcuv", placa: "X1", placa_alt: null, dados: { SOLICITADO: null, RETORNO: null } }])).tcuv.status).toBe("ok");
    expect(calcularIndicadores("X1", 9, ctx([{ tipo: "tcuv", placa: "X1", placa_alt: null, dados: { SOLICITADO: "10/10/2026", RETORNO: "12/10/2026" } }])).tcuv.status).toBe("ok");
    expect(dataValida(1)).toBeNull();
  });
  it("auditoria pendente com encontrado NAO", () => {
    expect(calcularIndicadores("X1", 9, ctx([{ tipo: "auditoria", placa: "X1", placa_alt: null, dados: { encontrado: "NÃO" } }])).auditoria.status).toBe("pendente");
  });
});

describe("inatividade", () => {
  it("inativa placas ausentes na nova importação", () => {
    expect(placasParaInativar(["A", "B", "C"], ["A", "C", "D"])).toEqual(["B"]);
  });
});
