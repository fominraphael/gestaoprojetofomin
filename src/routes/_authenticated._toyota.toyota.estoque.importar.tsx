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
  Database,
  BarChart3,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  component: ImportarHub,
});

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
  ativo: boolean;
}

// ============================================================================
// Regras de elegibilidade (baseadas em AnoFabricacao)
// ============================================================================

type Elegibilidade = "Elegível TCUV" | "Elegível TSIM" | "Não Elegível";
const HOJE = new Date().getFullYear();

/** TCUV: até 10 anos. TSIM: 6 a 15 anos. (Marca já pré-filtrada para Toyota/Lexus.) */
function classificarElegibilidadeGosystem(anoFab: number | null): Elegibilidade {
  if (!anoFab) return "Não Elegível";
  const idade = HOJE - anoFab;
  if (idade <= 10) return "Elegível TCUV";
  if (idade >= 6 && idade <= 15) return "Elegível TSIM";
  return "Não Elegível";
}

function mapStatusLaudo(raw: unknown): string {
  const txt = String(raw ?? "").trim();
  if (!txt) return "Pendente";
  if (/avaliado|aprovado/i.test(txt)) return "Aprovado";
  if (/reprovado|recusado/i.test(txt)) return "Reprovado";
  return txt;
}

/** Header fuzzy pick. */
function pick(row: Record<string, any>, candidates: string[]): any {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const re = new RegExp(cand, "i");
    const found = keys.find((k) => re.test(norm(k)));
    if (found) return row[found];
  }
  return undefined;
}

function parseInt0(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Página
// ============================================================================

function ImportarHub() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hub de Importação</h1>
        <p className="text-sm text-muted-foreground">
          Centralize importações de estoque (Gosystem) e retornos do BI Toyota.
        </p>
      </header>

      <Tabs defaultValue="gosystem" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xl h-11">
          <TabsTrigger value="gosystem" className="gap-2">
            <Database className="w-4 h-4" />
            Estoque Gosystem
          </TabsTrigger>
          <TabsTrigger value="bi" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            BI Toyota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gosystem">
          <GosystemImporter />
        </TabsContent>

        <TabsContent value="bi">
          <BiToyotaImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Estoque Gosystem
// ============================================================================

interface VeiculoGosystem {
  externalId: string;
  origem: string;
  chassiResumido: string;
  chassi: string;
  placa: string;
  modelo: string;
  marca: string;
  anoFabricacao: number | null;
  anoModelo: number | null;
  quilometragem: number | null;
  resultadoLaudo: string;
  statusCautelar: string;
  elegibilidade: Elegibilidade;
  duplicado: boolean;
  raw: Record<string, any>;
}

function GosystemImporter() {
  const [rows, setRows] = useState<VeiculoGosystem[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialId, setFilialId] = useState<string>("");
  const [descartadosMarca, setDescartadosMarca] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("toyota_filiais")
        .select("id, nome, dealer_number, ativo")
        .eq("ativo", true)
        .order("nome");
      setFiliais((data ?? []) as Filial[]);
    })();
  }, []);

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

      // Pré-filtro: somente Toyota ou Lexus
      const elegiveis = data.filter((r) => {
        const marca = String(pick(r, ["^marca$", "fabricante"]) ?? "").trim();
        return /^(toyota|lexus)$/i.test(marca);
      });
      setDescartadosMarca(data.length - elegiveis.length);

      // Coleta external_ids para checagem de duplicidade
      const candidatos: VeiculoGosystem[] = elegiveis.map((r) => {
        const origem = String(pick(r, ["^origem$"]) ?? "").trim();
        const chassiResumido = String(pick(r, ["chassiresumido", "chassi.*resumido"]) ?? "").trim();
        const chassi = String(pick(r, ["^chassi$", "^vin$"]) ?? "").trim();
        const externalId = `${origem}::${chassiResumido || chassi}`;
        const marca = String(pick(r, ["^marca$"]) ?? "").trim();
        const modelo = String(pick(r, ["^modelo$", "descricao"]) ?? "").trim();
        const anoFab = parseInt0(pick(r, ["anofabricacao", "ano.*fab"]));
        const anoMod = parseInt0(pick(r, ["anomodelo", "ano.*mod"]));
        const km = parseInt0(pick(r, ["km", "quilometragem", "hodometro"]));
        const placa = String(pick(r, ["^placa$"]) ?? "").trim().toUpperCase();
        const laudo = String(pick(r, ["resultado.*laudo", "laudo"]) ?? "").trim();
        return {
          externalId,
          origem,
          chassiResumido,
          chassi,
          placa,
          modelo,
          marca,
          anoFabricacao: anoFab,
          anoModelo: anoMod,
          quilometragem: km,
          resultadoLaudo: laudo,
          statusCautelar: mapStatusLaudo(laudo),
          elegibilidade: classificarElegibilidadeGosystem(anoFab),
          duplicado: false,
          raw: r,
        };
      });

      // Checa duplicidade no banco
      const ids = candidatos.map((c) => c.externalId).filter(Boolean);
      const dupSet = new Set<string>();
      if (ids.length > 0) {
        const { data: existing } = await supabase
          .from("toyota_estoque_veiculos")
          .select("external_id")
          .in("external_id", ids);
        (existing ?? []).forEach((e: any) => e.external_id && dupSet.add(e.external_id));
      }
      const mapped = candidatos.map((c) => ({ ...c, duplicado: dupSet.has(c.externalId) }));

      setRows(mapped);
      setFileName(file.name);
      const novos = mapped.filter((r) => !r.duplicado).length;
      toast.success(
        `${mapped.length} Toyota/Lexus importados · ${novos} novos · ${mapped.length - novos} já analisados`,
      );
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao ler arquivo.");
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

  const salvar = useCallback(async () => {
    if (!filialId) {
      toast.error("Selecione uma filial.");
      return;
    }
    const novos = rows.filter((r) => !r.duplicado && r.chassi);
    if (novos.length === 0) {
      toast.error("Nenhum veículo novo para salvar.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const elegMap: Record<Elegibilidade, "TCUV" | "TSIM" | "NAO_ELEGIVEL"> = {
        "Elegível TCUV": "TCUV",
        "Elegível TSIM": "TSIM",
        "Não Elegível": "NAO_ELEGIVEL",
      };
      const payload = novos.map((r) => ({
        filial_id: filialId,
        user_id: userId,
        chassi: r.chassi,
        placa: r.placa || null,
        modelo: r.modelo || null,
        marca: r.marca || null,
        ano_fabricacao: r.anoFabricacao,
        ano_modelo: r.anoModelo,
        quilometragem: r.quilometragem,
        status_cautelar: r.statusCautelar,
        elegibilidade: elegMap[r.elegibilidade],
        origem: r.origem || null,
        chassi_resumido: r.chassiResumido || null,
        external_id: r.externalId,
        resultado_laudo: r.resultadoLaudo || null,
        fonte_importacao: "gosystem",
        dados_originais: r.raw,
      }));
      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .upsert(payload, { onConflict: "external_id" });
      if (error) throw error;
      toast.success(`${payload.length} veículo(s) salvos.`);
      setRows((prev) => prev.map((r) => ({ ...r, duplicado: true })));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [filialId, rows]);

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.chassi.toLowerCase().includes(q) ||
        r.placa.toLowerCase().includes(q) ||
        r.modelo.toLowerCase().includes(q) ||
        r.origem.toLowerCase().includes(q),
    );
  }, [rows, filtro]);

  const resumo = useMemo(() => {
    const total = rows.length;
    const tcuv = rows.filter((r) => r.elegibilidade === "Elegível TCUV" && !r.duplicado).length;
    const tsim = rows.filter((r) => r.elegibilidade === "Elegível TSIM" && !r.duplicado).length;
    const nao = rows.filter((r) => r.elegibilidade === "Não Elegível").length;
    const dup = rows.filter((r) => r.duplicado).length;
    return { total, tcuv, tsim, nao, dup };
  }, [rows]);

  return (
    <div className="space-y-6">
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
                    : "Arraste o arquivo Gosystem ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filtra automaticamente Toyota/Lexus · Detecta duplicados pelo ID Origem+Chassi
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
                      setDescartadosMarca(0);
                    }}
                    className="p-1 hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryTile label="Toyota/Lexus" value={resumo.total} />
            <SummaryTile label="TCUV (novos)" value={resumo.tcuv} tone="success" />
            <SummaryTile label="TSIM (novos)" value={resumo.tsim} tone="info" />
            <SummaryTile label="Já analisados" value={resumo.dup} tone="muted" />
            <SummaryTile label="Descartados (marca)" value={descartadosMarca} tone="muted" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg">Pré-visualização</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filialId} onValueChange={setFilialId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione a filial..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                        {f.dealer_number ? ` (${f.dealer_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filtrar..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-56"
                />
                <Button onClick={salvar} disabled={saving || !filialId}>
                  <Save className="w-4 h-4" />
                  {saving ? "Salvando..." : "Salvar novos"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead>Chassi</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Ano Fab</TableHead>
                      <TableHead>Laudo</TableHead>
                      <TableHead>Elegibilidade</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r, i) => (
                      <TableRow key={`${r.externalId}-${i}`} className={r.duplicado ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-xs">{r.origem || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.chassi || "—"}</TableCell>
                        <TableCell className="font-mono">{r.placa || "—"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.modelo || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.marca}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.anoFabricacao ?? "—"}</TableCell>
                        <TableCell><LaudoBadge status={r.statusCautelar} /></TableCell>
                        <TableCell><ElegBadge value={r.elegibilidade} /></TableCell>
                        <TableCell>
                          {r.duplicado ? (
                            <Badge variant="outline">Já analisado</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Novo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================================
// BI Toyota
// ============================================================================

interface BiRow {
  codCertificacao: string;
  solicitacao: string;
  certificacao: string;
  familia: string;
  chassi: string;
  placa: string;
  dealer: string;
  grupo: string;
  entrega: string;
  certificadoAprovado: string; // Sim | Não | ""
  motivoReprovacao: string;
  observacao: string;
  // resolução
  encontrado: boolean;
  statusAtual: string | null;
  novoStatus: "aprovado_toyota" | "reprovado_toyota" | "manter" | "nao_encontrado";
}

function BiToyotaImporter() {
  const [rows, setRows] = useState<BiRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

      const parsed: Omit<BiRow, "encontrado" | "statusAtual" | "novoStatus">[] = data.map((r) => ({
        codCertificacao: String(pick(r, ["cod.*certif", "codigo.*certif"]) ?? "").trim(),
        solicitacao: String(pick(r, ["solicitacao"]) ?? "").trim(),
        certificacao: String(pick(r, ["^certificacao$"]) ?? "").trim(),
        familia: String(pick(r, ["familia"]) ?? "").trim(),
        chassi: String(pick(r, ["^chassi$", "^vin$"]) ?? "").trim(),
        placa: String(pick(r, ["^placa$"]) ?? "").trim().toUpperCase(),
        dealer: String(pick(r, ["dealer"]) ?? "").trim(),
        grupo: String(pick(r, ["^grupo$"]) ?? "").trim(),
        entrega: String(pick(r, ["entrega"]) ?? "").trim(),
        certificadoAprovado: String(pick(r, ["certificado.*aprov"]) ?? "").trim(),
        motivoReprovacao: String(pick(r, ["motivo.*reprov"]) ?? "").trim(),
        observacao: String(pick(r, ["observacao"]) ?? "").trim(),
      }));

      const chassis = parsed.map((p) => p.chassi).filter(Boolean);
      const lookup = new Map<string, string>();
      if (chassis.length > 0) {
        const { data: vehicles } = await supabase
          .from("toyota_estoque_veiculos")
          .select("chassi, status_aprovacao")
          .in("chassi", chassis);
        (vehicles ?? []).forEach((v: any) => lookup.set(v.chassi, v.status_aprovacao));
      }

      const resolved: BiRow[] = parsed.map((p) => {
        const status = lookup.get(p.chassi) ?? null;
        const encontrado = status !== null;
        const aprov = p.certificadoAprovado.toLowerCase();
        let novo: BiRow["novoStatus"] = "manter";
        if (!encontrado) novo = "nao_encontrado";
        else if (status !== "enviado_toyota") novo = "manter";
        else if (/^sim$/i.test(aprov)) novo = "aprovado_toyota";
        else if (/^n[ãa]o$/i.test(aprov)) novo = "reprovado_toyota";
        else novo = "manter";
        return { ...p, encontrado, statusAtual: status, novoStatus: novo };
      });

      setRows(resolved);
      setFileName(file.name);
      const upd = resolved.filter((r) => r.novoStatus === "aprovado_toyota" || r.novoStatus === "reprovado_toyota").length;
      toast.success(`${resolved.length} linhas · ${upd} atualizações pendentes`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao ler arquivo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const aplicar = useCallback(async () => {
    const aprovados = rows.filter((r) => r.novoStatus === "aprovado_toyota");
    const reprovados = rows.filter((r) => r.novoStatus === "reprovado_toyota");
    if (aprovados.length + reprovados.length === 0) {
      toast.error("Nenhuma atualização a aplicar.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (aprovados.length > 0) {
        const { error } = await supabase
          .from("toyota_estoque_veiculos")
          .update({ status_aprovacao: "aprovado_toyota", retorno_toyota_em: now })
          .in("chassi", aprovados.map((r) => r.chassi))
          .eq("status_aprovacao", "enviado_toyota");
        if (error) throw error;
      }
      for (const r of reprovados) {
        const { error } = await supabase
          .from("toyota_estoque_veiculos")
          .update({
            status_aprovacao: "reprovado_toyota",
            retorno_toyota_em: now,
            motivo_reprovacao: r.motivoReprovacao || null,
            observacao_toyota: r.observacao || null,
          })
          .eq("chassi", r.chassi)
          .eq("status_aprovacao", "enviado_toyota");
        if (error) throw error;
      }
      toast.success(`${aprovados.length} aprovado(s) · ${reprovados.length} reprovado(s)`);
      setRows([]);
      setFileName("");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao aplicar.");
    } finally {
      setSaving(false);
    }
  }, [rows]);

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

  const resumo = useMemo(() => {
    const total = rows.length;
    const aprov = rows.filter((r) => r.novoStatus === "aprovado_toyota").length;
    const reprov = rows.filter((r) => r.novoStatus === "reprovado_toyota").length;
    const aguard = rows.filter((r) => r.novoStatus === "manter" && r.encontrado).length;
    const naoEnc = rows.filter((r) => !r.encontrado).length;
    return { total, aprov, reprov, aguard, naoEnc };
  }, [rows]);

  return (
    <div className="space-y-6">
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
                    : "Arraste a planilha BI Toyota ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Atualiza apenas veículos com status "Enviado para Toyota"
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
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryTile label="Total" value={resumo.total} />
            <SummaryTile label="Aprovar" value={resumo.aprov} tone="success" />
            <SummaryTile label="Reprovar" value={resumo.reprov} tone="muted" />
            <SummaryTile label="Aguardando" value={resumo.aguard} tone="info" />
            <SummaryTile label="Não encontrados" value={resumo.naoEnc} tone="muted" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg">Retorno Toyota</CardTitle>
              <Button onClick={aplicar} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? "Aplicando..." : "Aplicar atualizações"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chassi</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Família</TableHead>
                      <TableHead>Aprovado?</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status atual</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.chassi}-${i}`}>
                        <TableCell className="font-mono text-xs">{r.chassi || "—"}</TableCell>
                        <TableCell className="font-mono">{r.placa || "—"}</TableCell>
                        <TableCell>{r.familia || "—"}</TableCell>
                        <TableCell>{r.certificadoAprovado || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="max-w-xs truncate" title={r.motivoReprovacao}>
                          {r.motivoReprovacao || "—"}
                        </TableCell>
                        <TableCell>
                          {r.statusAtual ? (
                            <Badge variant="outline">{r.statusAtual}</Badge>
                          ) : (
                            <Badge variant="secondary">não encontrado</Badge>
                          )}
                        </TableCell>
                        <TableCell><AcaoBadge a={r.novoStatus} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Helpers visuais
// ============================================================================

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

function LaudoBadge({ status }: { status: string }) {
  if (status === "Aprovado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Aprovado
      </Badge>
    );
  }
  if (status === "Pendente") return <Badge variant="secondary">Pendente</Badge>;
  return (
    <Badge variant="outline" className="gap-1">
      <AlertCircle className="w-3 h-3" />
      {status}
    </Badge>
  );
}

function ElegBadge({ value }: { value: Elegibilidade }) {
  if (value === "Elegível TCUV")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">TCUV</Badge>;
  if (value === "Elegível TSIM")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">TSIM</Badge>;
  return <Badge variant="secondary">Não elegível</Badge>;
}

function AcaoBadge({ a }: { a: BiRow["novoStatus"] }) {
  if (a === "aprovado_toyota")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprovar</Badge>;
  if (a === "reprovado_toyota")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Reprovar</Badge>;
  if (a === "nao_encontrado") return <Badge variant="secondary">Ignorar</Badge>;
  return <Badge variant="outline">Manter</Badge>;
}
