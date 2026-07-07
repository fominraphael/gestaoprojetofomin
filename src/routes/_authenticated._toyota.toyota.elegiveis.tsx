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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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

interface Patio {
  id: string;
  nome: string;
  filial_id: string | null;
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
  const [patios, setPatios] = useState<Patio[]>([]);
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
    const [vRes, fRes, pRes] = await Promise.all([
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
      supabase
        .from("toyota_patios")
        .select("id, nome, filial_id")
        .eq("ativo", true)
        .order("nome"),
    ]);
    if (vRes.error) toast.error("Falha ao carregar veículos.");
    if (fRes.error) toast.error("Falha ao carregar filiais.");
    if (pRes.error) toast.error("Falha ao carregar pátios.");
    setVeiculos(((vRes.data ?? []) as unknown) as Veiculo[]);
    setFiliais((fRes.data ?? []) as Filial[]);
    setPatios((pRes.data ?? []) as Patio[]);
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

  async function alterarPatio(v: Veiculo, novoPatioId: string) {
    if (novoPatioId === v.filial_id) return;
    const patio = patios.find((p) => p.id === novoPatioId);
    if (!patio) return;
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({ filial_id: novoPatioId })
      .eq("id", v.id);
    if (error) {
      toast.error(`Falha ao alterar pátio: ${error.message}`);
      return;
    }
    setVeiculos((prev) =>
      prev.map((x) =>
        x.id === v.id
          ? { ...x, filial_id: novoPatioId, filial: { nome: patio.nome, filial_id: patio.filial_id } }
          : x,
      ),
    );
    const filialNome = filiais.find((f) => f.id === patio.filial_id)?.nome ?? "—";
    toast.success(`Pátio atualizado. Filial: ${filialNome}.`);
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
          <TabsTrigger value="recusados">Recusados Toyota</TabsTrigger>
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
          <EnvioToyotaTab mode="envio" />
        </TabsContent>

        <TabsContent value="recusados" className="space-y-4">
          <EnvioToyotaTab mode="recusados" />
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
  dossie_storage?: {
    metadata: { size?: number; contentLength?: number } | null;
  } | null;
  tamanhos?: {
    checklist: number | null;
    laudo: number | null;
    health: number | null;
    dossie: number | null;
  };
  posvendas_km: number | null;
  posvendas_finalizado_em: string | null;
  posvendas_finalizado_por: string | null;
  filial_id: string | null;
  toyota_filiais: {
    dealer_number: string | null;
    nome_bi_toyota: string | null;
  } | null;
  motivo_reprovacao?: string | null;
  observacao_toyota?: string | null;
  retorno_toyota_em?: string | null;
}



function formatarBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "Tamanho indisponível";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EnvioToyotaTab({ mode = "envio" }: { mode?: "envio" | "recusados" } = {}) {
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<VeiculoEnvio[]>([]);
  const [gerando, setGerando] = useState<string | null>(null);
  const [tcuvInput, setTcuvInput] = useState<Record<string, string>>({});
  const [salvandoTcuv, setSalvandoTcuv] = useState<string | null>(null);
  const [arquivando, setArquivando] = useState<string | null>(null);
  const statusFiltro = mode === "recusados" ? "reprovado_toyota" : "aguardando_analise_central";

  const obterTamanhoStorage = async (path: string): Promise<number | null> => {
    const { data, error } = await supabase.storage
      .from("documentos")
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return null;
    try {
      const res = await fetch(data.signedUrl, { method: "HEAD" });
      const contentLength = res.headers.get("content-length");
      return contentLength ? Number(contentLength) : null;
    } catch (e) {
      console.warn("[EnvioToyotaTab] falha ao consultar tamanho do arquivo", e);
      return null;
    }
  };

  const obterTamanhoUrl = async (url: string): Promise<number | null> => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      const contentLength = res.headers.get("content-length");
      return contentLength ? Number(contentLength) : null;
    } catch {
      return null;
    }
  };

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("toyota_estoque_veiculos")
      .select(
        "id,chassi,placa,modelo,ano_modelo,elegibilidade,laudo_url,laudo_arquivo_path,health_check_pdf_path,checklist_data,checklist_pdf_path,checklist_itens,codigo_tcuv,dossie_pdf_path,posvendas_km,posvendas_finalizado_em,posvendas_finalizado_por,filial_id,filial_destino_id,motivo_reprovacao,observacao_toyota,retorno_toyota_em,toyota_filiais:filial_destino_id(dealer_number,nome_bi_toyota)",
      )
      .eq("status_aprovacao", statusFiltro)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[EnvioToyotaTab] carregar", error);
      toast.error(`Falha ao carregar envios: ${error.message}`);
    }
    const base = (data ?? []) as unknown as VeiculoEnvio[];
    const comTamanho = await Promise.all(
      base.map(async (v) => {
        const [checklist, laudo, health, dossie] = await Promise.all([
          v.checklist_pdf_path ? obterTamanhoStorage(v.checklist_pdf_path) : null,
          v.laudo_arquivo_path
            ? obterTamanhoStorage(v.laudo_arquivo_path)
            : v.laudo_url
              ? obterTamanhoUrl(v.laudo_url)
              : null,
          v.health_check_pdf_path ? obterTamanhoStorage(v.health_check_pdf_path) : null,
          v.dossie_pdf_path ? obterTamanhoStorage(v.dossie_pdf_path) : null,
        ]);
        return {
          ...v,
          dossie_storage: dossie ? { metadata: { size: dossie } } : null,
          tamanhos: { checklist, laudo, health, dossie },
        };
      }),
    );
    setVeiculos(comTamanho);
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


  async function gerarDossie(v: VeiculoEnvio, pularCompressao = false) {
    setGerando(v.id);
    try {
      const { error: invokeErr } = await supabase.functions.invoke(
        "gerar-dossie",
        { body: { veiculo_id: v.id, pular_compressao: pularCompressao } },
      );
      if (invokeErr) {
        toast.error(`Falha ao disparar geração do dossiê: ${invokeErr.message}`);
        return;
      }
      toast.info(
        pularCompressao
          ? "Unindo PDFs sem compressão..."
          : "Gerando dossiê em segundo plano...",
      );

      const dossieAntes = v.dossie_pdf_path;
      const inicio = Date.now();
      const TIMEOUT_MS = 90_000;
      let novoPath: string | null = null;
      while (Date.now() - inicio < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data } = await supabase
          .from("toyota_estoque_veiculos")
          .select("dossie_pdf_path")
          .eq("id", v.id)
          .maybeSingle();
        const atual = (data?.dossie_pdf_path as string | null) ?? null;
        if (atual && atual !== dossieAntes) {
          novoPath = atual;
          break;
        }
      }
      if (!novoPath) {
        toast.warning("Ainda gerando. Clique em atualizar em alguns instantes para consultar o resultado.");
        await carregar();
        return;
      }

      const { data: signed } = await supabase.storage
        .from("documentos")
        .createSignedUrl(novoPath, 600);
      if (signed?.signedUrl) window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
      toast.success(
        pularCompressao
          ? "PDFs unidos sem compressão. Baixe, comprima manualmente e reimporte se necessário."
          : "Dossiê gerado com sucesso.",
      );
      await carregar();
    } finally {
      setGerando(null);
    }
  }

  async function importarDossieManual(v: VeiculoEnvio, file: File) {
    setGerando(v.id);
    try {
      const path = `toyota/dossies/${v.id}/${Date.now()}-manual.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        toast.error(`Falha no upload: ${upErr.message}`);
        return;
      }
      const { error: updErr } = await supabase
        .from("toyota_estoque_veiculos")
        .update({ dossie_pdf_path: path, dossie_enviado_em: new Date().toISOString() })
        .eq("id", v.id);
      if (updErr) {
        toast.error(updErr.message);
        return;
      }
      toast.success("Dossiê importado com sucesso.");
      await carregar();
    } finally {
      setGerando(null);
    }
  }




  async function visualizarDossie(v: VeiculoEnvio) {
    if (!v.dossie_pdf_path) return;
    const { data: signed, error } = await supabase.storage
      .from("documentos")
      .createSignedUrl(v.dossie_pdf_path, 600);
    if (error || !signed?.signedUrl) {
      toast.error("Não foi possível abrir o dossiê.");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  }


  async function salvarTcuv(v: VeiculoEnvio) {
    const codigo = (tcuvInput[v.id] ?? "").trim();
    if (!codigo) {
      toast.error("Informe o Código TCUV.");
      return;
    }
    setSalvandoTcuv(v.id);
    // Unicidade: cada envio/reenvio à Toyota exige um código TCUV inédito.
    const { data: dup, error: dupErr } = await supabase
      .from("toyota_estoque_veiculos")
      .select("id, chassi")
      .eq("codigo_tcuv", codigo)
      .limit(1)
      .maybeSingle();
    if (dupErr) {
      setSalvandoTcuv(null);
      toast.error(`Falha ao validar código: ${dupErr.message}`);
      return;
    }
    if (dup) {
      setSalvandoTcuv(null);
      toast.error(
        dup.id === v.id
          ? "Este código já foi usado neste veículo em envio anterior. Gere um novo código."
          : `Código TCUV "${codigo}" já está em uso (chassi ${dup.chassi}). Informe um novo código.`,
      );
      return;
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        codigo_tcuv: codigo,
        status_aprovacao: "aguardando_analise_toyota",
        enviado_toyota_em: now,
        // Ao reenviar, limpa dados da recusa anterior.
        motivo_reprovacao: null,
        observacao_toyota: null,
        retorno_toyota_em: null,
      })
      .eq("id", v.id);
    setSalvandoTcuv(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviado à Toyota. Aguardando retorno na próxima importação da planilha.");
    setVeiculos((prev) => prev.filter((x) => x.id !== v.id));
  }

  async function arquivarVeiculo(v: VeiculoEnvio) {
    if (!confirm(`Arquivar o veículo ${v.chassi}? Ele deixará de aparecer nos fluxos ativos.`)) return;
    setArquivando(v.id);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({ status_aprovacao: "arquivado" })
      .eq("id", v.id);
    setArquivando(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Veículo arquivado.");
    setVeiculos((prev) => prev.filter((x) => x.id !== v.id));
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
          {mode === "recusados"
            ? "Nenhum veículo recusado pela Toyota no momento."
            : "Nenhum veículo aguardando envio à Toyota."}
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
          {mode === "recusados" ? "Recusados pela Toyota" : "Aguardando envio à Toyota"}
          <span className="text-muted-foreground font-normal ml-2">({veiculos.length})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === "recusados"
            ? "Analise o motivo da recusa, ajuste os documentos e reenvie com um NOVO código TCUV, ou arquive o processo."
            : "Revise cada documento individualmente. Você pode substituí-los livremente antes de gerar o Dossiê. O código TCUV e o envio final só ficam disponíveis após o Dossiê ser mesclado."}
        </p>
        <div className="pt-3">
          <Button size="sm" variant="outline" onClick={carregar} disabled={loading}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Atualizar lista
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {veiculos.map((v) => (
          <VeiculoEnvioCard
            key={v.id}
            v={v}
            mode={mode}
            gerando={gerando === v.id}
            salvandoTcuv={salvandoTcuv === v.id}
            arquivando={arquivando === v.id}
            tcuvValue={tcuvInput[v.id] ?? (mode === "recusados" ? "" : v.codigo_tcuv ?? "")}
            onTcuvChange={(val) =>
              setTcuvInput((p) => ({ ...p, [v.id]: val }))
            }
            onGerar={() => gerarDossie(v)}
            onGerarSemCompressao={() => gerarDossie(v, true)}
            onImportarManual={(file) => importarDossieManual(v, file)}
            onVisualizar={() => visualizarDossie(v)}
            onSalvarTcuv={() => salvarTcuv(v)}
            onArquivar={() => arquivarVeiculo(v)}
            onRefresh={carregar}
          />
        ))}
      </CardContent>
    </Card>
    </>
  );
}

/* ---------- Card individual do veículo no fluxo Envio Toyota ---------- */

interface VeiculoEnvioCardProps {
  v: VeiculoEnvio;
  mode: "envio" | "recusados";
  gerando: boolean;
  salvandoTcuv: boolean;
  arquivando: boolean;
  tcuvValue: string;
  onTcuvChange: (val: string) => void;
  onGerar: () => void;
  onGerarSemCompressao: () => void;
  onImportarManual: (file: File) => void | Promise<void>;
  onVisualizar: () => void;
  onSalvarTcuv: () => void;
  onArquivar: () => void;
  onRefresh: () => void | Promise<void>;
}

function VeiculoEnvioCard({
  v,
  mode,
  gerando,
  salvandoTcuv,
  arquivando,
  tcuvValue,
  onTcuvChange,
  onGerar,
  onGerarSemCompressao,
  onImportarManual,
  onVisualizar,
  onSalvarTcuv,
  onArquivar,
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
          {mode === "recusados" && (
            <Badge className="bg-red-100 text-red-700">Recusado Toyota</Badge>
          )}
        </div>
      </div>

      {mode === "recusados" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm space-y-1">
          <div className="font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Retorno da Toyota
          </div>
          {v.codigo_tcuv && (
            <div className="text-xs text-red-700">
              Código enviado anteriormente: <span className="font-mono">{v.codigo_tcuv}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-red-700 font-medium">Motivo: </span>
            <span className="text-red-900">{v.motivo_reprovacao || "—"}</span>
          </div>
          {v.observacao_toyota && (
            <div>
              <span className="text-xs text-red-700 font-medium">Observação: </span>
              <span className="text-red-900">{v.observacao_toyota}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <DocumentoSlot
          label="Check-list"
          descricao="Gerado a partir do template TCUV/TSIM"
          presente={checklistPresente}
          tamanhoBytes={v.tamanhos?.checklist}
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
          tamanhoBytes={v.tamanhos?.laudo}
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
          tamanhoBytes={v.tamanhos?.health}
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
        <div className="flex flex-wrap items-center gap-2">
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
            {gerando
              ? "Gerando..."
              : v.dossie_pdf_path
                ? "Regerar Dossiê"
                : "Gerar Dossiê"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onGerarSemCompressao}
            disabled={gerando || !podeGerar}
            title="Une os 3 PDFs sem chamar a compressão externa. Útil quando o serviço de compressão falha."
          >
            <FileStack className="w-3.5 h-3.5" />
            Unir sem compressão
          </Button>
          <label
            className={
              "inline-flex items-center gap-1 rounded-md border px-3 h-9 text-xs font-medium cursor-pointer hover:bg-slate-100 " +
              (gerando ? "opacity-50 pointer-events-none" : "")
            }
            title="Importar um dossiê PDF já pronto (por exemplo, comprimido manualmente)"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar dossiê
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await onImportarManual(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {!!v.dossie_pdf_path && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onVisualizar}
              disabled={gerando}
              title="Abrir / baixar o dossiê"
            >
              <Eye className="w-3.5 h-3.5" />
              Baixar Dossiê
            </Button>
          )}
          {!!v.dossie_pdf_path && (
            <Badge variant="outline">Dossiê: {formatarBytes(v.tamanhos?.dossie)}</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={
              mode === "recusados"
                ? "NOVO Código TCUV (obrigatório reenvio)"
                : "Código TCUV (ex: TCUV-2026-0001)"
            }
            value={tcuvValue}
            onChange={(e) => onTcuvChange(e.target.value)}
            className="w-64"
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
            {mode === "recusados" ? "Reenviar Toyota" : "Enviar / Concluir"}
          </Button>
          {mode === "recusados" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onArquivar}
              disabled={arquivando}
              className="border-slate-400 text-slate-700"
            >
              {arquivando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              Arquivar
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}

function DocumentoSlot({
  label,
  descricao,
  presente,
  tamanhoBytes,
  onVisualizar,
  onSubstituir,
}: {
  label: string;
  descricao: string;
  presente: boolean;
  tamanhoBytes?: number | null;
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
      <div className="text-xs font-medium">{formatarBytes(tamanhoBytes)}</div>
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
  const patch: Partial<
    Database["public"]["Tables"]["toyota_estoque_veiculos"]["Update"]
  > = { [coluna]: path } as Record<string, string>;
  if (coluna === "laudo_arquivo_path")
    (patch as { laudo_url?: string | null }).laudo_url = null;
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

