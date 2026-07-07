import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
  Award,
  Settings2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/hooks/use-auth";

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
  ano_fabricacao: number | null;
  quilometragem: number | null;
  status_aprovacao: string | null;
  elegibilidade: string | null;
  resultado_laudo: string | null;
  laudo_url: string | null;
  laudo_arquivo_path: string | null;
  health_check_pdf_path: string | null;
  checklist_data: unknown;
  checklist_pdf_path: string | null;
  dossie_pdf_path: string | null;
  certificado_pdf_path: string | null;
  certificado_uploaded_at: string | null;
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
  enviado_posvendas_em: string | null;
  enviado_central_em: string | null;
  ultimo_envio_toyota_em: string | null;
  aprovado_toyota_em: string | null;
}

interface Filial {
  id: string;
  nome: string;
}

const ETAPA_LABEL: Record<string, { label: string; cls: string }> = {
  analise: { label: "Aguardando análise de elegibilidade", cls: "bg-blue-100 text-blue-700" },
  pendente_preparacao: { label: "Aguardando Preparador", cls: "bg-amber-100 text-amber-700" },
  devolvido_preparador: { label: "Aguardando Preparador (devolvido)", cls: "bg-amber-100 text-amber-700" },
  em_posvendas: { label: "Aguardando Pós-Vendas", cls: "bg-purple-100 text-purple-700" },
  aguardando_analise_central: { label: "Aguardando Central - Envio Toyota", cls: "bg-indigo-100 text-indigo-700" },
  reprovado_toyota: { label: "Aguardando Central - Reenvio Toyota", cls: "bg-orange-100 text-orange-700" },
  aguardando_analise_toyota: { label: "Aguardando análise Toyota", cls: "bg-sky-100 text-sky-700" },
  certificado_toyota: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-700" },
  arquivado: { label: "Arquivado", cls: "bg-slate-200 text-slate-700" },
  reprovado_admin: { label: "Reprovado", cls: "bg-red-100 text-red-700" },
};

function etapaBadge(r: Row) {
  const s = r.status_aprovacao ?? "—";
  const meta = ETAPA_LABEL[s];
  if (!meta) return <Badge variant="outline">{s}</Badge>;
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function docBadge(present: boolean) {
  return present ? (
    <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
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

function fmtDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function fmtKm(km: number | null) {
  if (km == null) return "—";
  return `${Intl.NumberFormat("pt-BR").format(km)} km`;
}

function fmtAno(r: Row) {
  const f = r.ano_fabricacao;
  const m = r.ano_modelo;
  if (!f && !m) return "—";
  return `${f ?? "—"}/${m ?? "—"}`;
}

const DOC_COLUMNS = ["laudo", "hc", "checklist", "dossie", "certificado"] as const;
type DocKey = (typeof DOC_COLUMNS)[number];

async function uploadDoc(
  row: Row,
  key: DocKey,
  file: File,
): Promise<{ path: string; column: string; extra?: Record<string, unknown> }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const folder: Record<DocKey, string> = {
    laudo: "laudos",
    hc: "health-check",
    checklist: "checklists",
    dossie: "dossies",
    certificado: "certificados",
  };
  const column: Record<DocKey, string> = {
    laudo: "laudo_arquivo_path",
    hc: "health_check_pdf_path",
    checklist: "checklist_pdf_path",
    dossie: "dossie_pdf_path",
    certificado: "certificado_pdf_path",
  };
  const path = `toyota/${folder[key]}/${row.chassi}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
  if (upErr) throw upErr;
  const extra: Record<string, unknown> = {};
  if (key === "certificado") extra.certificado_uploaded_at = new Date().toISOString();
  if (key === "hc") extra.health_check_uploaded_at = new Date().toISOString();
  return { path, column: column[key], extra };
}

function DetalhesModal({
  row,
  isAdmin,
  onClose,
  onUpdated,
}: {
  row: Row | null;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (r: Row) => void;
}) {
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<DocKey, HTMLInputElement | null>>({
    laudo: null,
    hc: null,
    checklist: null,
    dossie: null,
    certificado: null,
  });

  if (!row) return null;

  async function alterarStatus(novo: string) {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({ status_aprovacao: novo })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(`Falha ao alterar status: ${error.message}`);
    toast.success("Status atualizado.");
    onUpdated({ ...row, status_aprovacao: novo });
  }

  async function handleFile(key: DocKey, file: File | null) {
    if (!row || !file) return;
    setSaving(true);
    try {
      const { path, column, extra } = await uploadDoc(row, key, file);
      const payload: Record<string, unknown> = { [column]: path, ...(extra ?? {}) };
      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .update(payload as never)
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Documento atualizado.");
      onUpdated({ ...row, ...(payload as Partial<Row>) } as Row);
    } catch (e) {
      toast.error(`Falha no upload: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function removerDoc(key: DocKey) {
    if (!row) return;
    const column: Record<DocKey, string> = {
      laudo: "laudo_arquivo_path",
      hc: "health_check_pdf_path",
      checklist: "checklist_pdf_path",
      dossie: "dossie_pdf_path",
      certificado: "certificado_pdf_path",
    };
    setSaving(true);
    const payload: Record<string, unknown> = { [column[key]]: null };
    if (key === "certificado") payload.certificado_uploaded_at = null;
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update(payload as never)
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(`Falha ao remover: ${error.message}`);
    toast.success("Documento removido.");
    onUpdated({ ...row, ...(payload as Partial<Row>) } as Row);
  }

  const docs: { key: DocKey; label: string; path: string | null; openUrl?: string | null }[] = [
    { key: "laudo", label: "Laudo", path: row.laudo_arquivo_path, openUrl: row.laudo_url },
    { key: "hc", label: "Health Check", path: row.health_check_pdf_path },
    { key: "checklist", label: "Check-list", path: row.checklist_pdf_path },
    { key: "dossie", label: "Dossiê", path: row.dossie_pdf_path },
    { key: "certificado", label: "Certificado", path: row.certificado_pdf_path },
  ];

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row.modelo ?? "Veículo"}{" "}
            <span className="text-xs text-muted-foreground font-mono">{row.chassi}</span>
          </DialogTitle>
          <DialogDescription>
            {row.toyota_patios?.nome ?? "—"} · Placa {row.placa ?? "—"} · {fmtAno(row)} ·{" "}
            {fmtKm(row.quilometragem)} · TCUV:{" "}
            <span className="font-mono">{row.codigo_tcuv ?? "—"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {etapaBadge(row)}
            {isAdmin && (
              <Select
                value={row.status_aprovacao ?? ""}
                onValueChange={alterarStatus}
                disabled={saving}
              >
                <SelectTrigger className="w-[260px] h-8 text-xs">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETAPA_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Documentos</h3>
            <div className="space-y-2">
              {docs.map((d) => {
                const has = !!d.path || !!d.openUrl;
                return (
                  <div
                    key={d.key}
                    className="flex items-center justify-between gap-2 border rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {d.key === "certificado" ? (
                        <Award className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{d.label}</span>
                      {has ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Anexado</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {has && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            d.key === "laudo" ? abrirLaudo(row) : abrirPath(d.path)
                          }
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <input
                            ref={(el) => {
                              inputRefs.current[d.key] = el;
                            }}
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              handleFile(d.key, f);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => inputRefs.current[d.key]?.click()}
                          >
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            {has ? "Substituir" : "Importar"}
                          </Button>
                          {has && d.path && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              disabled={saving}
                              onClick={() => removerDoc(d.key)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Linha do tempo</h3>
            <ol className="relative border-l pl-5 space-y-3">
              {[
                { label: "Importado", em: row.importado_em, icon: <Clock className="w-3 h-3" /> },
                {
                  label: "Aprovado na Análise Central",
                  em: row.aprovado_em,
                  por: row.aprovado_por,
                  icon: <CheckCircle2 className="w-3 h-3" />,
                },
                {
                  label: "Preparador (HSV)",
                  em: row.hsv_analisado_em,
                  por: row.hsv_analisado_por,
                  icon: <CheckCircle2 className="w-3 h-3" />,
                },
                {
                  label: "Pós-Vendas finalizado",
                  em: row.posvendas_finalizado_em,
                  por: row.posvendas_finalizado_por,
                  icon: <CheckCircle2 className="w-3 h-3" />,
                },
                {
                  label: "Enviado à Toyota",
                  em: row.enviado_toyota_em ?? row.dossie_enviado_em,
                  icon: <FileText className="w-3 h-3" />,
                },
                {
                  label: "Retorno da Toyota",
                  em: row.retorno_toyota_em,
                  icon: <AlertTriangle className="w-3 h-3" />,
                  danger: true,
                },
              ]
                .filter((e) => !!e.em)
                .map((e, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[22px] top-0 grid h-4 w-4 place-items-center rounded-full text-white ${
                        e.danger ? "bg-red-600" : "bg-emerald-600"
                      }`}
                    >
                      {e.icon}
                    </span>
                    <div className="text-sm font-medium">{e.label}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                      <span>{fmtDate(e.em)}</span>
                      {e.por && (
                        <span className="inline-flex items-center gap-1">
                          <UserCircle className="w-3 h-3" /> {e.por}
                        </span>
                      )}
                    </div>
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
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<string>("all");
  const [filialFiltro, setFilialFiltro] = useState<string>("all");
  const [certFiltro, setCertFiltro] = useState<string>("all");
  const [detalhe, setDetalhe] = useState<Row | null>(null);
  const [excluir, setExcluir] = useState<Row | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const certInputRef = useRef<HTMLInputElement | null>(null);
  const [certUploadTarget, setCertUploadTarget] = useState<Row | null>(null);

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .delete()
      .eq("id", excluir.id);
    setExcluindo(false);
    if (error) {
      toast.error(`Falha ao excluir: ${error.message}`);
      return;
    }
    toast.success("Veículo excluído.");
    setRows((prev) => prev.filter((r) => r.id !== excluir.id));
    setExcluir(null);
  }

  async function importarCertificadoInline(file: File | null) {
    const target = certUploadTarget;
    if (!target || !file) {
      setCertUploadTarget(null);
      return;
    }
    try {
      const { path, column, extra } = await uploadDoc(target, "certificado", file);
      const payload: Record<string, unknown> = { [column]: path, ...(extra ?? {}) };
      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .update(payload as never)
        .eq("id", target.id);
      if (error) throw error;
      toast.success("Certificado importado.");
      setRows((prev) =>
        prev.map((r) => (r.id === target.id ? ({ ...r, ...(payload as Partial<Row>) } as Row) : r)),
      );
    } catch (e) {
      toast.error(`Falha ao importar: ${(e as Error).message}`);
    } finally {
      setCertUploadTarget(null);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, fRes] = await Promise.all([
        supabase
          .from("toyota_estoque_veiculos")
          .select(
            "id,chassi,placa,modelo,ano_modelo,ano_fabricacao,quilometragem,status_aprovacao,elegibilidade,resultado_laudo,laudo_url,laudo_arquivo_path,health_check_pdf_path,checklist_data,checklist_pdf_path,dossie_pdf_path,certificado_pdf_path,certificado_uploaded_at,codigo_tcuv,filial_id,importado_em,aprovado_em,aprovado_por,hsv_analisado_em,hsv_analisado_por,posvendas_finalizado_em,posvendas_finalizado_por,dossie_enviado_em,enviado_toyota_em,retorno_toyota_em,observacao_toyota,enviado_posvendas_em,enviado_central_em,ultimo_envio_toyota_em,aprovado_toyota_em,toyota_patios:filial_id(nome,filial_id)",
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
      if (certFiltro === "sem" && r.certificado_pdf_path) return false;
      if (certFiltro === "com" && !r.certificado_pdf_path) return false;
      return true;
    });
  }, [rows, busca, etapa, filialFiltro, certFiltro]);

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2">
          <LayoutDashboard className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Processos</h1>
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
              <SelectTrigger className="w-[200px]">
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
            <Select value={certFiltro} onValueChange={setCertFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Certificado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Certificado: todos</SelectItem>
                <SelectItem value="sem">Sem certificado</SelectItem>
                <SelectItem value="com">Com certificado</SelectItem>
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
                    <TableHead>Loja</TableHead>
                    <TableHead>Ano/Modelo</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Aprovado Central</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Laudo</TableHead>
                    <TableHead>HC</TableHead>
                    <TableHead>Check-list</TableHead>
                    <TableHead>Dossiê</TableHead>
                    <TableHead>Certificado</TableHead>
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
                    const certOk = !!r.certificado_pdf_path;
                    const podeImportarCert =
                      isAdmin && r.status_aprovacao === "certificado_toyota";
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
                        <TableCell className="text-sm">{r.toyota_patios?.nome ?? "—"}</TableCell>
                        <TableCell className="text-sm">{fmtAno(r)}</TableCell>
                        <TableCell className="text-sm">{fmtKm(r.quilometragem)}</TableCell>
                        <TableCell className="text-sm">{fmtDateShort(r.aprovado_em)}</TableCell>
                        <TableCell>{etapaBadge(r)}</TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {docBadge(laudoOk)}
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
                            {docBadge(hcOk)}
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
                            {docBadge(checklistOk)}
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
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {certOk ? (
                              <>
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <Award className="w-3 h-3 mr-1" />
                                  Emitido
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => abrirPath(r.certificado_pdf_path)}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : podeImportarCert ? (
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  setCertUploadTarget(r);
                                  setTimeout(() => certInputRef.current?.click(), 0);
                                }}
                                title="Importar certificado"
                              >
                                Pendente
                              </button>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-300 text-amber-700"
                                title={
                                  r.status_aprovacao === "certificado_toyota"
                                    ? "Somente administradores"
                                    : "Disponível após aprovação da Toyota"
                                }
                              >
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.codigo_tcuv ?? "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Detalhes"
                              onClick={() => setDetalhe(r)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir veículo"
                                onClick={() => setExcluir(r)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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

      <input
        ref={certInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          importarCertificadoInline(f);
          e.target.value = "";
        }}
      />

      <DetalhesModal
        row={detalhe}
        isAdmin={isAdmin}
        onClose={() => setDetalhe(null)}
        onUpdated={(nr) => {
          setRows((prev) => prev.map((r) => (r.id === nr.id ? nr : r)));
          setDetalhe(nr);
        }}
      />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O veículo{" "}
              <span className="font-mono">{excluir?.chassi}</span> e seus registros
              associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
