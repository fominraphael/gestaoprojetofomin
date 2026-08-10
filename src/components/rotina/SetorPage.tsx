import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { HistoricoAtividadeItem } from "@/components/rotina/HistoricoAtividadeItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeft,
  CalendarCheck,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  History,
  Paperclip,
  Archive,
  Trash2,
} from "lucide-react";
import {
  type Atividade,
  type Tarefa,
  type StatusTarefa,
  type SemanaHistorico,
  STATUS_TAREFA_LABELS,
  STATUS_TAREFA_COLORS,
  DIAS_SEMANA,
  DIAS_SEMANA_LABELS,
  toggleCheckpoint,
  getCheckpoints,
  getDiaSemanaAtual,
  encerrarSemana,
  inicioSemana,
  fimSemana,
  labelSemana,
  labelMes,
} from "@/lib/rotina";

type SetorTab = "rotina" | "tarefas" | "historico" | "lixeira";

/** Filtros de prazo disponíveis na aba Atividades Pontuais. */
type FiltroPrazo = "todos" | "atrasados" | "semana";

export function SetorPage() {
  const { setorId } = useParams({ from: "/_authenticated/_rotina/rotina/$setorId" });
  const { tab } = useSearch({ from: "/_authenticated/_rotina/rotina/$setorId" });
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [setor, setSetor] = useState<{
    id: string; nome: string; cor: string; icone: string; descricao: string;
  } | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [semanas, setSemanas] = useState<SemanaHistorico[]>([]);
  const [checkpoints, setCheckpoints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [encerrando, setEncerrando] = useState(false);

  const [expandedRotina, setExpandedRotina] = useState(true);
  const [filtroDia, setFiltroDia] = useState<number | null>(null);

  // Nova atividade inline
  const [novaAtivNome, setNovaAtivNome] = useState("");
  const [novaAtivDias, setNovaAtivDias] = useState<number[]>([]);
  const [novaAtivDescricao, setNovaAtivDescricao] = useState("");
  const [showNovaAtiv, setShowNovaAtiv] = useState(false);

  // Nova tarefa inline
  const [novaTarefaNome, setNovaTarefaNome] = useState("");
  const [novaTarefaPrazo, setNovaTarefaPrazo] = useState("");
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);

  const hoje = new Date().toISOString().split("T")[0]!;
  const diaAtual = getDiaSemanaAtual();

  const carregar = useCallback(async () => {
    setLoading(true);
    const [setorRes, ativRes, tarefaRes, semanasRes] = await Promise.all([
      supabase
        .from("rotina_setores")
        .select("id, nome, cor, icone, descricao")
        .eq("id", setorId)
        .single(),
      supabase
        .from("rotina_atividades")
        .select("*")
        .eq("setor_id", setorId)
        .eq("ativo", true)
        .order("ordem"),
      supabase
        .from("rotina_tarefas")
        .select("*")
        .eq("setor_id", setorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("rotina_semanas")
        .select("*")
        .eq("setor_id", setorId)
        .order("inicio", { ascending: false }),
    ]);
    if (setorRes.data) setSetor(setorRes.data as any);
    setAtividades((ativRes.data as any) ?? []);
    setTarefas((tarefaRes.data as any) ?? []);
    setSemanas((semanasRes.data as any) ?? []);

    const ativIds = (ativRes.data ?? []).map((a: any) => a.id);
    const cps = await getCheckpoints(ativIds, hoje);
    setCheckpoints(cps);

    setLoading(false);
  }, [setorId, hoje]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function trocarTab(value: string) {
    navigate({
      to: "/rotina/$setorId",
      params: { setorId },
      search: { tab: value as SetorTab },
      replace: true,
    });
  }

  async function criarAtividade() {
    if (!novaAtivNome.trim()) {
      toast.error("Preencha o nome da atividade.");
      return;
    }
    const { error } = await supabase.from("rotina_atividades").insert({
      nome: novaAtivNome.trim(),
      setor_id: setorId,
      frequencia: "semanal",
      dias_semana: novaAtivDias.length > 0 ? novaAtivDias : [diaAtual],
      descricao: novaAtivDescricao.trim(),
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Atividade criada. Abra a atividade para anexar arquivos.");
    setNovaAtivNome("");
    setNovaAtivDias([]);
    setNovaAtivDescricao("");
    setShowNovaAtiv(false);
    carregar();
  }

  async function criarTarefa() {
    if (!novaTarefaNome.trim()) {
      toast.error("Preencha o nome da tarefa.");
      return;
    }
    const { error } = await supabase.from("rotina_tarefas").insert({
      nome: novaTarefaNome.trim(),
      setor_id: setorId,
      prazo: novaTarefaPrazo || null,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tarefa criada.");
    setNovaTarefaNome("");
    setNovaTarefaPrazo("");
    setShowNovaTarefa(false);
    carregar();
  }

  async function handleToggleCheckpoint(atividadeId: string) {
    if (!user?.id) return;
    const ok = await toggleCheckpoint(atividadeId, hoje, user.id);
    if (!ok) {
      toast.error("Erro ao registrar checkpoint.");
      return;
    }
    setCheckpoints((prev) => {
      const next = new Set(prev);
      if (next.has(atividadeId)) next.delete(atividadeId);
      else next.add(atividadeId);
      return next;
    });
  }

  async function handleEncerrarSemana() {
    if (!user?.id) return;
    const ini = inicioSemana();
    if (
      !confirm(
        `Encerrar a semana ${labelSemana(ini, fimSemana(ini))}?\n\nOs dados serão salvos no histórico e a nova semana começa com todas as atividades atuais.`,
      )
    )
      return;
    setEncerrando(true);
    const res = await encerrarSemana(setorId, atividades, user.id);
    setEncerrando(false);
    if (!res.ok) {
      toast.error(res.error ?? "Falha ao encerrar a semana.");
      return;
    }
    toast.success("Semana encerrada e salva no histórico.");
    carregar();
  }

  async function alterarStatusTarefa(id: string, status: StatusTarefa) {
    const { error } = await supabase
      .from("rotina_tarefas")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  /**
   * Exclui uma atividade de rotina. Os checkpoints são removidos em cascata
   * pelo banco; os anexos polimórficos são limpos manualmente.
   */
  async function excluirAtividade(id: string) {
    const { error } = await supabase.from("rotina_atividades").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("rotina_anexos")
      .delete()
      .eq("entidade", "atividade")
      .eq("entidade_id", id);
    setAtividades((prev) => prev.filter((a) => a.id !== id));
    toast.success("Rotina diária excluída.");
  }

  /** Exclui uma atividade pontual (tarefa) e seus anexos. */
  async function excluirTarefa(id: string) {
    const { error } = await supabase.from("rotina_tarefas").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("rotina_anexos")
      .delete()
      .eq("entidade", "tarefa")
      .eq("entidade_id", id);
    setTarefas((prev) => prev.filter((t) => t.id !== id));
    toast.success("Atividade pontual excluída.");
  }

  function toggleDiaAtiv(d: number) {
    setNovaAtivDias((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  const atividadesPorDia = DIAS_SEMANA.reduce(
    (acc, d) => {
      acc[d.valor] = atividades.filter((a) => a.dias_semana?.includes(d.valor));
      return acc;
    },
    {} as Record<number, Atividade[]>,
  );

  const diasParaMostrar = filtroDia !== null
    ? DIAS_SEMANA.filter((d) => d.valor === filtroDia)
    : DIAS_SEMANA.filter((d) => (atividadesPorDia[d.valor]?.length ?? 0) > 0);

  const tarefasPorStatus = {
    a_fazer: tarefas.filter((t) => t.status === "a_fazer"),
    fazendo: tarefas.filter((t) => t.status === "fazendo"),
    concluido: tarefas.filter((t) => t.status === "concluido"),
  };

  const totalConcluidoHoje = atividades.filter((a) => checkpoints.has(a.id)).length;
  const totalAtividades = atividades.length;
  const percentConcluido = totalAtividades > 0
    ? Math.round((totalConcluidoHoje / totalAtividades) * 100)
    : 0;

  // Histórico agrupado por mês (accordion fechado por padrão)
  const historicoPorMes = useMemo(() => {
    const grupos = new Map<string, SemanaHistorico[]>();
    for (const s of semanas) {
      const chave = labelMes(s.inicio);
      const arr = grupos.get(chave) ?? [];
      arr.push(s);
      grupos.set(chave, arr);
    }
    return Array.from(grupos.entries());
  }, [semanas]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/rotina">
            <ArrowLeft className="w-4 h-4 mr-1" /> HUB
          </Link>
        </Button>
      </div>

      {/* Header da Frente */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: setor?.cor + "20" }}
        >
          {setor?.icone ?? "📋"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{setor?.nome ?? "Frente"}</h1>
          {setor?.descricao && (
            <p className="text-sm text-muted-foreground mt-1">{setor.descricao}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />
              {totalConcluidoHoje}/{totalAtividades} concluídas hoje
            </span>
            {totalAtividades > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percentConcluido}%` }}
                  />
                </div>
                <span>{percentConcluido}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={trocarTab} className="w-full">
        <TabsList>
          <TabsTrigger value="rotina" className="flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" /> Rotina Diária
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" /> Atividades Pontuais
            {tarefasPorStatus.a_fazer.length + tarefasPorStatus.fazendo.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                {tarefasPorStatus.a_fazer.length + tarefasPorStatus.fazendo.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Histórico
            {semanas.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                {semanas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Rotina Diária */}
        <TabsContent value="rotina" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Button
              variant={filtroDia === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroDia(null)}
            >
              Todos
            </Button>
            {DIAS_SEMANA.map((d) => (
              <Button
                key={d.valor}
                variant={filtroDia === d.valor ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFiltroDia(d.valor)}
              >
                {d.label}
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleEncerrarSemana}
                disabled={encerrando || atividades.length === 0}
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                {encerrando ? "Encerrando…" : "Encerrar semana"}
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : atividades.length === 0 && !showNovaAtiv ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhuma atividade de rotina cadastrada.
              </p>
              <Button size="sm" onClick={() => setShowNovaAtiv(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar primeira atividade
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {diasParaMostrar.map((d) => {
                const itens = atividadesPorDia[d.valor] ?? [];
                const isHoje = d.valor === diaAtual;
                return (
                  <div key={d.valor} className="space-y-2">
                    <button
                      className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                      onClick={() => setExpandedRotina((prev) => !prev)}
                    >
                      {expandedRotina ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {DIAS_SEMANA_LABELS[d.valor]}
                      {isHoje && (
                        <Badge variant="default" className="text-[10px] h-5 px-1.5 ml-1">
                          Hoje
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {itens.length}
                      </Badge>
                    </button>
                    {expandedRotina && (
                      <div className="space-y-1 pl-6">
                        {itens.map((a) => {
                          const concluido = checkpoints.has(a.id);
                          return (
                            <div
                              key={a.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                concluido ? "bg-primary/10 text-primary" : "hover:bg-accent"
                              }`}
                            >
                              <Checkbox
                                checked={concluido}
                                onCheckedChange={() => handleToggleCheckpoint(a.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Link
                                to="/rotina/atividade/$id"
                                params={{ id: a.id }}
                                className={`text-sm flex-1 min-w-0 truncate hover:underline ${
                                  concluido ? "line-through opacity-70" : ""
                                }`}
                              >
                                {a.nome}
                              </Link>
                              {a.descricao?.trim() && (
                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${
                                  concluido
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {concluido ? "Concluída" : "Pendente"}
                              </Badge>
                              {isAdmin && (
                                <ConfirmarExclusao
                                  titulo="Excluir rotina diária"
                                  descricao={`A atividade "${a.nome}" e seus registros de conclusão serão removidos permanentemente.`}
                                  onConfirm={() => excluirAtividade(a.id)}
                                />
                              )}
                            </div>
                          );
                        })}
                        {itens.length === 0 && (
                          <p className="text-xs text-muted-foreground py-1">
                            Nenhuma atividade para este dia.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showNovaAtiv && (
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2">
                <Input
                  placeholder="Nome da atividade"
                  value={novaAtivNome}
                  onChange={(e) => setNovaAtivNome(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-1 flex-wrap">
                  {DIAS_SEMANA.map((d) => (
                    <label
                      key={d.valor}
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer transition-colors ${
                        novaAtivDias.includes(d.valor)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        checked={novaAtivDias.includes(d.valor)}
                        onCheckedChange={() => toggleDiaAtiv(d.valor)}
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
                <Textarea
                  placeholder="Descrição (passo a passo da atividade)…"
                  value={novaAtivDescricao}
                  onChange={(e) => setNovaAtivDescricao(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Anexos podem ser enviados na página da atividade, logo após criá-la.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={criarAtividade}>
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNovaAtiv(false);
                      setNovaAtivNome("");
                      setNovaAtivDias([]);
                      setNovaAtivDescricao("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {atividades.length > 0 && !showNovaAtiv && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => setShowNovaAtiv(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova atividade
            </Button>
          )}
        </TabsContent>

        {/* TAB: Atividades Pontuais (Kanban) */}
        <TabsContent value="tarefas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coluna: A fazer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" /> A fazer
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {tarefasPorStatus.a_fazer.length}
                </Badge>
              </div>
              {tarefasPorStatus.a_fazer.map((t) => (
                <TarefaCard key={t.id} tarefa={t} onStatusChange={alterarStatusTarefa} onDelete={isAdmin ? excluirTarefa : undefined} />
              ))}
              {showNovaTarefa ? (
                <Card className="border-dashed">
                  <CardContent className="p-3 space-y-2">
                    <Input
                      placeholder="Nome da tarefa"
                      value={novaTarefaNome}
                      onChange={(e) => setNovaTarefaNome(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && criarTarefa()}
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={novaTarefaPrazo}
                      onChange={(e) => setNovaTarefaPrazo(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={criarTarefa}>
                        Criar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowNovaTarefa(false);
                          setNovaTarefaNome("");
                          setNovaTarefaPrazo("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowNovaTarefa(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nova tarefa
                </Button>
              )}
            </div>

            {/* Coluna: Fazendo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> Fazendo
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {tarefasPorStatus.fazendo.length}
                </Badge>
              </div>
              {tarefasPorStatus.fazendo.map((t) => (
                <TarefaCard key={t.id} tarefa={t} onStatusChange={alterarStatusTarefa} onDelete={isAdmin ? excluirTarefa : undefined} />
              ))}
            </div>

            {/* Coluna: Concluído */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {tarefasPorStatus.concluido.length}
                </Badge>
              </div>
              {tarefasPorStatus.concluido.map((t) => (
                <TarefaCard key={t.id} tarefa={t} onStatusChange={alterarStatusTarefa} onDelete={isAdmin ? excluirTarefa : undefined} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Histórico */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : semanas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma semana encerrada ainda. Use “Encerrar semana” na aba Rotina Diária.
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {historicoPorMes.map(([mes, lista]) => (
                <AccordionItem key={mes} value={mes}>
                  <AccordionTrigger className="text-sm font-semibold">
                    {mes}
                    <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5">
                      {lista.length}
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="w-full pl-2">
                      {lista.map((s) => (
                        <AccordionItem key={s.id} value={s.id}>
                          <AccordionTrigger className="text-sm">
                            <span className="flex items-center gap-2">
                              {labelSemana(s.inicio, s.fim)}
                              <Badge variant="outline" className="text-[10px]">
                                {s.total_concluidos}/{s.total_atividades}
                              </Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Accordion type="multiple" className="w-full pl-2">
                              {(s.snapshot?.atividades ?? []).map((a) => (
                                <HistoricoAtividadeItem key={a.id} atividade={a} />
                              ))}
                            </Accordion>
                            {(s.snapshot?.atividades ?? []).length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Nenhuma atividade registrada nesta semana.
                              </p>
                            )}
                          </AccordionContent>

                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Diálogo de confirmação reutilizável para exclusões destrutivas. */
function ConfirmarExclusao({
  titulo,
  descricao,
  onConfirm,
}: {
  titulo: string;
  descricao: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TarefaCard({
  tarefa,
  onStatusChange,
  onDelete,
}: {
  tarefa: Tarefa;
  onStatusChange: (id: string, status: StatusTarefa) => void;
  onDelete?: ((id: string) => void) | undefined;
}) {
  const proximoStatus: Record<StatusTarefa, StatusTarefa | null> = {
    a_fazer: "fazendo",
    fazendo: "concluido",
    concluido: null,
  };
  const prox = proximoStatus[tarefa.status];

  const isAtrasado =
    tarefa.prazo && tarefa.status !== "concluido" &&
    new Date(tarefa.prazo + "T12:00:00") < new Date();

  return (
    <Card className={`hover:border-primary/30 transition-colors ${isAtrasado ? "border-destructive/50" : ""}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Link
            to="/rotina/tarefa/$id"
            params={{ id: tarefa.id }}
            className="font-medium text-sm hover:text-primary transition-colors block flex-1 min-w-0"
          >
            {tarefa.nome}
          </Link>
          {onDelete && (
            <ConfirmarExclusao
              titulo="Excluir atividade pontual"
              descricao={`A tarefa "${tarefa.nome}" será removida permanentemente.`}
              onConfirm={() => onDelete(tarefa.id)}
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_TAREFA_COLORS[tarefa.status]}`}>
            {STATUS_TAREFA_LABELS[tarefa.status]}
          </Badge>
          {tarefa.prazo && (
            <span className={`text-[10px] ${isAtrasado ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {isAtrasado && "⚠ "}
              Prazo: {new Date(tarefa.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        {prox && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs w-full"
            onClick={() => onStatusChange(tarefa.id, prox)}
          >
            Mover para {STATUS_TAREFA_LABELS[prox]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
