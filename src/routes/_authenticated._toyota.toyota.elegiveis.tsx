import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, ShieldCheck, Loader2, Search, Plus, Trash2, Wrench, XCircle } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const REVISOES_DISPONIVEIS = ["10k", "20k", "30k", "40k", "50k", "60k", "70k", "80k", "100k"];

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
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
  filial: { nome: string; dealer_number: string | null } | null;
}

function AnaliseElegiveis() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filtro, setFiltro] = useState("");
  const [confirmandoVeiculo, setConfirmandoVeiculo] = useState<Veiculo | null>(
    null,
  );
  const [filialDestinoId, setFilialDestinoId] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [hsvRevisoes, setHsvRevisoes] = useState<string[]>([]);
  const [hsvOS, setHsvOS] = useState<string[]>([""]);
  const [hsvObservacoes, setHsvObservacoes] = useState("");

  function toggleRevisao(r: string) {
    setHsvRevisoes((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  async function carregar() {
    setLoading(true);

    const [vRes, fRes] = await Promise.all([
      supabase
        .from("toyota_estoque_veiculos")
        .select(
          "id, chassi, placa, modelo, marca, ano_fabricacao, ano_modelo, quilometragem, status_cautelar, elegibilidade, status_aprovacao, filial_id, filial_destino_id, filial:toyota_filiais!toyota_estoque_veiculos_filial_id_fkey(nome, dealer_number)",
        )
        .in("elegibilidade", ["TCUV", "TSIM"])
        .eq("status_aprovacao", "analise")
        .order("importado_em", { ascending: false }),
      supabase
        .from("toyota_filiais")
        .select("id, nome, dealer_number")
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

  function iniciarAprovacao(v: Veiculo) {
    setConfirmandoVeiculo(v);
    setFilialDestinoId(v.filial_destino_id ?? v.filial_id);
    setHsvRevisoes([]);
    setHsvOS([""]);
    setHsvObservacoes("");
  }

  async function confirmarAprovacao() {
    if (!confirmandoVeiculo || !filialDestinoId) return;
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const osLimpas = hsvOS.map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        status_aprovacao: "pendente_preparacao",
        filial_destino_id: filialDestinoId,
        aprovado_por: userData.user?.id ?? null,
        aprovado_em: new Date().toISOString(),
        hsv_revisoes_pendentes: hsvRevisoes,
        hsv_os_ajustes: osLimpas,
        hsv_observacoes_preparador: hsvObservacoes.trim() || null,
      })
      .eq("id", confirmandoVeiculo.id);
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const filialNome =
      filiais.find((f) => f.id === filialDestinoId)?.nome ?? "filial";
    toast.success(`Veículo enviado para a fila de preparação de ${filialNome}.`);
    setConfirmandoVeiculo(null);
    setVeiculos((prev) =>
      prev.filter((v) => v.id !== confirmandoVeiculo.id),
    );
  }

  async function reprovarVeiculo(v: Veiculo) {
    if (!confirm(`Reprovar o veículo ${v.chassi}? Ele será finalizado e movido para o histórico.`)) return;
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
    toast.success("Veículo reprovado e movido para o histórico.");
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
              Apenas administradores do sistema podem acessar a análise de
              elegíveis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Análise de Elegíveis
        </h1>
        <p className="text-sm text-muted-foreground">
          Veículos pré-aprovados na importação aguardando direcionamento para a
          fila de preparação de uma loja.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">
            Pendentes de análise
            <span className="text-muted-foreground font-normal ml-2">
              ({veiculos.length})
            </span>
          </CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por chassi, placa, modelo ou filial..."
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
                    <TableHead>Filial origem</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">
                        {v.chassi}
                      </TableCell>
                      <TableCell className="font-mono">
                        {v.placa ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{v.modelo ?? "—"}</div>
                        {v.marca && (
                          <div className="text-xs text-muted-foreground">
                            {v.marca}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {v.ano_fabricacao && v.ano_modelo
                          ? `${v.ano_fabricacao}/${v.ano_modelo}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.quilometragem !== null
                          ? v.quilometragem.toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div>{v.filial?.nome ?? "—"}</div>
                        {v.filial?.dealer_number && (
                          <div className="text-xs text-muted-foreground">
                            {v.filial.dealer_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.elegibilidade === "TCUV" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            TCUV
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            TSIM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => iniciarAprovacao(v)}
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Aprovar para Preparação
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => reprovarVeiculo(v)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                              Reprovar (finalizar)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmandoVeiculo}
        onOpenChange={(o) => !o && setConfirmandoVeiculo(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar para Preparação</DialogTitle>
            <DialogDescription>
              Confirme o envio do veículo para a fila da loja. Preencha a
              Validação Técnica (HSV) com as pendências identificadas.
            </DialogDescription>
          </DialogHeader>

          {confirmandoVeiculo && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Chassi: </span>
                  <span className="font-mono">{confirmandoVeiculo.chassi}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modelo: </span>
                  {confirmandoVeiculo.modelo ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Filial origem: </span>
                  {confirmandoVeiculo.filial?.nome ?? "—"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Filial de destino</Label>
                <Select
                  value={filialDestinoId}
                  onValueChange={setFilialDestinoId}
                >
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">
                  Pré-selecionada com a filial de origem. Altere se desejar.
                </p>
              </div>

              {/* ============ Validação Técnica (HSV) ============ */}
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Validação Técnica (HSV)
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Revisões pendentes
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  <p className="text-xs text-muted-foreground">
                    Marque todas as revisões que precisam ser feitas antes da
                    certificação.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Ordens de Serviço (OS) para ajuste
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setHsvOS((p) => [...p, ""])}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar OS
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {hsvOS.map((os, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder={`Nº da OS ${idx + 1}`}
                          value={os}
                          onChange={(e) =>
                            setHsvOS((p) =>
                              p.map((v, i) => (i === idx ? e.target.value : v)),
                            )
                          }
                        />
                        {hsvOS.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setHsvOS((p) => p.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Observações para o Preparador
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder="Oriente o preparador sobre os ajustes necessários nas OSs, prioridade, contato responsável, etc."
                    value={hsvObservacoes}
                    onChange={(e) => setHsvObservacoes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}


          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmandoVeiculo(null)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAprovacao}
              disabled={salvando || !filialDestinoId}
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
