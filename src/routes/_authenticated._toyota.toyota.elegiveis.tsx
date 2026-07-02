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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

function AnaliseElegiveis() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filtro, setFiltro] = useState("");

  // Aprovar
  const [aprovando, setAprovando] = useState<Veiculo | null>(null);
  const [filialDestinoId, setFilialDestinoId] = useState<string>("");
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
          "id, chassi, placa, modelo, marca, ano_fabricacao, ano_modelo, quilometragem, status_cautelar, elegibilidade, status_aprovacao, filial_id, filial_destino_id, resultado_laudo, laudo_url, laudo_arquivo_path, hsv_status, hsv_revisoes_pendentes, hsv_os_ajustes, hsv_observacoes_preparador, filial:toyota_patios!toyota_estoque_veiculos_filial_id_fkey(nome, filial_id)",
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
    // Regra: precisa ter link OU arquivo anexado. Se resultado_laudo = 'reprovado',
    // ainda assim exige um anexo/link (o admin pode ter substituído o laudo).
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
        status_aprovacao: "reprovado_admin",
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
        <h1 className="text-2xl font-semibold tracking-tight">Análise de Elegíveis</h1>
        <p className="text-sm text-muted-foreground">
          Veículos pré-aprovados na importação aguardando validação de laudo, HSV e direcionamento para uma filial.
        </p>
      </header>

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
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
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
                              disabled={!aprovarHabilitado}
                              title={
                                aprovarHabilitado
                                  ? "Aprovar para preparação"
                                  : "Conclua HSV e anexe laudo válido"
                              }
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
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

      {/* Aprovação é 100% automática — sem seleção manual de filial */}


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
