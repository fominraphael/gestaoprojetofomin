import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  ShieldCheck,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Building2,
} from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/painel")({
  component: PainelCertificacao,
  errorComponent: ModuleErrorBoundary,
});

type Status =
  | "analise"
  | "pendente_preparacao"
  | "em_posvendas"
  | "devolvido_preparador"
  | "aguardando_analise_central"
  | "enviado_toyota"
  | "aprovado_toyota"
  | "reprovado_toyota"
  | "rejeitado";

interface Veiculo {
  id: string;
  chassi: string;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  ano_modelo: number | null;
  elegibilidade: string | null;
  status_aprovacao: Status;
  filial_id: string | null;
  filial_destino_id: string | null;
  motivo_reprovacao: string | null;
  observacao_toyota: string | null;
  enviado_toyota_em: string | null;
  retorno_toyota_em: string | null;
  aprovado_em: string | null;
  hsv_observacoes_preparador: string | null;
  checklist_data: { observacoes?: string; preenchido_em?: string } | null;
  health_check_pdf_path: string | null;
}

interface Filial {
  id: string;
  nome: string;
}

type AbaId = "loja" | "central" | "toyota" | "reprovados" | "historico";

function PainelCertificacao() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [minhasFiliais, setMinhasFiliais] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [aba, setAba] = useState<AbaId>("loja");

  // Modais
  const [reiniciar, setReiniciar] = useState<Veiculo | null>(null);
  const [pendenciar, setPendenciar] = useState<Veiculo | null>(null);
  const [motivoPendencia, setMotivoPendencia] = useState("");
  const [confirmarToyota, setConfirmarToyota] = useState<Veiculo | null>(null);
  const [reenviarReprovado, setReenviarReprovado] = useState<Veiculo | null>(null);
  const [arquivarVeiculo, setArquivarVeiculo] = useState<Veiculo | null>(null);
  const [revisar, setRevisar] = useState<Veiculo | null>(null);

  const carregar = async () => {
    setLoading(true);
    const [vRes, fRes, uRes] = await Promise.all([
      supabase
        .from("toyota_estoque_veiculos")
        .select(
          "id,chassi,placa,modelo,marca,ano_modelo,elegibilidade,status_aprovacao,filial_id,filial_destino_id,motivo_reprovacao,observacao_toyota,enviado_toyota_em,retorno_toyota_em,aprovado_em,hsv_observacoes_preparador,checklist_data,health_check_pdf_path",
        )
        .order("updated_at", { ascending: false }),
      supabase.from("toyota_patios").select("id,nome"),
      user?.id
        ? supabase
            .from("toyota_usuario_patio")
            .select("patio_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { patio_id: string }[], error: null }),

    ]);

    if (vRes.error) toast.error("Erro ao carregar veículos");
    if (fRes.error) toast.error("Erro ao carregar filiais");

    setVeiculos((vRes.data ?? []) as Veiculo[]);
    setFiliais((fRes.data ?? []) as Filial[]);
    setMinhasFiliais(new Set((uRes.data ?? []).map((r) => r.patio_id)));
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, [user?.id]);

  const filialNome = (id: string | null) =>
    filiais.find((f) => f.id === id)?.nome ?? "—";

  /** Visibilidade por papel */
  const podeVer = (v: Veiculo, abaId: AbaId): boolean => {
    if (isAdmin) return true;
    const filialAlvo = v.filial_destino_id ?? v.filial_id;
    const minha = filialAlvo ? minhasFiliais.has(filialAlvo) : false;
    if (abaId === "loja") return minha;
    if (abaId === "historico") return minha;
    // Análise Central / Enviados Toyota / Reprovados → somente Admin
    return false;
  };

  const porAba = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (v: Veiculo) => {
      if (!q) return true;
      return [v.chassi, v.placa, v.modelo, filialNome(v.filial_destino_id)]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    };

    const filtrar = (statuses: Status[], abaId: AbaId) =>
      veiculos
        .filter((v) => statuses.includes(v.status_aprovacao))
        .filter((v) => podeVer(v, abaId))
        .filter(match);

    return {
      loja: filtrar(["pendente_preparacao"], "loja"),
      central: filtrar(["aguardando_analise_central"], "central"),
      toyota: filtrar(["enviado_toyota"], "toyota"),
      reprovados: filtrar(["reprovado_toyota"], "reprovados"),
      historico: filtrar(["aprovado_toyota", "rejeitado"], "historico"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculos, filiais, minhasFiliais, search, isAdmin]);

  /** Ações */
  type VeiculoUpdate = Database["public"]["Tables"]["toyota_estoque_veiculos"]["Update"];
  const atualizarStatus = async (id: string, patch: VeiculoUpdate) => {
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar veículo");
      return false;
    }
    return true;
  };

  const enviarAnaliseCentral = async (v: Veiculo) => {
    if (await atualizarStatus(v.id, { status_aprovacao: "aguardando_analise_central" })) {
      toast.success("Enviado para Análise Central");
      carregar();
    }
  };

  const submeterToyota = async (v: Veiculo) => {
    if (
      await atualizarStatus(v.id, {
        status_aprovacao: "enviado_toyota",
        enviado_toyota_em: new Date().toISOString(),
      })
    ) {
      toast.success("Submetido à montadora");
      carregar();
    }
  };

  const confirmarSubmeterToyota = async () => {
    if (!confirmarToyota) return;
    await submeterToyota(confirmarToyota);
    setConfirmarToyota(null);
  };

  const confirmarPendenciar = async () => {
    if (!pendenciar) return;
    const motivo = motivoPendencia.trim();
    if (!motivo) {
      toast.error("Informe o motivo da pendência.");
      return;
    }
    if (
      await atualizarStatus(pendenciar.id, {
        status_aprovacao: "devolvido_preparador",
        motivo_reprovacao: motivo,
      })
    ) {
      toast.success("Veículo devolvido ao Preparador com pendência.");
      setPendenciar(null);
      setMotivoPendencia("");
      carregar();
    }
  };

  const confirmarReenviarToyota = async () => {
    if (!reenviarReprovado) return;
    if (
      await atualizarStatus(reenviarReprovado.id, {
        status_aprovacao: "enviado_toyota",
        retorno_toyota_em: null,
        motivo_reprovacao: null,
        observacao_toyota: null,
        enviado_toyota_em: new Date().toISOString(),
      })
    ) {
      toast.success("Veículo reenviado. Aguarde nova importação da Toyota.");
      setReenviarReprovado(null);
      carregar();
    }
  };

  const confirmarArquivar = async () => {
    if (!arquivarVeiculo) return;
    if (
      await atualizarStatus(arquivarVeiculo.id, {
        status_aprovacao: "rejeitado",
      })
    ) {
      toast.success("Veículo arquivado.");
      setArquivarVeiculo(null);
      carregar();
    }
  };

  const confirmarReiniciar = async () => {
    if (!reiniciar) return;
    if (
      await atualizarStatus(reiniciar.id, {
        status_aprovacao: "pendente_preparacao",
      })
    ) {
      toast.success("Fluxo reiniciado. Veículo voltou à fila da loja.");
      setReiniciar(null);
      carregar();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <ClipboardList className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Painel de Certificação</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamento unificado do funil — Preparador, Administrador e Gestor.
            </p>
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar chassi, placa, modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {/* Funil de Status */}
      {(() => {
        const totalEstoque = veiculos.length;
        const elegiveisCount = veiculos.filter((v) =>
          (v.elegibilidade ?? "").toLowerCase().startsWith("elegível"),
        ).length;
        const posVendasCount = veiculos.filter(
          (v) => v.status_aprovacao === "em_posvendas",
        ).length;
        const centralCount = veiculos.filter(
          (v) => v.status_aprovacao === "aguardando_analise_central",
        ).length;
        const enviadosAtivos = veiculos.filter(
          (v) => v.status_aprovacao === "enviado_toyota",
        ).length;
        const aprovadosCount = veiculos.filter(
          (v) => v.status_aprovacao === "aprovado_toyota",
        ).length;
        const reprovadosCount = veiculos.filter(
          (v) => v.status_aprovacao === "reprovado_toyota",
        ).length;
        const totalEnviados = enviadosAtivos + aprovadosCount + reprovadosCount;
        const totalRetornados = aprovadosCount + reprovadosCount;
        const pctAprovados = totalRetornados
          ? Math.round((aprovadosCount / totalRetornados) * 100)
          : 0;
        const pctReprovados = totalRetornados
          ? 100 - pctAprovados
          : 0;

        return (
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
              <FunilCard
                label="Estoque Importado"
                count={totalEstoque}
                icon={ClipboardList}
                active={false}
                onClick={() => undefined}
              />
              <FunilCard
                label="Elegíveis"
                count={elegiveisCount}
                icon={CheckCircle2}
                active={false}
                onClick={() => undefined}
              />
              <FunilCard
                label="Pós-Vendas"
                count={posVendasCount}
                icon={Building2}
                active={false}
                onClick={() => undefined}
              />
              <FunilCard
                label="Análise Central"
                count={centralCount}
                icon={ShieldCheck}
                active={aba === "central"}
                onClick={() => isAdmin && setAba("central")}
                disabled={!isAdmin}
              />
            </div>

            {/* Caixa principal: Enviados Toyota com sub-caixas Aprovados/Reprovados */}
            <button
              type="button"
              onClick={() => isAdmin && setAba("toyota")}
              disabled={!isAdmin}
              className={`rounded-lg border p-4 text-left transition ${
                aba === "toyota"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:border-slate-400"
              } ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  <span className="text-sm font-medium">Enviados Toyota</span>
                </div>
                <span className="text-3xl font-semibold tabular-nums">
                  {totalEnviados}
                </span>
              </div>
              <p
                className={`mt-1 text-xs ${
                  aba === "toyota" ? "text-slate-300" : "text-muted-foreground"
                }`}
              >
                {enviadosAtivos} aguardando retorno · {totalRetornados} com retorno
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {/* Aprovados */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAba("historico");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setAba("historico");
                    }
                  }}
                  className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900 hover:bg-emerald-100"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium">Aprovados</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-semibold tabular-nums">
                      {aprovadosCount}
                    </span>
                    <span className="text-xs text-emerald-700">
                      ({pctAprovados}%)
                    </span>
                  </div>
                </div>

                {/* Reprovados */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAdmin) setAba("reprovados");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isAdmin) setAba("reprovados");
                    }
                  }}
                  className={`rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-900 hover:bg-rose-100 ${
                    !isAdmin ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-medium">Reprovados</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-semibold tabular-nums">
                      {reprovadosCount}
                    </span>
                    <span className="text-xs text-rose-700">
                      ({pctReprovados}%)
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      })()}

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaId)}>
        <TabsList>
          <TabsTrigger value="loja">
            Fila da Loja ({porAba.loja.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="central">
              Análise Central ({porAba.central.length})
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="toyota">
              Enviados Toyota ({porAba.toyota.length})
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="reprovados">
              Reprovados ({porAba.reprovados.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="historico">
            Histórico ({porAba.historico.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Fila Pendentes da Loja */}
        <TabsContent value="loja">
          <SecaoTabela
            titulo="Carros aguardando preparação na filial"
            descricao="Preencha Checklist, anexe laudo (se houver) e valide o Health Check. Ao finalizar, envie para a Análise Central."
            loading={loading}
            vazio="Sem veículos na fila da loja."
          >
            <TableHeader>
              <TableRow>
                <TableHead>Chassi</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAba.loja.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                  <TableCell>{v.placa ?? "—"}</TableCell>
                  <TableCell>{v.modelo ?? "—"}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {filialNome(v.filial_destino_id ?? v.filial_id)}
                  </TableCell>
                  <TableCell>
                    <ElegBadge value={v.elegibilidade} />
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate({
                          to: "/toyota/checklist",
                          search: {
                            tipo:
                              v.elegibilidade === "Elegível TSIM" ? "TSIM" : "TCUV",
                            chassi: v.chassi,
                            placa: v.placa ?? undefined,
                            modelo: v.modelo ?? undefined,
                          },
                        })
                      }
                    >
                      Checklist
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: "/toyota/validacao" })}
                    >
                      Health Check
                    </Button>
                    <Button size="sm" onClick={() => enviarAnaliseCentral(v)}>
                      <Send className="mr-1 h-3 w-3" />
                      Enviar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </SecaoTabela>
        </TabsContent>

        {/* 2. Análise Central (Admin) */}
        <TabsContent value="central">
          {!isAdmin ? (
            <SemAcesso />
          ) : (
            <SecaoTabela
              titulo="Análise Central — Administrador"
              descricao="Revise o que o Pós-Vendas preencheu/anexou. Pendencie ou submeta à montadora."
              loading={loading}
              vazio="Sem submissões aguardando revisão."
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAba.central.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                    <TableCell>{v.modelo ?? "—"}</TableCell>
                    <TableCell>{filialNome(v.filial_destino_id ?? v.filial_id)}</TableCell>
                    <TableCell><ElegBadge value={v.elegibilidade} /></TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-1.5">
                        <Badge variant={v.checklist_data?.preenchido_em ? "default" : "outline"}>
                          Checklist
                        </Badge>
                        <Badge variant={v.health_check_pdf_path ? "default" : "outline"}>
                          Health Check
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setRevisar(v)}>
                        Revisar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-700"
                        onClick={() => {
                          setPendenciar(v);
                          setMotivoPendencia("");
                        }}
                      >
                        Pendenciar
                      </Button>
                      <Button size="sm" onClick={() => setConfirmarToyota(v)}>
                        <Send className="mr-1 h-3 w-3" />
                        Enviado para Toyota
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SecaoTabela>
          )}
        </TabsContent>

        {/* 3. Enviados para a Toyota */}
        <TabsContent value="toyota">
          {!isAdmin ? (
            <SemAcesso />
          ) : (
            <SecaoTabela
              titulo="Enviados para a Toyota"
              descricao="Submissões aguardando retorno. O status muda automaticamente via importação do BI Toyota."
              loading={loading}
              vazio="Nenhum veículo aguardando retorno da Toyota."
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAba.toyota.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                    <TableCell>{v.modelo ?? "—"}</TableCell>
                    <TableCell>{filialNome(v.filial_destino_id ?? v.filial_id)}</TableCell>
                    <TableCell className="text-sm">
                      {v.enviado_toyota_em
                        ? new Date(v.enviado_toyota_em).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">Aguardando retorno BI</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SecaoTabela>
          )}
        </TabsContent>

        {/* 4. Revisão de Reprovados (Admin) */}
        <TabsContent value="reprovados">
          {!isAdmin ? (
            <SemAcesso />
          ) : (
            <SecaoTabela
              titulo="Revisão de Reprovados pela Toyota"
              descricao="Decida entre arquivar definitivamente ou reenviar para uma nova rodada de avaliação."
              loading={loading}
              vazio="Nenhuma reprovação a revisar."
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Motivo de reprovação</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Decisão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAba.reprovados.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                    <TableCell>{v.modelo ?? "—"}</TableCell>
                    <TableCell>{filialNome(v.filial_destino_id ?? v.filial_id)}</TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                      {v.motivo_reprovacao ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                      {v.observacao_toyota ?? "—"}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700"
                        onClick={() => setArquivarVeiculo(v)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Arquivar
                      </Button>
                      <Button size="sm" onClick={() => setReenviarReprovado(v)}>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reenviar para Toyota
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SecaoTabela>
          )}
        </TabsContent>

        {/* 4. Histórico */}
        <TabsContent value="historico">
          <SecaoTabela
            titulo="Histórico de Decisão"
            descricao="Resultado final retornado pela fábrica."
            loading={loading}
            vazio="Sem decisões registradas ainda."
          >
            <TableHeader>
              <TableRow>
                <TableHead>Chassi</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAba.historico.map((v) => {
                const arquivado = v.status_aprovacao === "rejeitado";
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                    <TableCell>{v.modelo ?? "—"}</TableCell>
                    <TableCell>{filialNome(v.filial_destino_id ?? v.filial_id)}</TableCell>
                    <TableCell>
                      {arquivado ? (
                        <Badge variant="destructive">Arquivado</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          Aprovado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {arquivado ? v.motivo_reprovacao ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right">—</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </SecaoTabela>
        </TabsContent>
      </Tabs>

      {/* Modal Pendenciar */}
      <Dialog
        open={!!pendenciar}
        onOpenChange={(o) => {
          if (!o) {
            setPendenciar(null);
            setMotivoPendencia("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pendenciar veículo</DialogTitle>
            <DialogDescription>
              O veículo voltará ao <strong>Preparador</strong> com o motivo
              abaixo, para ser remetido novamente ao Pós-Vendas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Motivo da Pendência <span className="text-destructive">*</span>
            </Label>
            <Textarea
              autoFocus
              value={motivoPendencia}
              onChange={(e) => setMotivoPendencia(e.target.value)}
              rows={4}
              placeholder="Descreva a pendência que o Preparador precisa resolver..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendenciar(null);
                setMotivoPendencia("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPendenciar}
              disabled={!motivoPendencia.trim()}
            >
              Pendenciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Envio Toyota */}
      <Dialog
        open={!!confirmarToyota}
        onOpenChange={(o) => !o && setConfirmarToyota(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envio para a Toyota</DialogTitle>
            <DialogDescription>
              O veículo <strong className="font-mono">{confirmarToyota?.chassi}</strong>{" "}
              será marcado como <strong>Enviado para Toyota</strong> e ficará
              aguardando o retorno via importação do BI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarToyota(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarSubmeterToyota}>
              <Send className="mr-2 h-4 w-4" />
              Enviado para Toyota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reenviar Reprovado */}
      <Dialog
        open={!!reenviarReprovado}
        onOpenChange={(o) => !o && setReenviarReprovado(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar para a Toyota</DialogTitle>
            <DialogDescription>
              O retorno atual será limpo e o veículo voltará ao status{" "}
              <strong>Enviado para Toyota</strong>, aguardando uma nova
              importação da planilha BI para ser reavaliado.
            </DialogDescription>
          </DialogHeader>
          {reenviarReprovado?.motivo_reprovacao && (
            <div className="space-y-2">
              <Label>Motivo de reprovação anterior</Label>
              <Textarea readOnly rows={3} value={reenviarReprovado.motivo_reprovacao} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReenviarReprovado(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarReenviarToyota}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reenviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Arquivar */}
      <Dialog
        open={!!arquivarVeiculo}
        onOpenChange={(o) => !o && setArquivarVeiculo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar veículo</DialogTitle>
            <DialogDescription>
              Esta ação encerra o fluxo de certificação do veículo{" "}
              <strong className="font-mono">{arquivarVeiculo?.chassi}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArquivarVeiculo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarArquivar}>
              <XCircle className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Revisar (detalhes da submissão da oficina) */}
      <Dialog open={!!revisar} onOpenChange={(o) => !o && setRevisar(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{revisar?.chassi}</DialogTitle>
            <DialogDescription>
              {revisar?.modelo ?? "—"} · {revisar?.placa ?? "—"} ·{" "}
              {filialNome(revisar?.filial_destino_id ?? revisar?.filial_id ?? null)}
            </DialogDescription>
          </DialogHeader>
          {revisar && (
            <div className="space-y-3 text-sm">
              {revisar.hsv_observacoes_preparador && (
                <div>
                  <Label className="text-xs">Observações ao Preparador (ADM)</Label>
                  <p className="rounded-md bg-muted p-2 text-xs">
                    {revisar.hsv_observacoes_preparador}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-xs">Checklist da oficina</Label>
                <p className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                  {revisar.checklist_data?.observacoes || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {revisar.checklist_data?.preenchido_em
                    ? `Preenchido em ${new Date(revisar.checklist_data.preenchido_em).toLocaleString("pt-BR")}`
                    : "Sem registro"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Health Check (PDF)</Label>
                <p className="text-xs">
                  {revisar.health_check_pdf_path ? (
                    <span className="font-mono break-all">
                      {revisar.health_check_pdf_path}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Não anexado</span>
                  )}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisar(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal reiniciar (legado — devolução simples) */}
      <Dialog open={!!reiniciar} onOpenChange={(o) => !o && setReiniciar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar fluxo do veículo</DialogTitle>
            <DialogDescription>
              O veículo voltará para a <strong>Fila da Loja</strong> para que o
              preparador corrija as pendências.
            </DialogDescription>
          </DialogHeader>
          {reiniciar?.motivo_reprovacao && (
            <div className="space-y-2">
              <Label>Motivo da reprovação</Label>
              <Textarea readOnly value={reiniciar.motivo_reprovacao} rows={4} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReiniciar(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarReiniciar}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reiniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function FunilCard({
  label,
  count,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  count: number;
  icon: typeof ClipboardList;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white hover:border-slate-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        <span className="text-2xl font-semibold tabular-nums">{count}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{label}</div>
    </button>
  );
}

function SecaoTabela({
  titulo,
  descricao,
  loading,
  vazio,
  children,
}: {
  titulo: string;
  descricao: string;
  loading: boolean;
  vazio: string;
  children: React.ReactNode;
}) {
  // children = [<TableHeader/>, <TableBody/>]
  const [, body] = Array.isArray(children) ? children : [null, null];
  const bodyEmpty =
    !loading &&
    (!(body as any)?.props?.children ||
      (body as any).props.children.length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : bodyEmpty ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {vazio}
          </div>
        ) : (
          <Table>{children}</Table>
        )}
      </CardContent>
    </Card>
  );
}

function ElegBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const cls = value.includes("TCUV")
    ? "bg-sky-100 text-sky-800"
    : value.includes("TSIM")
    ? "bg-violet-100 text-violet-800"
    : "bg-slate-100 text-slate-700";
  return <Badge className={cls}>{value.replace("Elegível ", "")}</Badge>;
}

function SemAcesso() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        Visível apenas para o Administrador do sistema.
      </CardContent>
    </Card>
  );
}
