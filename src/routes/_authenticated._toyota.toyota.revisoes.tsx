import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Loader2,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { perfilFromTipoUsuario } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/revisoes")({
  component: RevisoesPage,
  errorComponent: ModuleErrorBoundary,
});

interface Revisao {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  placa: string;
  modelo: string;
  chassi: string;
  km_atual: number | null;
  km_validado_mecanico: number | null;
  revisao: boolean | null;
  certificacao: boolean | null;
  prioridade: string | null;
  observacao_seminovos: string | null;
  status: string | null;
  filial_id: string | null;
  solicitante_id: string | null;
  consultor_seminovos: string;
  gestora_id: string | null;
  data_aprovacao: string | null;
  observacao_gestora: string | null;
  mecanico_id: string | null;
  numero_os: string | null;
  tipo_os: string | null;
  data_inicio_execucao: string | null;
  observacao_mecanico: string | null;
  data_finalizacao: string | null;
  observacao_finalizacao: string | null;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  aguardando_aprovacao: {
    label: "Aguardando Aprovação",
    cls: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
  devolvido_seminovos: {
    label: "Devolvido",
    cls: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  },
  cancelado: {
    label: "Cancelado",
    cls: "bg-red-500/10 border-red-500/20 text-red-400",
  },
  aprovado_pos_vendas: {
    label: "Aprovado — Na Fila da Oficina",
    cls: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  em_execucao: {
    label: "Em Execução",
    cls: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  },
  finalizado: {
    label: "Finalizado",
    cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  },
};

const PRIORIDADES: Record<string, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "bg-slate-500/10 text-slate-400" },
  normal: { label: "Normal", cls: "bg-muted text-muted-foreground" },
  alta: { label: "Alta", cls: "bg-orange-500/10 text-orange-400" },
  urgente: { label: "Urgente", cls: "bg-red-500/10 text-red-400" },
};

function RevisoesPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const perfil = perfilFromTipoUsuario(user?.tipo_usuario);

  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [filiaisVinculadas, setFiliaisVinculadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"minhas" | "aprovacao" | "historico">("minhas");

  // Dialog states
  const [dialogAprovar, setDialogAprovar] = useState<Revisao | null>(null);
  const [dialogDevolver, setDialogDevolver] = useState<Revisao | null>(null);
  const [dialogCancelar, setDialogCancelar] = useState<Revisao | null>(null);
  const [dialogDetalhe, setDialogDetalhe] = useState<Revisao | null>(null);
  const [dialogReenviar, setDialogReenviar] = useState<Revisao | null>(null);

  const [obsGestora, setObsGestora] = useState("");
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [confirmadoAprovacao, setConfirmadoAprovacao] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Reenviar states
  const [reenviarKm, setReenviarKm] = useState("");
  const [reenviarObs, setReenviarObs] = useState("");
  const [reenviarFilial, setReenviarFilial] = useState("");

  const podeAprovar = isAdmin || perfil === "Administrador" || perfil === "Gestor de Seminovos";
  const podeCriar = isAdmin || perfil === "Administrador" || perfil === "Vendedor de Seminovos";

  const carregar = async () => {
    setLoading(true);
    const [resRevisoes, resVinculos] = await Promise.all([
      supabase
        .from("toyota_revisoes")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("toyota_usuario_filial")
        .select("filial_id")
        .eq("user_id", user?.id ?? ""),
    ]);

    setRevisoes((resRevisoes.data ?? []) as Revisao[]);
    setFiliaisVinculadas((resVinculos.data ?? []).map((v) => v.filial_id));
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filialVisivel = (r: Revisao) => {
    if (isAdmin || perfil === "Administrador") return true;
    if (!r.filial_id) return true;
    return filiaisVinculadas.includes(r.filial_id);
  };

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    let base = revisoes.filter(filialVisivel);

    if (aba === "minhas") {
      base = base.filter((r) => r.solicitante_id === user?.id);
    } else if (aba === "aprovacao") {
      base = base.filter((r) => r.status === "aguardando_aprovacao");
    }

    if (!t) return base;
    return base.filter((r) =>
      [r.placa, r.modelo, r.chassi, r.consultor_seminovos]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t)),
    );
  }, [revisoes, busca, aba, filiaisVinculadas, user, isAdmin, perfil]);

  const contadores = useMemo(() => {
    const visiveis = revisoes.filter(filialVisivel);
    return {
      aguardando: visiveis.filter((r) => r.status === "aguardando_aprovacao").length,
      emExecucao: visiveis.filter((r) => r.status === "em_execucao").length,
      finalizadosMes: visiveis.filter((r) => {
        if (r.status !== "finalizado" || !r.data_finalizacao) return false;
        const d = new Date(r.data_finalizacao);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      totalMes: visiveis.filter((r) => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [revisoes, filiaisVinculadas, isAdmin, perfil]);

  const handleAprovar = async () => {
    if (!dialogAprovar || !confirmadoAprovacao) return;
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("toyota_revisoes")
        .update({
          status: "aprovado_pos_vendas",
          gestora_id: user?.id ?? null,
          data_aprovacao: new Date().toISOString(),
          observacao_gestora: obsGestora.trim() || null,
        })
        .eq("id", dialogAprovar.id);
      if (error) throw error;
      toast.success("Solicitação aprovada e enviada para a Oficina.");
      setDialogAprovar(null);
      setObsGestora("");
      setConfirmadoAprovacao(false);
      await carregar();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar.");
    } finally {
      setProcessando(false);
    }
  };

  const handleDevolver = async () => {
    if (!dialogDevolver || !motivoDevolucao.trim()) {
      return toast.error("Informe o motivo da devolução.");
    }
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("toyota_revisoes")
        .update({
          status: "devolvido_seminovos",
          observacao_gestora: motivoDevolucao.trim(),
        })
        .eq("id", dialogDevolver.id);
      if (error) throw error;
      toast.success("Solicitação devolvida ao Vendedor.");
      setDialogDevolver(null);
      setMotivoDevolucao("");
      await carregar();
    } catch (err: any) {
      toast.error(err.message || "Erro ao devolver.");
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelar = async () => {
    if (!dialogCancelar || !motivoCancelamento.trim()) {
      return toast.error("Informe o motivo do cancelamento.");
    }
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("toyota_revisoes")
        .update({
          status: "cancelado",
          observacao_gestora: motivoCancelamento.trim(),
        })
        .eq("id", dialogCancelar.id);
      if (error) throw error;
      toast.success("Solicitação cancelada.");
      setDialogCancelar(null);
      setMotivoCancelamento("");
      await carregar();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar.");
    } finally {
      setProcessando(false);
    }
  };

  const handleReenviar = async () => {
    if (!dialogReenviar) return;
    setProcessando(true);
    try {
      const payload: {
        status: "aguardando_aprovacao";
        observacao_seminovos: string | null;
        km_atual?: number;
        filial_id?: string;
      } = {
        status: "aguardando_aprovacao",
        observacao_seminovos: reenviarObs.trim() || dialogReenviar.observacao_seminovos,
      };
      if (reenviarKm) payload.km_atual = Number(reenviarKm.replace(/\D/g, ""));
      if (reenviarFilial) payload.filial_id = reenviarFilial;

      const { error } = await supabase
        .from("toyota_revisoes")
        .update(payload)
        .eq("id", dialogReenviar.id);
      if (error) throw error;
      toast.success("Solicitação reenviada para aprovação.");
      setDialogReenviar(null);
      setReenviarKm("");
      setReenviarObs("");
      setReenviarFilial("");
      await carregar();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reenviar.");
    } finally {
      setProcessando(false);
    }
  };

  const formatarData = (s: string | null) =>
    s ? new Date(s).toLocaleString("pt-BR") : "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" /> Revisão de Seminovos
          </h1>
          <p className="text-sm text-muted-foreground">
            Detalhe como está funcionando o fluxo de solicitação revisão, sem processo de certificação.
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => navigate({ to: "/toyota/revisoes/nova" })}>
            <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
          </Button>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Aguardando Aprovação", value: contadores.aguardando, color: "text-amber-400" },
          { label: "Em Execução", value: contadores.emExecucao, color: "text-violet-400" },
          { label: "Finalizados (Mês)", value: contadores.finalizadosMes, color: "text-emerald-400" },
          { label: "Total (Mês)", value: contadores.totalMes, color: "text-foreground" },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="py-3 px-4 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-4 overflow-x-auto">
        {(podeAprovar
          ? (["minhas", "aprovacao", "historico"] as const)
          : (["minhas", "historico"] as const)
        ).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`pb-3 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap ${
              aba === t
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t === "minhas" && "Minhas Solicitações"}
            {t === "aprovacao" && `Aguardando Aprovação (${contadores.aguardando})`}
            {t === "historico" && "Histórico"}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa, modelo, chassi..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((r) => {
            const st = STATUS_LABELS[r.status ?? ""] ?? {
              label: r.status ?? "—",
              cls: "bg-muted text-muted-foreground",
            };
            const pr = PRIORIDADES[r.prioridade ?? "normal"] ?? PRIORIDADES.normal;
            const isOwner = r.solicitante_id === user?.id;
            const isDevolvido = r.status === "devolvido_seminovos" && isOwner;

            return (
              <Card key={r.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{r.placa}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.modelo}
                        </Badge>
                        <Badge className={`text-[10px] border ${st.cls}`}>{st.label}</Badge>
                        <Badge className={`text-[10px] ${pr.cls}`}>{pr.label}</Badge>
                        {r.revisao && (
                          <Badge variant="outline" className="text-[10px]">
                            Revisão
                          </Badge>
                        )}
                        {r.certificacao && (
                          <Badge variant="outline" className="text-[10px]">
                            Certificação
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Chassi: {r.chassi} · KM: {r.km_atual?.toLocaleString("pt-BR") ?? "—"} ·
                        Solicitante: {r.consultor_seminovos} ·{" "}
                        {formatarData(r.created_at)}
                      </p>
                      {r.observacao_seminovos && (
                        <p className="text-xs text-muted-foreground italic line-clamp-1">
                          Obs: {r.observacao_seminovos}
                        </p>
                      )}
                      {r.status === "devolvido_seminovos" && r.observacao_gestora && (
                        <div className="flex items-start gap-1.5 text-xs text-orange-400 mt-1">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>Devolução: {r.observacao_gestora}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogDetalhe(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {isDevolvido && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDialogReenviar(r);
                            setReenviarKm(r.km_atual != null ? String(r.km_atual) : "");
                            setReenviarObs("");
                            setReenviarFilial(r.filial_id ?? "");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reenviar
                        </Button>
                      )}

                      {aba === "aprovacao" && r.status === "aguardando_aprovacao" && podeAprovar && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-600"
                            onClick={() => {
                              setDialogAprovar(r);
                              setObsGestora("");
                              setConfirmadoAprovacao(false);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-500 hover:text-orange-600"
                            onClick={() => {
                              setDialogDevolver(r);
                              setMotivoDevolucao("");
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              setDialogCancelar(r);
                              setMotivoCancelamento("");
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Detalhe */}
      <Dialog open={!!dialogDetalhe} onOpenChange={(o) => !o && setDialogDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {dialogDetalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{dialogDetalhe.placa}</DialogTitle>
                <DialogDescription>
                  {dialogDetalhe.modelo} · {dialogDetalhe.chassi}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong className="text-xs text-muted-foreground">Status</strong>
                    <p>{STATUS_LABELS[dialogDetalhe.status ?? ""]?.label ?? dialogDetalhe.status}</p>
                  </div>
                  <div>
                    <strong className="text-xs text-muted-foreground">Prioridade</strong>
                    <p>{dialogDetalhe.prioridade ?? "Normal"}</p>
                  </div>
                  <div>
                    <strong className="text-xs text-muted-foreground">KM Atual</strong>
                    <p>{dialogDetalhe.km_atual?.toLocaleString("pt-BR") ?? "—"}</p>
                  </div>
                  <div>
                    <strong className="text-xs text-muted-foreground">Solicitante</strong>
                    <p>{dialogDetalhe.consultor_seminovos}</p>
                  </div>
                  <div>
                    <strong className="text-xs text-muted-foreground">Tipo</strong>
                    <p>
                      {dialogDetalhe.revisao ? "Revisão" : ""}{" "}
                      {dialogDetalhe.revisao && dialogDetalhe.certificacao ? "+ " : ""}
                      {dialogDetalhe.certificacao ? "Certificação" : ""}
                    </p>
                  </div>
                  <div>
                    <strong className="text-xs text-muted-foreground">Criado em</strong>
                    <p>{formatarData(dialogDetalhe.created_at)}</p>
                  </div>
                </div>
                {dialogDetalhe.observacao_seminovos && (
                  <div>
                    <strong className="text-xs text-muted-foreground">Observação do Vendedor</strong>
                    <p className="text-muted-foreground">{dialogDetalhe.observacao_seminovos}</p>
                  </div>
                )}
                {dialogDetalhe.observacao_gestora && (
                  <div>
                    <strong className="text-xs text-muted-foreground">Observação da Gestora</strong>
                    <p className="text-muted-foreground">{dialogDetalhe.observacao_gestora}</p>
                  </div>
                )}
                {dialogDetalhe.numero_os && (
                  <div>
                    <strong className="text-xs text-muted-foreground">OS</strong>
                    <p>
                      {dialogDetalhe.numero_os} ({dialogDetalhe.tipo_os})
                    </p>
                  </div>
                )}
                {dialogDetalhe.observacao_mecanico && (
                  <div>
                    <strong className="text-xs text-muted-foreground">Observação do Mecânico</strong>
                    <p className="text-muted-foreground">{dialogDetalhe.observacao_mecanico}</p>
                  </div>
                )}
                {dialogDetalhe.observacao_finalizacao && (
                  <div>
                    <strong className="text-xs text-muted-foreground">Observação Final</strong>
                    <p className="text-muted-foreground">{dialogDetalhe.observacao_finalizacao}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogDetalhe(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Aprovar */}
      <Dialog open={!!dialogAprovar} onOpenChange={(o) => !o && setDialogAprovar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Envie esta solicitação para a Fila da Oficina.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Observação (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Observações sobre a aprovação..."
                value={obsGestora}
                onChange={(e) => setObsGestora(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={confirmadoAprovacao}
                onCheckedChange={(v) => setConfirmadoAprovacao(v === true)}
              />
              <span>Confirmo e autorizo o envio desta solicitação para a Oficina</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAprovar(null)} disabled={processando}>
              Cancelar
            </Button>
            <Button onClick={handleAprovar} disabled={processando || !confirmadoAprovacao}>
              {processando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Devolver */}
      <Dialog open={!!dialogDevolver} onOpenChange={(o) => !o && setDialogDevolver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver ao Vendedor</DialogTitle>
            <DialogDescription>
              Informe o motivo para que o Vendedor ajuste e reenvie.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="Descreva o motivo da devolução..."
              value={motivoDevolucao}
              onChange={(e) => setMotivoDevolucao(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDevolver(null)} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDevolver}
              disabled={processando || !motivoDevolucao.trim()}
            >
              {processando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cancelar */}
      <Dialog open={!!dialogCancelar} onOpenChange={(o) => !o && setDialogCancelar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Solicitação</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="Descreva o motivo do cancelamento..."
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCancelar(null)} disabled={processando}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={processando || !motivoCancelamento.trim()}
            >
              {processando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Cancelar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reenviar */}
      <Dialog open={!!dialogReenviar} onOpenChange={(o) => !o && setDialogReenviar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar para Aprovação</DialogTitle>
            <DialogDescription>
              Ajuste os dados e reenvie a solicitação para a Gestora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Placa</Label>
              <Input className="mt-1" value={dialogReenviar?.placa ?? ""} disabled />
            </div>
            <div>
              <Label className="text-xs font-semibold">KM Atual</Label>
              <Input
                className="mt-1"
                type="number"
                value={reenviarKm}
                onChange={(e) => setReenviarKm(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Observação</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={reenviarObs}
                onChange={(e) => setReenviarObs(e.target.value)}
                placeholder="Observações ao reenviar..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReenviar(null)} disabled={processando}>
              Cancelar
            </Button>
            <Button onClick={handleReenviar} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Reenviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
