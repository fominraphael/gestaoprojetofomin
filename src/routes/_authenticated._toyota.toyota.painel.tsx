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
  History,
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
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/painel")({
  component: PainelCertificacao,
  errorComponent: ModuleErrorBoundary,
});

type Status =
  | "analise"
  | "pendente_preparacao"
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
  enviado_toyota_em: string | null;
  retorno_toyota_em: string | null;
  aprovado_em: string | null;
}

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
}

type AbaId = "loja" | "central" | "toyota" | "historico";

function PainelCertificacao() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [minhasFiliais, setMinhasFiliais] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [aba, setAba] = useState<AbaId>("loja");

  // Modal reprovação / reiniciar
  const [reiniciar, setReiniciar] = useState<Veiculo | null>(null);

  const carregar = async () => {
    setLoading(true);
    const [vRes, fRes, uRes] = await Promise.all([
      supabase
        .from("toyota_estoque_veiculos")
        .select(
          "id,chassi,placa,modelo,marca,ano_modelo,elegibilidade,status_aprovacao,filial_id,filial_destino_id,motivo_reprovacao,enviado_toyota_em,retorno_toyota_em,aprovado_em",
        )
        .order("updated_at", { ascending: false }),
      supabase.from("toyota_filiais").select("id,nome,dealer_number"),
      user?.id
        ? supabase
            .from("toyota_usuario_filial")
            .select("filial_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { filial_id: string }[], error: null }),
    ]);

    if (vRes.error) toast.error("Erro ao carregar veículos");
    if (fRes.error) toast.error("Erro ao carregar filiais");

    setVeiculos((vRes.data ?? []) as Veiculo[]);
    setFiliais((fRes.data ?? []) as Filial[]);
    setMinhasFiliais(new Set((uRes.data ?? []).map((r) => r.filial_id)));
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
    // Análise Central / Enviados Toyota → somente Admin
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
      historico: filtrar(["aprovado_toyota", "reprovado_toyota"], "historico"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculos, filiais, minhasFiliais, search, isAdmin]);

  /** Ações */
  const atualizarStatus = async (
    id: string,
    patch: Record<string, unknown>,
  ) => {
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

  const registrarRetornoToyota = async (v: Veiculo, aprovado: boolean) => {
    const motivo = aprovado
      ? null
      : window.prompt("Motivo da reprovação pela Toyota:") ?? "";
    if (!aprovado && !motivo) return;
    if (
      await atualizarStatus(v.id, {
        status_aprovacao: aprovado ? "aprovado_toyota" : "reprovado_toyota",
        motivo_reprovacao: motivo,
        retorno_toyota_em: new Date().toISOString(),
      })
    ) {
      toast.success(`Veículo marcado como ${aprovado ? "aprovado" : "reprovado"}`);
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

      {/* Funil */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FunilCard
          label="Fila da Loja"
          count={porAba.loja.length}
          icon={ClipboardList}
          active={aba === "loja"}
          onClick={() => setAba("loja")}
        />
        <FunilCard
          label="Análise Central"
          count={porAba.central.length}
          icon={ShieldCheck}
          active={aba === "central"}
          onClick={() => setAba("central")}
          disabled={!isAdmin}
        />
        <FunilCard
          label="Enviados Toyota"
          count={porAba.toyota.length}
          icon={Send}
          active={aba === "toyota"}
          onClick={() => setAba("toyota")}
          disabled={!isAdmin}
        />
        <FunilCard
          label="Histórico"
          count={porAba.historico.length}
          icon={History}
          active={aba === "historico"}
          onClick={() => setAba("historico")}
        />
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaId)}>
        <TabsList className="hidden">
          <TabsTrigger value="loja">Loja</TabsTrigger>
          <TabsTrigger value="central">Central</TabsTrigger>
          <TabsTrigger value="toyota">Toyota</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
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
              descricao="Revise os preenchimentos das lojas antes de submeter à montadora."
              loading={loading}
              vazio="Sem submissões aguardando revisão."
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Programa</TableHead>
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
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReiniciar(v)}
                      >
                        Devolver à loja
                      </Button>
                      <Button size="sm" onClick={() => submeterToyota(v)}>
                        <Send className="mr-1 h-3 w-3" />
                        Submeter Toyota
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
              descricao="Submissões enviadas ao portal da montadora aguardando o prazo de análise."
              loading={loading}
              vazio="Nenhum veículo aguardando retorno da Toyota."
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="text-right">Retorno</TableHead>
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
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700"
                        onClick={() => registrarRetornoToyota(v, true)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Aprovado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700"
                        onClick={() => registrarRetornoToyota(v, false)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Reprovado
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
                const reprovado = v.status_aprovacao === "reprovado_toyota";
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.chassi}</TableCell>
                    <TableCell>{v.modelo ?? "—"}</TableCell>
                    <TableCell>{filialNome(v.filial_destino_id ?? v.filial_id)}</TableCell>
                    <TableCell>
                      {reprovado ? (
                        <Badge variant="destructive">Reprovado</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          Aprovado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {reprovado ? v.motivo_reprovacao ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {reprovado && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReiniciar(v)}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Reiniciar Fluxo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </SecaoTabela>
        </TabsContent>
      </Tabs>

      {/* Modal reiniciar */}
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
              <Textarea
                readOnly
                value={reiniciar.motivo_reprovacao}
                rows={4}
              />
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
    // @ts-expect-error — runtime inspection of TableBody children
    (!body?.props?.children || body.props.children.length === 0);

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
