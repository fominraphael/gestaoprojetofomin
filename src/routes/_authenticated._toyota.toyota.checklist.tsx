import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import {
  CHECKLIST_MODELOS,
  type ChecklistTipo,
  type MarcacaoItem,
} from "@/lib/toyota-checklist";
import { Button } from "@/components/ui/button";
import { Printer, Save } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  tipo: z.enum(["TCUV", "TSIM"]).default("TCUV"),
  chassi: z.string().optional(),
  placa: z.string().optional(),
  modelo: z.string().optional(),
  os: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_toyota/toyota/checklist")({
  validateSearch: searchSchema,
  component: ChecklistPage,
  errorComponent: ModuleErrorBoundary,
});

function ChecklistPage() {
  const search = useSearch({ from: Route.id });
  const tipo: ChecklistTipo = search.tipo;
  const modelo = CHECKLIST_MODELOS[tipo];

  // Cabeçalho ICS
  const [cabecalho, setCabecalho] = useState({
    os: search.os ?? "",
    chassi: search.chassi ?? "",
    placa: search.placa ?? "",
    modelo: search.modelo ?? "",
    ano: "",
    km: "",
    preparador: "",
    data: new Date().toISOString().slice(0, 10),
  });

  // Estado das marcações: { "secaoIdx-itemIdx": "✓" | "N/A" | "" }
  const [marcacoes, setMarcacoes] = useState<Record<string, MarcacaoItem>>({});

  // Numeração sequencial 1..N
  const itensNumerados = useMemo(() => {
    let n = 0;
    return modelo.secoes.map((sec, si) => ({
      ...sec,
      itens: sec.itens.map((label, ii) => ({
        label,
        numero: ++n,
        key: `${si}-${ii}`,
      })),
    }));
  }, [modelo]);

  const toggle = (key: string, valor: "✓" | "N/A") => {
    setMarcacoes((m) => ({ ...m, [key]: m[key] === valor ? "" : valor }));
  };

  const conformes = Object.values(marcacoes).filter((v) => v === "✓").length;
  const naoAplicaveis = Object.values(marcacoes).filter((v) => v === "N/A").length;
  const pendentes = modelo.totalItens - conformes - naoAplicaveis;

  const salvar = () => {
    if (pendentes > 0) {
      toast.warning(`Existem ${pendentes} itens pendentes de marcação.`);
      return;
    }
    toast.success("Checklist registrado.");
    // TODO: persistir
  };

  return (
    <div className="bg-neutral-200 py-6 print:bg-white print:py-0">
      {/* Toolbar — escondida na impressão */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-2 print:hidden">
        <div className="text-sm text-neutral-700">
          Tipo: <strong>{tipo}</strong> · {modelo.totalItens} itens · {conformes} ✓ ·{" "}
          {naoAplicaveis} N/A · {pendentes} pendentes
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={salvar} className="gap-2">
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </div>

      {/* Folha A4 */}
      <article className="ics-sheet">
        {/* Cabeçalho ICS */}
        <header className="ics-header">
          <div className="ics-header-top">
            <div className="ics-brand">
              <div className="ics-brand-mark">TOYOTA</div>
              <div className="ics-brand-sub">Certificados Seminovos</div>
            </div>
            <div className="ics-title">
              <div className="ics-title-main">
                ICS — INSPEÇÃO DE CERTIFICADOS SEMINOVOS
              </div>
              <div className="ics-title-sub">
                Programa {tipo} — {modelo.totalItens} itens
              </div>
            </div>
            <div className="ics-meta">
              <div>
                Folha <strong>1/1</strong>
              </div>
              <div>
                Rev. <strong>03</strong>
              </div>
            </div>
          </div>

          <table className="ics-info">
            <tbody>
              <tr>
                <th>Nº O.S.</th>
                <td>
                  <input
                    value={cabecalho.os}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, os: e.target.value })
                    }
                  />
                </td>
                <th>Data</th>
                <td>
                  <input
                    type="date"
                    value={cabecalho.data}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, data: e.target.value })
                    }
                  />
                </td>
                <th>Preparador</th>
                <td colSpan={3}>
                  <input
                    value={cabecalho.preparador}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, preparador: e.target.value })
                    }
                  />
                </td>
              </tr>
              <tr>
                <th>Chassi</th>
                <td colSpan={3}>
                  <input
                    value={cabecalho.chassi}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, chassi: e.target.value })
                    }
                  />
                </td>
                <th>Placa</th>
                <td>
                  <input
                    value={cabecalho.placa}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, placa: e.target.value })
                    }
                  />
                </td>
                <th>Ano</th>
                <td>
                  <input
                    value={cabecalho.ano}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, ano: e.target.value })
                    }
                  />
                </td>
              </tr>
              <tr>
                <th>Modelo</th>
                <td colSpan={5}>
                  <input
                    value={cabecalho.modelo}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, modelo: e.target.value })
                    }
                  />
                </td>
                <th>Km</th>
                <td>
                  <input
                    value={cabecalho.km}
                    onChange={(e) =>
                      setCabecalho({ ...cabecalho, km: e.target.value })
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="ics-legend">
            Marque <strong>✓</strong> apenas para itens conformes. Marque{" "}
            <strong>N/A</strong> quando não aplicável ao veículo.
          </div>
        </header>

        {/* Tabela do checklist */}
        <table className="ics-table">
          <colgroup>
            <col className="ics-col-num" />
            <col />
            <col className="ics-col-mark" />
            <col className="ics-col-mark" />
          </colgroup>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Item de Inspeção</th>
              <th>Conforme</th>
              <th>N/A</th>
            </tr>
          </thead>
          <tbody>
            {itensNumerados.map((sec, si) => (
              <Fragmento key={si}>
                <tr className="ics-section-row">
                  <td colSpan={4}>{sec.titulo}</td>
                </tr>
                {sec.itens.map((it) => {
                  const v = marcacoes[it.key] ?? "";
                  return (
                    <tr key={it.key}>
                      <td className="ics-num">{it.numero}</td>
                      <td className="ics-label">{it.label}</td>
                      <td
                        className="ics-mark"
                        onClick={() => toggle(it.key, "✓")}
                        role="button"
                        aria-label={`Marcar item ${it.numero} como conforme`}
                      >
                        {v === "✓" ? "✓" : ""}
                      </td>
                      <td
                        className="ics-mark"
                        onClick={() => toggle(it.key, "N/A")}
                        role="button"
                        aria-label={`Marcar item ${it.numero} como N/A`}
                      >
                        {v === "N/A" ? "N/A" : ""}
                      </td>
                    </tr>
                  );
                })}
              </Fragmento>
            ))}
          </tbody>
        </table>

        {/* Rodapé / assinaturas */}
        <footer className="ics-footer">
          <div className="ics-sign">
            <div className="ics-sign-line" />
            <div className="ics-sign-label">Preparador</div>
          </div>
          <div className="ics-sign">
            <div className="ics-sign-line" />
            <div className="ics-sign-label">Inspetor Toyota</div>
          </div>
          <div className="ics-sign">
            <div className="ics-sign-line" />
            <div className="ics-sign-label">Gerente da Loja</div>
          </div>
        </footer>
      </article>

      <ChecklistStyles />
    </div>
  );
}

// Fragmento sem `key`-warning para o map
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* ---------- CSS embutido, estilo "formulário impresso" ---------- */
function ChecklistStyles() {
  return (
    <style>{`
      .ics-sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 12mm 12mm 10mm;
        background: #fff;
        color: #000;
        font-family: "Times New Roman", Times, serif;
        font-size: 9.5pt;
        line-height: 1.15;
        box-shadow: 0 2px 12px rgba(0,0,0,.12);
      }
      @media print {
        .ics-sheet { box-shadow:none; margin:0; }
        @page { size: A4; margin: 8mm; }
      }
      .ics-header { border: 1px solid #000; }
      .ics-header-top {
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        align-items: center;
        border-bottom: 1px solid #000;
        padding: 4px 6px;
      }
      .ics-brand-mark {
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 700;
        font-size: 14pt;
        letter-spacing: 2px;
      }
      .ics-brand-sub { font-size: 8pt; letter-spacing: 1px; }
      .ics-title { text-align: center; }
      .ics-title-main { font-weight: 700; font-size: 11pt; letter-spacing: .5px; }
      .ics-title-sub { font-size: 8.5pt; }
      .ics-meta { text-align: right; font-size: 8.5pt; }
      .ics-info { width: 100%; border-collapse: collapse; }
      .ics-info th, .ics-info td {
        border: 1px solid #000;
        padding: 2px 4px;
        font-size: 8.5pt;
        vertical-align: middle;
      }
      .ics-info th {
        background: #f2f2f2;
        font-weight: 700;
        text-align: left;
        width: 8%;
        white-space: nowrap;
      }
      .ics-info input {
        width: 100%;
        border: 0;
        background: transparent;
        font-family: inherit;
        font-size: 9.5pt;
        outline: none;
        padding: 1px 2px;
      }
      .ics-legend {
        border-top: 1px solid #000;
        padding: 3px 6px;
        font-size: 8pt;
        font-style: italic;
        background: #fafafa;
      }
      .ics-table {
        width: 100%;
        margin-top: 6px;
        border-collapse: collapse;
        border: 1px solid #000;
      }
      .ics-table th, .ics-table td {
        border: 1px solid #000;
        padding: 1.5px 4px;
        font-size: 9pt;
      }
      .ics-table thead th {
        background: #e9e9e9;
        font-weight: 700;
        text-align: center;
      }
      .ics-col-num  { width: 7%;  }
      .ics-col-mark { width: 11%; }
      .ics-num   { text-align: center; font-variant-numeric: tabular-nums; }
      .ics-label { text-align: left; }
      .ics-mark  {
        text-align: center;
        cursor: pointer;
        font-weight: 700;
        font-size: 11pt;
        user-select: none;
      }
      .ics-mark:hover { background: #f5f5f5; }
      .ics-section-row td {
        background: #d9d9d9;
        font-weight: 700;
        font-size: 9pt;
        letter-spacing: .3px;
        padding: 3px 6px;
      }
      .ics-footer {
        margin-top: 14mm;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10mm;
      }
      .ics-sign-line { border-top: 1px solid #000; margin-top: 18mm; }
      .ics-sign-label { text-align: center; font-size: 8.5pt; margin-top: 2px; }

      @media print {
        .ics-mark { cursor: default; }
        .ics-section-row { break-inside: avoid; }
        tr { break-inside: avoid; }
      }
    `}</style>
  );
}
