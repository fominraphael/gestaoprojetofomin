import { describe, expect, it } from "vitest";
import { estadoDestaqueOlx, portaisFaltantes, webmotorsAcelerado } from "./estoque-acelerado";

describe("webmotorsAcelerado", () => {
  it("é acelerado quando o plano contém o texto configurado", () => {
    expect(webmotorsAcelerado("Destaque, Super Acelerador VIP", "Super Acelerador VIP")).toBe(true);
  });
  it("não é acelerado sem o texto", () => {
    expect(webmotorsAcelerado("Destaque", "Super Acelerador VIP")).toBe(false);
  });
});

describe("estadoDestaqueOlx", () => {
  const check = "2026-10-01T12:00:00Z";
  it("fica acelerado até 30 dias após o check", () => {
    expect(estadoDestaqueOlx({ concluido: true, concluido_em: check }, new Date("2026-10-30T12:00:00Z")).tipo).toBe("acelerado");
  });
  it("expira após 30 dias", () => {
    expect(estadoDestaqueOlx({ concluido: true, concluido_em: check }, new Date("2026-10-31T12:00:01Z")).tipo).toBe("nenhum");
  });
  it("flag sem check fica solicitada", () => {
    expect(estadoDestaqueOlx({ concluido: false, concluido_em: null }).tipo).toBe("solicitado");
  });
});

describe("portaisFaltantes", () => {
  it("mostra somente os portais exigidos que faltam", () => {
    expect(
      portaisFaltantes(["OLX", "WebMotors"], { canal_site_proprio: false, canal_olx: true, canal_webmotors: false }),
    ).toEqual(["WebMotors"]);
  });
  it("sem anúncio, todos os exigidos faltam", () => {
    expect(portaisFaltantes(["Site Próprio"], null)).toEqual(["Site Próprio"]);
  });
});
