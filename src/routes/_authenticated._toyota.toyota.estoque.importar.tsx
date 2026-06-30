import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Save,
} from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated/_toyota/toyota/estoque/importar",
)({
  errorComponent: ModuleErrorBoundary,
  component: ImportarEstoque,
});

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
  status: string;
}


// ============================================================================
// Tipos e regras de elegibilidade
// ============================================================================

type Elegibilidade = "Elegível TCUV" | "Elegível TSIM" | "Não Elegível";
type StatusCautelar = "Aprovado" | "Reprovado" | "Pendente" | string;

interface VeiculoRow {
  chassi: string;
  placa: string;
  modelo: string;
  marca: string;
  anoFabricacao: number | null;
  anoModelo: number | null;
  quilometragem: number | null;
  laudoCautelarRaw: string;
  statusCautelar: StatusCautelar;
  elegibilidade: Elegibilidade;
}

const HOJE = new Date().getFullYear();

/**
 * TCUV: Toyota até 5 anos (modelo).
 * TSIM: Toyota até 8 anos (modelo).
 * Demais: Não elegível.
 */
function classificarElegibilidade(marca: string, anoModelo: number | null): Elegibilidade {
  if (!anoModelo) return "Não Elegível";
  const idade = HOJE - anoModelo;
  const isToyota = /toyota/i.test(marca);
  if (!isToyota) return "Não Elegível";
  if (idade <= 5) return "Elegível TCUV";
  if (idade <= 8) return "Elegível TSIM";
  return "Não Elegível";
}

/**
 * Extrai (fab, modelo) de strings como "20/20", "2020/2020", "20/2020", "2020".
 * Retorna [null, null] quando não conseguir interpretar.
 */
function parseAno(valor: unknown): [number | null, number | null] {
  if (valor === null || valor === undefined || valor === "") return [null, null];
  const txt = String(valor).trim();
  const parts = txt.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
  const toFull = (s: string): number | null => {
    const n = Number(s.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n < 100) return 2000 + n; // "20" -> 2020
    if (n < 1000) return null;
    return n;
  };
  if (parts.length === 1) {
    const a = toFull(parts[0]);
    return [a, a];
  }
  return [toFull(parts[0]), toFull(parts[1])];
}

function mapStatusCautelar(raw: unknown): StatusCautelar {
  const txt = String(raw ?? "").trim();
  if (!txt) return "Pendente";
  if (/avaliado/i.test(txt)) return "Aprovado";
  return txt;
}

/** Localiza chave do objeto por correspondência fuzzy de header. */
function pick(row: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const re = new RegExp(cand, "i");
    const found = keys.find((k) => re.test(k.normalize("NFD").replace(/\p{Diacritic}/gu, "")));
    if (found) return row[found];
  }
  return undefined;
}

function parseKm(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Página
// ============================================================================

function ImportarEstoque() {
  const [rows, setRows] = useState<VeiculoRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Planilha vazia.");
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
        defval: "",
        raw: false,
      });
      if (data.length === 0) throw new Error("Nenhuma linha encontrada.");

      const mapped: VeiculoRow[] = data.map((r) => {
        const [anoFab, anoMod] = parseAno(
          pick(r, ["ano fab.*mod", "ano fabricacao.*modelo", "ano.*modelo", "^ano$", "fab.*mod"]),
        );
        const marca = String(pick(r, ["^marca$", "fabricante"]) ?? "").trim();
        const modelo = String(pick(r, ["^modelo$", "veiculo", "descricao"]) ?? "").trim();
        const laudoRaw = String(pick(r, ["laudo.*cautelar", "^cautelar$", "laudo"]) ?? "").trim();
        // Se não houver coluna de marca, tenta inferir do modelo
        const marcaFinal = marca || (modelo.split(/\s+/)[0] ?? "");
        return {
          chassi: String(pick(r, ["chassi", "vin"]) ?? "").trim(),
          placa: String(pick(r, ["^placa$"]) ?? "").trim().toUpperCase(),
          modelo,
          marca: marcaFinal,
          anoFabricacao: anoFab,
          anoModelo: anoMod,
          quilometragem: parseKm(pick(r, ["km", "quilometragem", "hodometro"])),
          laudoCautelarRaw: laudoRaw,
          statusCautelar: mapStatusCautelar(laudoRaw),
          elegibilidade: classificarElegibilidade(marcaFinal, anoMod),
        };
      });

      setRows(mapped);
      setFileName(file.name);
      toast.success(`${mapped.length} veículo(s) importado(s).`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao ler o arquivo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.chassi.toLowerCase().includes(q) ||
        r.placa.toLowerCase().includes(q) ||
        r.modelo.toLowerCase().includes(q) ||
        r.marca.toLowerCase().includes(q),
    );
  }, [rows, filtro]);

  const resumo = useMemo(() => {
    const total = rows.length;
    const tcuv = rows.filter((r) => r.elegibilidade === "Elegível TCUV").length;
    const tsim = rows.filter((r) => r.elegibilidade === "Elegível TSIM").length;
    const naoEleg = rows.filter((r) => r.elegibilidade === "Não Elegível").length;
    const aprov = rows.filter((r) => r.statusCautelar === "Aprovado").length;
    return { total, tcuv, tsim, naoEleg, aprov };
  }, [rows]);

  function exportarCsv() {
    if (rows.length === 0) return;
    const headers = [
      "Chassi","Placa","Marca","Modelo","Ano Fab","Ano Modelo","KM","Status Cautelar","Elegibilidade",
    ];
    const csv = [
      headers.join(";"),
      ...rows.map((r) =>
        [r.chassi, r.placa, r.marca, r.modelo, r.anoFabricacao ?? "", r.anoModelo ?? "", r.quilometragem ?? "", r.statusCautelar, r.elegibilidade]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";"),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pre-triagem-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Importação de Veículos em Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Envie um arquivo CSV ou Excel para realizar a pré-triagem de elegibilidade no programa Toyota.
        </p>
      </header>

      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent/40",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onPick}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {loading
                    ? "Processando..."
                    : "Arraste o arquivo aqui ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: .csv, .xlsx, .xls
                </p>
              </div>
              {fileName && !loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{fileName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRows([]);
                      setFileName("");
                    }}
                    className="p-1 hover:text-foreground"
                    title="Limpar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Colunas esperadas (detecção flexível por nome)</summary>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 font-mono">
              <span>Chassi / VIN</span>
              <span>Placa</span>
              <span>Marca</span>
              <span>Modelo</span>
              <span>Ano Fab/Mod (ex: 20/20)</span>
              <span>KM / Quilometragem</span>
              <span>Laudo Cautelar</span>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Resumo */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryTile label="Total" value={resumo.total} />
          <SummaryTile label="TCUV" value={resumo.tcuv} tone="success" />
          <SummaryTile label="TSIM" value={resumo.tsim} tone="info" />
          <SummaryTile label="Não Elegíveis" value={resumo.naoEleg} tone="muted" />
          <SummaryTile label="Cautelar Aprovado" value={resumo.aprov} tone="success" />
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por chassi, placa, modelo..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-72"
              />
              <Button variant="outline" onClick={exportarCsv}>
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chassi</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Ano Fab/Mod</TableHead>
                    <TableHead className="text-right">KM</TableHead>
                    <TableHead>Status Cautelar</TableHead>
                    <TableHead>Elegibilidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={`${r.chassi}-${i}`}>
                      <TableCell className="font-mono text-xs">{r.chassi || "—"}</TableCell>
                      <TableCell className="font-mono">{r.placa || "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.modelo || "—"}</div>
                        {r.marca && (
                          <div className="text-xs text-muted-foreground">{r.marca}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.anoFabricacao && r.anoModelo
                          ? `${r.anoFabricacao}/${r.anoModelo}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.quilometragem !== null
                          ? r.quilometragem.toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <CautelarBadge status={r.statusCautelar} />
                      </TableCell>
                      <TableCell>
                        <ElegibilidadeBadge value={r.elegibilidade} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Nenhum veículo encontrado com o filtro atual.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "info" | "muted";
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-emerald-600",
    info: "text-blue-600",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold mt-1", toneCls)}>{value}</div>
    </div>
  );
}

function CautelarBadge({ status }: { status: StatusCautelar }) {
  if (status === "Aprovado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Aprovado
      </Badge>
    );
  }
  if (status === "Pendente") {
    return <Badge variant="secondary">Pendente</Badge>;
  }
  return (
    <Badge variant="outline" className="gap-1">
      <AlertCircle className="w-3 h-3" />
      {status}
    </Badge>
  );
}

function ElegibilidadeBadge({ value }: { value: Elegibilidade }) {
  if (value === "Elegível TCUV") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">TCUV</Badge>;
  }
  if (value === "Elegível TSIM") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">TSIM</Badge>;
  }
  return <Badge variant="secondary">Não elegível</Badge>;
}
