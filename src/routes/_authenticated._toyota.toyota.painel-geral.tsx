import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Search,
  Loader2,
  FileText,
  ExternalLink,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCircle,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  checklist_pdf_path: string | null;
  dossie_pdf_path: string | null;
  codigo_tcuv: string | null;
  filial_id: string | null;
  toyota_patios: { nome: string | null; filial_id: string | null } | null;
  importado_em: string | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  hsv_analisado_em: string | null;
  hsv_analisado_por: string | null;
  posvendas_finalizado_em: string | null;
  posvendas_finalizado_por: string | null;
  dossie_enviado_em: string | null;
  enviado_toyota_em: string | null;
  retorno_toyota_em: string | null;
  observacao_toyota: string | null;
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
  certificado_toyota: { label: "Finalizado (TCUV)", cls: "bg-emerald-100 text-emerald-700" },
  arquivado: { label: "Arquivado", cls: "bg-slate-200 text-slate-700" },
  reprovado_admin: { label: "Reprovado", cls: "bg-red-100 text-red-700" },
};

function etapaBadge(r: Row) {
  const s = r.status_aprovacao ?? "—";
  const meta = ETAPA_LABEL[s];
  if (!meta) return <Badge variant="outline">{s}</Badge>;
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function statusAprovacaoBadge(r: Row) {
  if (r.retorno_toyota_em && r.status_aprovacao === "analise")
    return <Badge className="bg-red-100 text-red-700">Recusado Toyota</Badge>;
  if (!r.status_aprovacao) return <Badge variant="outline">—</Badge>;
  if (r.status_aprovacao === "certificado_toyota")
    return <Badge className="bg-emerald-100 text-emerald-700">Aprovado</Badge>;
  if (r.status_aprovacao === "arquivado")
    return <Badge className="bg-slate-200 text-slate-700">Arquivado</Badge>;
  if (r.status_aprovacao.startsWith("reprovado"))
    return <Badge className="bg-red-100 text-red-700">Reprovado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700">Em andamento</Badge>;
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

async function abrirPath(path: string | null | undefined) {
  if (!path) return;
  try {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch {
    toast.error("Não foi possível abrir o documento.");
  }
}

async function abrirLaudo(row: Row) {
  if (row.laudo_arquivo_path) return abrirPath(row.laudo_arquivo_path);
  if (row.laudo_url) window.open(row.laudo_url, "_blank", "noopener,noreferrer");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

interface TimelineEvent {
  label: string;
  em: string | null;
  por?: string | null;
  detalhe?: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
}

function DetalhesModal({ row, onClose }: { row: Row | null; onClose: () => void }) {
  if (!row) return null;
  const eventos: TimelineEvent[] = [
    {
      label: "Importado",
      em: row.importado_em,
      icon: <Clock className="w-4 h-4" />,
    },
    {
      label: "Aprovado na Análise Central",
      em: row.aprovado_em,
      por: row.aprovado_por,
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: "Validado pelo Preparador (HSV)",
      em: row.hsv_analisado_em,
      por: row.hsv_analisado_por,
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: "Pós-Vendas finalizado",
      em: row.posvendas_finalizado_em,
      por: row.posvendas_finalizado_por,
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: "Dossiê gerado / enviado à Toyota",
      em: row.dossie_enviado_em ?? row.enviado_toyota_em,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Recusa da Toyota",
      em: row.retorno_toyota_em,
      icon: <AlertTriangle className="w-4 h-4" />,
      detalhe: row.observacao_toyota ? (
        <span className="italic">"{row.observacao_toyota}"</span>
      ) : null,
      danger: true,
    },
  ];

  const done = eventos.filter((e) => !!e.em);

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row.modelo ?? "Veículo"}{" "}
            <span className="text-xs text-muted-foreground font-mono">{row.chassi}</span>
          </DialogTitle>
          <DialogDescription>
            Placa {row.placa ?? "—"} · {row.ano_modelo ?? "—"} · TCUV:{" "}
            <span className="font-mono">{row.codigo_tcuv ?? "—"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {etapaBadge(row)}
            {statusAprovacaoBadge(row)}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Documentos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!row.laudo_arquivo_path && !row.laudo_url}
                onClick={() => abrirLaudo(row)}
              >
                <FileText className="w-3.5 h-3.5" /> Laudo
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!row.health_check_pdf_path}
                onClick={() => abrirPath(row.health_check_pdf_path)}
              >
                <FileText className="w-3.5 h-3.5" /> Health Check
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!row.checklist_pdf_path}
                onClick={() => abrirPath(row.checklist_pdf_path)}
              >
                <FileText className="w-3.5 h-3.5" /> Check-list
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!row.dossie_pdf_path}
                onClick={() => abrirPath(row.dossie_pdf_path)}
                className="sm:col-span-3"
              >
                <Download className="w-3.5 h-3.5" /> Dossiê completo
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Linha do tempo</h3>
            <ol className="relative border-l pl-5 space-y-4">
              {done.length === 0 && (
                <li className="text-sm text-muted-foreground">Sem eventos registrados.</li>
              )}
              {done.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[26px] top-0 grid h-5 w-5 place-items-center rounded-full text-white ${
                      e.danger ? "bg-red-600" : "bg-emerald-600"
                    }`}
                  >
                    {e.icon}
                  </span>
                  <div className="text-sm font-medium">{e.label}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmtDate(e.em)}
                    </span>
                    {e.por && (
                      <span className="inline-flex items-center gap-1">
                        <UserCircle className="w-3 h-3" /> {e.por}
                      </span>
                    )}
                  </div>
                  {e.detalhe && <div className="text-xs mt-1">{e.detalhe}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PainelGeral() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<string>("all");
  const [filialFiltro, setFilialFiltro] = useState<string>("all");
  const [detalhe, setDetalhe] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, fRes] = await Promise.all([
        supabase
          .from("toyota_estoque_veiculos")
          .select(
            "id,chassi,placa,modelo,ano_modelo,status_aprovacao,elegibilidade,resultado_laudo,laudo_url,laudo_arquivo_path,health_check_pdf_path,checklist_data,checklist_pdf_path,dossie_pdf_path,codigo_tcuv,filial_id,importado_em,aprovado_em,aprovado_por,hsv_analisado_em,hsv_analisado_por,posvendas_finalizado_em,posvendas_finalizado_por,dossie_enviado_em,enviado_toyota_em,retorno_toyota_em,observacao_toyota,toyota_patios:filial_id(nome,filial_id)",
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
                    <TableHead>HC</TableHead>
                    <TableHead>Check-list</TableHead>
                    <TableHead>Dossiê</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>TCUV</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => {
                    const laudoOk =
                      r.resultado_laudo === "aprovado" ||
                      !!r.laudo_url ||
                      !!r.laudo_arquivo_path;
                    const hcOk = !!r.health_check_pdf_path;
                    const checklistOk = !!r.checklist_pdf_path;
                    const dossieOk = !!r.dossie_pdf_path;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setDetalhe(r)}
                      >
                        <TableCell>
                          <div className="font-medium">{r.modelo ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.placa ?? "—"} ·{" "}
                            <span className="font-mono">{r.chassi}</span>
                          </div>
                        </TableCell>
                        <TableCell>{etapaBadge(r)}</TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {docBadge(laudoOk, "OK")}
                            {(r.laudo_url || r.laudo_arquivo_path) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirLaudo(r)}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {docBadge(hcOk, "OK")}
                            {hcOk && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirPath(r.health_check_pdf_path)}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {checklistOk ? (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <FileText className="w-3 h-3 mr-1" />
                                OK
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                Pendente
                              </Badge>
                            )}
                            {checklistOk && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirPath(r.checklist_pdf_path)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {dossieOk ? (
                              <Badge className="bg-emerald-100 text-emerald-700">Gerado</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                Pendente
                              </Badge>
                            )}
                            {dossieOk && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirPath(r.dossie_pdf_path)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{statusAprovacaoBadge(r)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.codigo_tcuv ?? "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => setDetalhe(r)}>
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </Button>
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

      <DetalhesModal row={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
