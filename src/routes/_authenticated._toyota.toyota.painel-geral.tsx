import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Search, Loader2, FileText, ExternalLink } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/painel-geral")({
  errorComponent: ModuleErrorBoundary,
  component: PainelGeral,
});

interface Row {
  id: string;
  chassi: string;
  placa: string | null;
  modelo: string | null;
  ano_modelo: number | null;
  status_aprovacao: string | null;
  elegibilidade: string | null;
  resultado_laudo: string | null;
  laudo_url: string | null;
  laudo_arquivo_path: string | null;
  health_check_pdf_path: string | null;
  checklist_data: unknown;
  codigo_tcuv: string | null;
  filial_id: string | null;
  toyota_patios: { nome: string | null; filial_id: string | null } | null;
}

interface Filial {
  id: string;
  nome: string;
}

const ETAPA_LABEL: Record<string, { label: string; cls: string }> = {
  analise: { label: "Análise Central", cls: "bg-blue-100 text-blue-700" },
  pendente_preparacao: { label: "Preparador", cls: "bg-amber-100 text-amber-700" },
  devolvido_preparador: { label: "Preparador (devolvido)", cls: "bg-amber-100 text-amber-700" },
  em_posvendas: { label: "Pós-Vendas", cls: "bg-purple-100 text-purple-700" },
  aguardando_analise_central: { label: "Envio Toyota", cls: "bg-indigo-100 text-indigo-700" },
  certificado_toyota: { label: "Finalizado", cls: "bg-emerald-100 text-emerald-700" },
  reprovado_admin: { label: "Reprovado", cls: "bg-red-100 text-red-700" },
};

function etapaBadge(status: string | null) {
  const s = status ?? "—";
  const meta = ETAPA_LABEL[s];
  if (!meta) return <Badge variant="outline">{s}</Badge>;
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function statusAprovacaoBadge(status: string | null) {
  if (!status) return <Badge variant="outline">—</Badge>;
  if (status === "certificado_toyota")
    return <Badge className="bg-emerald-100 text-emerald-700">Aprovado</Badge>;
  if (status.startsWith("reprovado"))
    return <Badge className="bg-red-100 text-red-700">Reprovado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>;
}

function docBadge(present: boolean, label: string) {
  return present ? (
    <Badge className="bg-emerald-100 text-emerald-700">{label}</Badge>
  ) : (
    <Badge variant="outline" className="border-amber-300 text-amber-700">
      Pendente
    </Badge>
  );
}

async function abrirDoc(row: Row, tipo: "laudo" | "hc") {
  try {
    if (tipo === "laudo") {
      if (row.laudo_arquivo_path) {
        const { data } = await supabase.storage
          .from("documentos")
          .createSignedUrl(row.laudo_arquivo_path, 600);
        if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (row.laudo_url) window.open(row.laudo_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (row.health_check_pdf_path) {
      const { data } = await supabase.storage
        .from("documentos")
        .createSignedUrl(row.health_check_pdf_path, 600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  } catch {
    toast.error("Não foi possível abrir o documento.");
  }
}

function PainelGeral() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<string>("all");
  const [filialFiltro, setFilialFiltro] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, fRes] = await Promise.all([
        supabase
          .from("toyota_estoque_veiculos")
          .select(
            "id,chassi,placa,modelo,ano_modelo,status_aprovacao,elegibilidade,resultado_laudo,laudo_url,laudo_arquivo_path,health_check_pdf_path,checklist_data,codigo_tcuv,filial_id,toyota_patios:filial_id(nome,filial_id)",
          )
          .order("updated_at", { ascending: false }),
        supabase.from("toyota_filiais").select("id,nome").eq("ativo", true).order("nome"),
      ]);
      if (vRes.error) toast.error(`Falha ao carregar veículos: ${vRes.error.message}`);
      setRows((vRes.data ?? []) as unknown as Row[]);
      setFiliais((fRes.data ?? []) as Filial[]);
      setLoading(false);
    })();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.chassi.toLowerCase().includes(q)) return false;
      if (etapa !== "all" && r.status_aprovacao !== etapa) return false;
      if (filialFiltro !== "all" && r.toyota_patios?.filial_id !== filialFiltro) return false;
      return true;
    });
  }, [rows, busca, etapa, filialFiltro]);

  return (
    <div className="container mx-auto px-6 py-8 max-w-[1400px] space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2">
          <LayoutDashboard className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel Geral</h1>
          <p className="text-sm text-muted-foreground">
            Visão 360° de todos os veículos importados, em qualquer etapa do processo.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Veículos
            <span className="text-muted-foreground font-normal ml-2">({filtrados.length})</span>
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por chassi…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={etapa} onValueChange={setEtapa}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {Object.entries(ETAPA_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filialFiltro} onValueChange={setFilialFiltro}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {filiais.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum veículo encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Laudo</TableHead>
                    <TableHead>Health Check</TableHead>
                    <TableHead>Check-list</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>TCUV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => {
                    const laudoOk =
                      r.resultado_laudo === "aprovado" ||
                      !!r.laudo_url ||
                      !!r.laudo_arquivo_path;
                    const hcOk = !!r.health_check_pdf_path;
                    const checklistOk = !!r.checklist_data;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.modelo ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.placa ?? "—"} ·{" "}
                            <span className="font-mono">{r.chassi}</span>
                          </div>
                        </TableCell>
                        <TableCell>{etapaBadge(r.status_aprovacao)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {docBadge(laudoOk, r.resultado_laudo === "aprovado" ? "Aprovado" : "OK")}
                            {(r.laudo_url || r.laudo_arquivo_path) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirDoc(r, "laudo")}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {docBadge(hcOk, "OK")}
                            {hcOk && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirDoc(r, "hc")}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {checklistOk ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <FileText className="w-3 h-3 mr-1" />
                              Preenchido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{statusAprovacaoBadge(r.status_aprovacao)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.codigo_tcuv ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
