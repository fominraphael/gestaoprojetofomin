import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  Search,
  Plus,
  Trash2,
  Wrench,
  Archive,
  Eye,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  FileStack,
  Send,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_authenticated/_toyota/toyota/elegiveis",
)({
  errorComponent: ModuleErrorBoundary,
  component: AnaliseElegiveis,
});

// Revisões de 10k a 230k em intervalos de 10k
const REVISOES_DISPONIVEIS = Array.from({ length: 23 }, (_, i) => `${(i + 1) * 10}k`);

interface Filial {
  id: string;
  nome: string;
}

interface Veiculo {
  id: string;
  chassi: string;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  quilometragem: number | null;
  status_cautelar: string | null;
  elegibilidade: "TCUV" | "TSIM" | "NAO_ELEGIVEL" | null;
  status_aprovacao: string;
  filial_id: string;
  filial_destino_id: string | null;
  filial: { nome: string; filial_id: string | null } | null;
  resultado_laudo: string | null;
  laudo_url: string | null;
  laudo_arquivo_path: string | null;
  hsv_status: string;
  hsv_revisoes_pendentes: string[] | null;
  hsv_os_ajustes: string[] | null;
  hsv_observacoes_preparador: string | null;
  retorno_toyota_em: string | null;
  observacao_toyota: string | null;
}

function AnaliseElegiveis() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filtro, setFiltro] = useState("");

  // Aprovar
  const [aprovando, setAprovando] = useState<Veiculo | null>(null);
  const [salvandoAprovar, setSalvandoAprovar] = useState(false);

  // HSV
  const [hsvVeiculo, setHsvVeiculo] = useState<Veiculo | null>(null);
  const [hsvRevisoes, setHsvRevisoes] = useState<string[]>([]);
  const [hsvOS, setHsvOS] = useState<string[]>([""]);
  const [hsvObservacoes, setHsvObservacoes] = useState("");
  const [salvandoHsv, setSalvandoHsv] = useState(false);

  // Laudo
  const [laudoVeiculo, setLaudoVeiculo] = useState<Veiculo | null>(null);
  const [laudoUrl, setLaudoUrl] = useState("");
  const [laudoFile, setLaudoFile] = useState<File | null>(null);
  const [salvandoLaudo, setSalvandoLaudo] = useState(false);

  async function carregar() {
    setLoading(true);
    const [vRes, fRes] = await Promise.all([
      supabase
        .from("toyota_estoque_veiculos")
        .select(
          "id, chassi, placa, modelo, marca, ano_fabricacao, ano_modelo, quilometragem, status_cautelar, elegibilidade, status_aprovacao, filial_id, filial_destino_id, resultado_laudo, laudo_url, laudo_arquivo_path, hsv_status, hsv_revisoes_pendentes, hsv_os_ajustes, hsv_observacoes_preparador, retorno_toyota_em, observacao_toyota, filial:toyota_patios!toyota_estoque_veiculos_filial_id_fkey(nome, filial_id)",
        )
        .in("elegibilidade", ["TCUV", "TSIM"])
        .eq("status_aprovacao", "analise")
        .order("importado_em", { ascending: false }),
      supabase
        .from("toyota_filiais")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome"),
    ]);
    if (vRes.error) toast.error("Falha ao carregar veículos.");
    if (fRes.error) toast.error("Falha ao carregar filiais.");
    setVeiculos(((vRes.data ?? []) as unknown) as Veiculo[]);
    setFiliais((fRes.data ?? []) as Filial[]);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return veiculos;
    return veiculos.filter(
      (v) =>
        v.chassi.toLowerCase().includes(q) ||
        (v.placa ?? "").toLowerCase().includes(q) ||
        (v.modelo ?? "").toLowerCase().includes(q) ||
        (v.filial?.nome ?? "").toLowerCase().includes(q),
    );
  }, [veiculos, filtro]);

  function laudoValido(v: Veiculo): boolean {
    // Se o laudo já veio aprovado (planilha ou marcação manual), libera sem exigir anexo.
    if (v.resultado_laudo === "aprovado") return true;
    // Caso contrário, exige link ou arquivo anexado.
    return !!(v.laudo_url || v.laudo_arquivo_path);
  }

  function podeAprovar(v: Veiculo): boolean {
    return v.hsv_status === "ok" && laudoValido(v);
  }

  async function abrirLaudo(v: Veiculo) {
    if (v.laudo_url) {
      window.open(v.laudo_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (v.laudo_arquivo_path) {
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(v.laudo_arquivo_path, 300);
      if (error || !data?.signedUrl) {
        toast.error("Não foi possível gerar o link do laudo.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info("Nenhum laudo anexado.");
  }

  // ============ LAUDO ============
  function iniciarLaudo(v: Veiculo) {
    setLaudoVeiculo(v);
    setLaudoUrl(v.laudo_url ?? "");
    setLaudoFile(null);
  }

  async function salvarLaudo() {
    if (!laudoVeiculo) return;
    if (!laudoUrl.trim() && !laudoFile) {
      toast.error("Informe um link ou anexe um arquivo do laudo.");
      return;
    }
    setSalvandoLaudo(true);
    try {
      let path = laudoVeiculo.laudo_arquivo_path;
      if (laudoFile) {
        const ext = laudoFile.name.split(".").pop() ?? "pdf";
        path = `toyota/laudos/${laudoVeiculo.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from("documentos")
          .upload(path, laudoFile, { upsert: true });
        if (up.error) {
          toast.error(up.error.message);
          setSalvandoLaudo(false);
          return;
        }
      }
      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .update({
          laudo_url: laudoUrl.trim() || null,
          laudo_arquivo_path: path,
          resultado_laudo: "aprovado",
        })
        .eq("id", laudoVeiculo.id);
      if (error) {
        toast.error(error.message);
        setSalvandoLaudo(false);
        return;
      }
      toast.success("Laudo atualizado.");
      setLaudoVeiculo(null);
      await carregar();
    } finally {
      setSalvandoLaudo(false);
    }
  }

  // ============ HSV ============
  function iniciarHsv(v: Veiculo) {
    setHsvVeiculo(v);
    setHsvRevisoes(v.hsv_revisoes_pendentes ?? []);
    setHsvOS(v.hsv_os_ajustes?.length ? v.hsv_os_ajustes : [""]);
    setHsvObservacoes(v.hsv_observacoes_preparador ?? "");
  }

  function toggleRevisao(r: string) {
    setHsvRevisoes((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  async function salvarHsv() {
    if (!hsvVeiculo) return;
    setSalvandoHsv(true);
    const { data: userData } = await supabase.auth.getUser();
    const osLimpas = hsvOS.map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        hsv_status: "ok",
        hsv_analisado_em: new Date().toISOString(),
        hsv_analisado_por: userData.user?.id ?? null,
        hsv_revisoes_pendentes: hsvRevisoes,
        hsv_os_ajustes: osLimpas,
        hsv_observacoes_preparador: hsvObservacoes.trim() || null,
      })
      .eq("id", hsvVeiculo.id);
    setSalvandoHsv(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("HSV validado.");
    setHsvVeiculo(null);
    await carregar();
  }

  // ============ APROVAR (automático — filial vem do pátio) ============
  async function iniciarAprovacao(v: Veiculo) {
    if (!podeAprovar(v)) {
      toast.error("Conclua o HSV e anexe um laudo válido antes de aprovar.");
      return;
    }
    const filialDestinoId = v.filial?.filial_id ?? null;
    if (!filialDestinoId) {
      toast.error("O pátio deste veículo não está vinculado a uma filial. Ajuste o cadastro do pátio.");
      return;
    }
    setAprovando(v);
    setSalvandoAprovar(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        status_aprovacao: "pendente_preparacao",
        filial_destino_id: filialDestinoId,
        aprovado_por: userData.user?.id ?? null,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", v.id);
    setSalvandoAprovar(false);
    setAprovando(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const filialNome = filiais.find((f) => f.id === filialDestinoId)?.nome ?? "filial de destino";
    toast.success(`Veículo enviado para a Fila do Pós-Vendas de ${filialNome}.`);
    setVeiculos((prev) => prev.filter((x) => x.id !== v.id));
  }

  async function arquivarVeiculo(v: Veiculo) {
    if (!confirm(`Arquivar o veículo ${v.chassi}? Ele será finalizado e movido para o histórico.`)) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        status_aprovacao: "arquivado",
        aprovado_por: userData.user?.id ?? null,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", v.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Veículo arquivado.");
    setVeiculos((prev) => prev.filter((x) => x.id !== v.id));
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Apenas administradores do sistema podem acessar a análise de elegíveis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Análise Central</h1>
        <p className="text-sm text-muted-foreground">
          Centralize a análise de elegibilidade e o envio final dos veículos para a Toyota.
        </p>
      </header>

      <Tabs defaultValue="elegibilidade" className="space-y-4">
        <TabsList>
          <TabsTrigger value="elegibilidade">Análise de Elegibilidade</TabsTrigger>
          <TabsTrigger value="envio">Envio Toyota</TabsTrigger>
        </TabsList>

        <TabsContent value="elegibilidade" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg">
                Pendentes de análise
                <span className="text-muted-foreground font-normal ml-2">({veiculos.length})</span>
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por chassi, placa, modelo ou pátio..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Nenhum veículo elegível aguardando análise.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chassi</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Ano</TableHead>
                        <TableHead className="text-right">KM</TableHead>
                        <TableHead>Pátio origem</TableHead>
                        <TableHead>Programa</TableHead>
                        <TableHead>Laudo</TableHead>
                        <TableHead>HSV</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((v) => {
                        const laudoOk = laudoValido(v);
                        const laudoStatus = v.resultado_laudo === "reprovado"
                          ? "Reprovado"
                          : v.resultado_laudo === "aprovado" || laudoOk
                            ? "Aprovado"
                            : "Pendente";
                        const hsvOk = v.hsv_status === "ok";
                        const aprovarHabilitado = podeAprovar(v);
                        return (
                          <TableRow key={v.id} className={v.retorno_toyota_em ? "bg-red-50/60" : ""}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span>{v.chassi}</span>
                                {v.retorno_toyota_em && (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100" title={v.observacao_toyota ?? undefined}>
                                    Recusado Toyota
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{v.placa ?? "—"}</TableCell>
                            <TableCell>
                              <div className="font-medium">{v.modelo ?? "—"}</div>
                              {v.marca && <div className="text-xs text-muted-foreground">{v.marca}</div>}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {v.quilometragem !== null ? v.quilometragem.toLocaleString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell>{v.filial?.nome ?? "—"}</TableCell>
                            <TableCell>
                              {v.elegibilidade === "TCUV" ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">TCUV</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">TSIM</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={
                                    laudoStatus === "Aprovado"
                                      ? "border-emerald-300 text-emerald-700"
                                      : laudoStatus === "Reprovado"
                                        ? "border-red-300 text-red-700"
                                        : "border-amber-300 text-amber-700"
                                  }
                                >
                                  {laudoStatus}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => abrirLaudo(v)}
                                  disabled={!laudoOk}
                                  title={laudoOk ? "Visualizar laudo" : "Nenhum laudo anexado"}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => iniciarLaudo(v)}
                                  title="Anexar/atualizar laudo"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={hsvOk ? "outline" : "ghost"}
                                size="sm"
                                onClick={() => iniciarHsv(v)}
                                className={hsvOk ? "border-emerald-300 text-emerald-700" : "text-red-600 font-semibold"}
                              >
                                {hsvOk ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5" /> Pendente
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => iniciarAprovacao(v)}
                                  disabled={!aprovarHabilitado || (salvandoAprovar && aprovando?.id === v.id)}
                                  title={
                                    aprovarHabilitado
                                      ? "Aprovar para preparação"
                                      : "Conclua HSV e anexe laudo válido"
                                  }
                                >
                                  {salvandoAprovar && aprovando?.id === v.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                  Aprovar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => arquivarVeiculo(v)}>
                                  <Archive className="w-3.5 h-3.5" />
                                  Arquivar
                                </Button>
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
        </TabsContent>

        <TabsContent value="envio" className="space-y-4">
          <EnvioToyotaTab />
        </TabsContent>
      </Tabs>



      {/* =============== HSV =============== */}
      <Dialog open={!!hsvVeiculo} onOpenChange={(o) => !o && setHsvVeiculo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Validação Técnica (HSV)
            </DialogTitle>
            <DialogDescription>
              Marque as revisões necessárias, informe as OS e observações. O "OK" indica que a análise foi concluída.
            </DialogDescription>
          </DialogHeader>
          {hsvVeiculo && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Revisões pendentes (até 230k)</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto rounded-md border p-2">
                  {REVISOES_DISPONIVEIS.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded-md border px-2 py-1.5 hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={hsvRevisoes.includes(r)}
                        onCheckedChange={() => toggleRevisao(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Ordens de Serviço (OS) para ajuste</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setHsvOS((p) => [...p, ""])}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar OS
                  </Button>
                </div>
                <div className="space-y-2">
                  {hsvOS.map((os, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`Nº da OS ${idx + 1}`}
                        value={os}
                        onChange={(e) =>
                          setHsvOS((p) => p.map((v, i) => (i === idx ? e.target.value : v)))
                        }
                      />
                      {hsvOS.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setHsvOS((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Observação (visível no Pós-Vendas)</Label>
                <Textarea
                  rows={4}
                  placeholder="Oriente o preparador e o pós-vendas sobre ajustes necessários, prioridades e responsáveis."
                  value={hsvObservacoes}
                  onChange={(e) => setHsvObservacoes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHsvVeiculo(null)} disabled={salvandoHsv}>
              Cancelar
            </Button>
            <Button onClick={salvarHsv} disabled={salvandoHsv}>
              {salvandoHsv && <Loader2 className="w-4 h-4 animate-spin" />}
              Concluir HSV (OK)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============== LAUDO =============== */}
      <Dialog open={!!laudoVeiculo} onOpenChange={(o) => !o && setLaudoVeiculo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexar Laudo</DialogTitle>
            <DialogDescription>
              Insira um link válido ou envie o arquivo do laudo. Pelo menos um dos dois é obrigatório.
            </DialogDescription>
          </DialogHeader>
          {laudoVeiculo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5" /> Link do laudo
                </Label>
                <Input
                  placeholder="https://..."
                  value={laudoUrl}
                  onChange={(e) => setLaudoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" /> Arquivo do laudo
                </Label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setLaudoFile(e.target.files?.[0] ?? null)}
                />
                {laudoVeiculo.laudo_arquivo_path && !laudoFile && (
                  <p className="text-xs text-muted-foreground">
                    Já existe um arquivo anexado. Envie outro apenas se quiser substituí-lo.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaudoVeiculo(null)} disabled={salvandoLaudo}>
              Cancelar
            </Button>
            <Button onClick={salvarLaudo} disabled={salvandoLaudo}>
              {salvandoLaudo && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar laudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Aba "Envio Toyota" — dossiê, mesclagem e código TCUV
// ============================================================================

interface VeiculoEnvio {
  id: string;
  chassi: string;
  placa: string | null;
  modelo: string | null;
  ano_modelo: number | null;
  elegibilidade: string | null;
  laudo_url: string | null;
  laudo_arquivo_path: string | null;
  health_check_pdf_path: string | null;
  checklist_data: { observacoes?: string; preenchido_em?: string } | null;
  checklist_pdf_path: string | null;
  checklist_itens: Record<string, "" | "✓" | "N/A"> | null;
  codigo_tcuv: string | null;
  dossie_pdf_path: string | null;
  posvendas_km: number | null;
  posvendas_finalizado_em: string | null;
  posvendas_finalizado_por: string | null;
  filial_id: string | null;
  toyota_filiais: {
    dealer_number: string | null;
    nome_bi_toyota: string | null;
  } | null;
}

const MAX_DOSSIE_BYTES = 3 * 1024 * 1024;

function EnvioToyotaTab() {
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<VeiculoEnvio[]>([]);
  const [gerando, setGerando] = useState<string | null>(null);
  const [tcuvInput, setTcuvInput] = useState<Record<string, string>>({});
  const [salvandoTcuv, setSalvandoTcuv] = useState<string | null>(null);
  const [recusaVeic, setRecusaVeic] = useState<VeiculoEnvio | null>(null);
  const [recusaMotivo, setRecusaMotivo] = useState("");
  const [salvandoRecusa, setSalvandoRecusa] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("toyota_estoque_veiculos")
      .select(
        "id,chassi,placa,modelo,ano_modelo,elegibilidade,laudo_url,laudo_arquivo_path,health_check_pdf_path,checklist_data,checklist_pdf_path,checklist_itens,codigo_tcuv,dossie_pdf_path,posvendas_km,posvendas_finalizado_em,posvendas_finalizado_por,filial_id,filial_destino_id,toyota_filiais:filial_destino_id(dealer_number,nome_bi_toyota)",
      )
      .eq("status_aprovacao", "aguardando_analise_central")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[EnvioToyotaTab] carregar", error);
      toast.error(`Falha ao carregar envios: ${error.message}`);
    }
    setVeiculos((data ?? []) as unknown as VeiculoEnvio[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  async function baixarBytes(path: string): Promise<ArrayBuffer | null> {
    const { data, error } = await supabase.storage.from("documentos").download(path);
    if (error || !data) return null;
    return await data.arrayBuffer();
  }

  async function baixarUrl(url: string): Promise<ArrayBuffer | null> {
    // Tenta fetch direto no browser (funciona quando o host aceita CORS).
    try {
      const res = await fetch(url);
      if (res.ok) return await res.arrayBuffer();
    } catch {
      /* CORS ou rede — tenta via server function */
    }
    // Fallback: baixa via server function (bypass de CORS).
    try {
      const { fetchRemotePdf } = await import("@/lib/remote-pdf.functions");
      const out = await fetchRemotePdf({ data: { url } });
      const bin = atob(out.base64);
      const buf = new ArrayBuffer(bin.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
      return buf;
    } catch (e) {
      console.warn("[dossie] Falha ao baixar laudo por URL:", e);
      return null;
    }
  }

  async function gerarPdfChecklist(v: VeiculoEnvio): Promise<Uint8Array> {
    const {
      gerarChecklistPreenchido,
      detectarTipoTemplate,
      formatarDataHora,
      formatarModeloComAno,
      formatarKm,
    } = await import("@/lib/checklist-template");
    const tipo = detectarTipoTemplate(v.elegibilidade);
    if (!tipo) {
      throw new Error(
        `Elegibilidade "${v.elegibilidade ?? "—"}" não corresponde a TCUV nem TSIM.`,
      );
    }
    const { data, hora } = formatarDataHora(v.posvendas_finalizado_em);
    const km = formatarKm(v.posvendas_km);
    const responsavel = v.posvendas_finalizado_por ?? "";
    return gerarChecklistPreenchido(
      tipo,
      {
        modelo: v.modelo ?? "",
        veiculoAnoModelo: formatarModeloComAno(v.modelo, v.ano_modelo),
        chassi: v.chassi,
        km,
        dn: v.toyota_filiais?.dealer_number ?? "",
        nomeDistribuidor: v.toyota_filiais?.nome_bi_toyota ?? "",
        avaliadorResponsavel: responsavel,
        tecnicoResponsavel: responsavel,
        data,
        hora,
      },
    );
  }


  async function gerarDossie(v: VeiculoEnvio) {
    setGerando(v.id);
    try {
      const { mesclarPdfs } = await import("@/lib/pdf-utils");
      const pdfs: ArrayBuffer[] = [];

      // 1º) Check-list — SEMPRE preenche sobre o Template Oficial (TCUV/TSIM)
      //     carimbando "X" em todas as checkboxes (modo homologação).
      let clBytes: ArrayBuffer | null = null;
      if (!clBytes) {
        try {
          const cl = await gerarPdfChecklist(v);
          const buf = new ArrayBuffer(cl.byteLength);
          new Uint8Array(buf).set(cl);
          clBytes = buf;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Falha ao gerar check-list.";
          toast.error(msg);
          return;
        }
      }
      if (clBytes) pdfs.push(clBytes);

      // 2º) Laudo Cautelar
      if (v.laudo_arquivo_path) {
        const b = await baixarBytes(v.laudo_arquivo_path);
        if (b) pdfs.push(b);
      } else if (v.laudo_url) {
        const b = await baixarUrl(v.laudo_url);
        if (b) pdfs.push(b);
      }

      // 3º) Health Check
      if (v.health_check_pdf_path) {
        const b = await baixarBytes(v.health_check_pdf_path);
        if (b) pdfs.push(b);
      }

      if (pdfs.length === 0) {
        toast.error("Nenhum documento disponível para gerar o dossiê.");
        return;
      }

      let merged = await mesclarPdfs(pdfs);
      // Compressão: se ultrapassar 3MB, refaz a mesclagem com object streams
      // e sem metadados, tentando enquadrar no limite da Toyota.
      if (merged.byteLength > MAX_DOSSIE_BYTES) {
        try {
          const { PDFDocument } = await import("pdf-lib");
          const compact = await PDFDocument.load(merged, { ignoreEncryption: true });
          compact.setTitle("");
          compact.setAuthor("");
          compact.setSubject("");
          compact.setKeywords([]);
          compact.setProducer("");
          compact.setCreator("");
          merged = await compact.save({ useObjectStreams: true, addDefaultPage: false });
        } catch (e) {
          console.warn("Falha na compressão adicional:", e);
        }
      }

      const excedeu = merged.byteLength > MAX_DOSSIE_BYTES;

      const path = `toyota/dossies/${v.id}/${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, new Blob([merged as unknown as BlobPart], { type: "application/pdf" }), {
          upsert: true,
          contentType: "application/pdf",
        });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      await supabase
        .from("toyota_estoque_veiculos")
        .update({ dossie_pdf_path: path, dossie_enviado_em: new Date().toISOString() })
        .eq("id", v.id);

      const { data: signed } = await supabase.storage
        .from("documentos")
        .createSignedUrl(path, 600);
      if (signed?.signedUrl) window.open(signed.signedUrl, "_blank", "noopener,noreferrer");

      const sizeMb = (merged.byteLength / 1024 / 1024).toFixed(2);
      if (excedeu) {
        toast.warning(
          `Dossiê gerado (${sizeMb}MB) — excede o limite de 3MB da Toyota mesmo após compressão. Otimize os PDFs originais.`,
        );
      } else {
        toast.success(`Dossiê gerado com sucesso (${sizeMb}MB).`);
      }
      await carregar();
    } finally {
      setGerando(null);
    }
  }

  async function salvarTcuv(v: VeiculoEnvio) {
    const codigo = (tcuvInput[v.id] ?? "").trim();
    if (!codigo) {
      toast.error("Informe o Código TCUV.");
      return;
    }
    setSalvandoTcuv(v.id);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({ codigo_tcuv: codigo, status_aprovacao: "certificado_toyota" })
      .eq("id", v.id);
    setSalvandoTcuv(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Código TCUV salvo. Processo finalizado.");
    setVeiculos((prev) => prev.filter((x) => x.id !== v.id));
  }

  async function confirmarRecusa() {
    if (!recusaVeic) return;
    const motivo = recusaMotivo.trim();
    if (!motivo) {
      toast.error("Informe o motivo da recusa.");
      return;
    }
    setSalvandoRecusa(true);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        status_aprovacao: "analise",
        retorno_toyota_em: new Date().toISOString(),
        observacao_toyota: motivo,
      })
      .eq("id", recusaVeic.id);
    setSalvandoRecusa(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Recusa registrada. Veículo retornou para a Análise Central.");
    setVeiculos((prev) => prev.filter((x) => x.id !== recusaVeic.id));
    setRecusaVeic(null);
    setRecusaMotivo("");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (veiculos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum veículo aguardando envio à Toyota.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {gerando && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <Card className="max-w-sm">
            <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-semibold">Gerando Dossiê... Aguarde</p>
                <p className="text-xs text-muted-foreground">
                  Mesclando Check-list, Laudo e Health Check. Não feche esta janela.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Aguardando envio à Toyota
          <span className="text-muted-foreground font-normal ml-2">({veiculos.length})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Revise cada documento individualmente. Você pode substituí-los livremente antes de gerar o Dossiê.
          O código TCUV e o envio final só ficam disponíveis após o Dossiê ser mesclado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {veiculos.map((v) => (
          <VeiculoEnvioCard
            key={v.id}
            v={v}
            gerando={gerando === v.id}
            salvandoTcuv={salvandoTcuv === v.id}
            tcuvValue={tcuvInput[v.id] ?? v.codigo_tcuv ?? ""}
            onTcuvChange={(val) =>
              setTcuvInput((p) => ({ ...p, [v.id]: val }))
            }
            onGerar={() => gerarDossie(v)}
            onSalvarTcuv={() => salvarTcuv(v)}
            onRecusar={() => {
              setRecusaVeic(v);
              setRecusaMotivo("");
            }}
            onRefresh={carregar}
          />
        ))}
      </CardContent>
    </Card>


    <Dialog open={!!recusaVeic} onOpenChange={(o) => !o && setRecusaVeic(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar recusa da Toyota</DialogTitle>
          <DialogDescription>
            O veículo retornará para a <strong>Análise Central</strong> com destaque.
            O Administrador poderá revisar e reenviar ou arquivar definitivamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-recusa">Motivo / observação da Toyota</Label>
          <Textarea
            id="motivo-recusa"
            value={recusaMotivo}
            onChange={(e) => setRecusaMotivo(e.target.value)}
            placeholder="Ex.: pendência de documentação, item reprovado no check-list, etc."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRecusaVeic(null)} disabled={salvandoRecusa}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmarRecusa} disabled={salvandoRecusa}>
            {salvandoRecusa && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirmar recusa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/* ---------- Card individual do veículo no fluxo Envio Toyota ---------- */

interface VeiculoEnvioCardProps {
  v: VeiculoEnvio;
  gerando: boolean;
  salvandoTcuv: boolean;
  tcuvValue: string;
  onTcuvChange: (val: string) => void;
  onGerar: () => void;
  onSalvarTcuv: () => void;
  onRecusar: () => void;
  onRefresh: () => void | Promise<void>;
}

function VeiculoEnvioCard({
  v,
  gerando,
  salvandoTcuv,
  tcuvValue,
  onTcuvChange,
  onGerar,
  onSalvarTcuv,
  onRecusar,
  onRefresh,
}: VeiculoEnvioCardProps) {
  const laudoPresente = !!(v.laudo_arquivo_path || v.laudo_url);
  const healthPresente = !!v.health_check_pdf_path;
  const checklistPresente = !!v.checklist_pdf_path || !!v.checklist_data?.preenchido_em;
  const podeGerar = laudoPresente && healthPresente; // checklist é gerado on-the-fly
  const dossieOk = !!v.dossie_pdf_path;

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{v.modelo ?? "—"}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {v.chassi} · {v.placa ?? "—"} · {v.ano_modelo ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{v.elegibilidade ?? "—"}</Badge>
          {dossieOk ? (
            <Badge className="bg-emerald-100 text-emerald-700">Dossiê gerado</Badge>
          ) : (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              Dossiê pendente
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <DocumentoSlot
          label="Check-list"
          descricao="Gerado a partir do template TCUV/TSIM"
          presente={checklistPresente}
          onVisualizar={
            v.checklist_pdf_path
              ? () => abrirPathStorage(v.checklist_pdf_path!)
              : undefined
          }
          onSubstituir={async (file) => {
            const path = `toyota/checklist/${v.id}/${Date.now()}.pdf`;
            await uploadDocumento(path, file, "checklist_pdf_path", v.id);
            await onRefresh();
          }}
        />
        <DocumentoSlot
          label="Laudo Cautelar"
          descricao={
            v.laudo_arquivo_path
              ? "Anexo interno"
              : v.laudo_url
                ? "Link externo"
                : "Não anexado"
          }
          presente={laudoPresente}
          onVisualizar={
            v.laudo_arquivo_path
              ? () => abrirPathStorage(v.laudo_arquivo_path!)
              : v.laudo_url
                ? () => window.open(v.laudo_url!, "_blank", "noopener,noreferrer")
                : undefined
          }
          onSubstituir={async (file) => {
            const path = `toyota/laudos/${v.id}/${Date.now()}.pdf`;
            await uploadDocumento(path, file, "laudo_arquivo_path", v.id);
            await onRefresh();
          }}
        />
        <DocumentoSlot
          label="Health Check"
          descricao="Revisão Toyota"
          presente={healthPresente}
          onVisualizar={
            v.health_check_pdf_path
              ? () => abrirPathStorage(v.health_check_pdf_path!)
              : undefined
          }
          onSubstituir={async (file) => {
            const path = `toyota/health/${v.id}/${Date.now()}.pdf`;
            await uploadDocumento(path, file, "health_check_pdf_path", v.id);
            await onRefresh();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
        <Button
          size="sm"
          variant="outline"
          onClick={onGerar}
          disabled={gerando || !podeGerar}
          title={podeGerar ? undefined : "Anexe Laudo e Health Check antes de gerar o Dossiê"}
        >
          {gerando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileStack className="w-3.5 h-3.5" />
          )}
          {dossieOk ? "Regerar Dossiê" : "Gerar Dossiê"}
        </Button>

        {dossieOk ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Código TCUV (ex: TCUV-2026-0001)"
              value={tcuvValue}
              onChange={(e) => onTcuvChange(e.target.value)}
              className="w-56"
            />
            <Button
              size="sm"
              onClick={onSalvarTcuv}
              disabled={salvandoTcuv || !tcuvValue.trim()}
            >
              {salvandoTcuv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Enviar / Concluir
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onRecusar}
              title="Registrar recusa da Toyota"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Registrar Recusa
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Gere o Dossiê para liberar o envio final e o Código TCUV.
          </span>
        )}
      </div>
    </div>
  );
}

function DocumentoSlot({
  label,
  descricao,
  presente,
  onVisualizar,
  onSubstituir,
}: {
  label: string;
  descricao: string;
  presente: boolean;
  onVisualizar?: () => void;
  onSubstituir: (file: File) => void | Promise<void>;
}) {
  const inputId = `subst-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div className="rounded-md border p-3 text-sm space-y-2 bg-slate-50/40">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        {presente ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      <div className="text-xs text-muted-foreground">{descricao}</div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onVisualizar}
          disabled={!onVisualizar || !presente}
        >
          <Eye className="w-3.5 h-3.5" />
          Visualizar
        </Button>
        <label
          htmlFor={inputId}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border px-3 h-9 text-xs font-medium cursor-pointer hover:bg-slate-100"
        >
          <Upload className="w-3.5 h-3.5" />
          Substituir
          <input
            id={inputId}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await onSubstituir(file);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

async function abrirPathStorage(path: string) {
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function uploadDocumento(
  path: string,
  file: File,
  coluna:
    | "checklist_pdf_path"
    | "laudo_arquivo_path"
    | "health_check_pdf_path",
  veiculoId: string,
) {
  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (upErr) {
    toast.error(`Falha ao enviar arquivo: ${upErr.message}`);
    return;
  }
  const patch: Record<string, string | null> = { [coluna]: path };
  if (coluna === "laudo_arquivo_path") patch.laudo_url = null;
  const { error } = await supabase
    .from("toyota_estoque_veiculos")
    .update(patch)
    .eq("id", veiculoId);
  if (error) {
    toast.error(error.message);
    return;
  }
  toast.success("Documento substituído.");
}

