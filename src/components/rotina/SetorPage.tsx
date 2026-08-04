import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeft,
  CalendarCheck,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  type Atividade,
  type Tarefa,
  type Frequencia,
  type StatusTarefa,
  FREQUENCIA_LABELS,
  STATUS_TAREFA_LABELS,
  STATUS_TAREFA_COLORS,
  DIAS_SEMANA,
  formatDiasSemana,
} from "@/lib/rotina";

export function SetorPage() {
  const { setorId } = useParams({ from: "/_authenticated/_rotina/rotina/$setorId" });
  const { user, isAdmin } = useAuth();

  const [setor, setSetor] = useState<{ id: string; nome: string; cor: string } | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);

  // Nova atividade
  const [novaAtiv, setNovaAtiv] = useState(false);
  const [ativNome, setAtivNome] = useState("");
  const [ativFrequencia, setAtivFrequencia] = useState<Frequencia>("semanal");
  const [ativDias, setAtivDias] = useState<number[]>([]);
  const [ativPeriodo, setAtivPeriodo] = useState("");
  const [ativDesc, setAtivDesc] = useState("");

  // Nova tarefa
  const [novaTarefa, setNovaTarefa] = useState(false);
  const [tarefaNome, setTarefaNome] = useState("");
  const [tarefaPrazo, setTarefaPrazo] = useState("");
  const [tarefaDesc, setTarefaDesc] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [setorRes, ativRes, tarefaRes] = await Promise.all([
      supabase.from("rotina_setores").select("id, nome, cor").eq("id", setorId).single(),
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
    ]);
    if (setorRes.data) setSetor(setorRes.data as any);
    setAtividades((ativRes.data as any) ?? []);
    setTarefas((tarefaRes.data as any) ?? []);
    setLoading(false);
  }, [setorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criarAtividade() {
    if (!ativNome.trim()) {
      toast.error("Preencha o nome da atividade.");
      return;
    }
    const { error } = await supabase.from("rotina_atividades").insert({
      nome: ativNome.trim(),
      setor_id: setorId,
      frequencia: ativFrequencia,
      dias_semana: ativFrequencia === "semanal" ? ativDias : [],
      periodo_mensal: ativFrequencia === "mensal" ? ativPeriodo.trim() || null : null,
      descricao: ativDesc.trim(),
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Atividade criada.");
    setNovaAtiv(false);
    setAtivNome("");
    setAtivDias([]);
    setAtivPeriodo("");
    setAtivDesc("");
    carregar();
  }

  async function criarTarefa() {
    if (!tarefaNome.trim()) {
      toast.error("Preencha o nome da tarefa.");
      return;
    }
    const { error } = await supabase.from("rotina_tarefas").insert({
      nome: tarefaNome.trim(),
      setor_id: setorId,
      prazo: tarefaPrazo || null,
      descricao: tarefaDesc.trim(),
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tarefa criada.");
    setNovaTarefa(false);
    setTarefaNome("");
    setTarefaPrazo("");
    setTarefaDesc("");
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

  function toggleDia(d: number) {
    setAtivDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  const tarefasPorStatus = {
    a_fazer: tarefas.filter((t) => t.status === "a_fazer"),
    fazendo: tarefas.filter((t) => t.status === "fazendo"),
    concluido: tarefas.filter((t) => t.status === "concluido"),
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/rotina">
            <ArrowLeft className="w-4 h-4 mr-1" /> HUB
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {setor && (
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: setor.cor }}
          >
            {setor.nome.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{setor?.nome ?? "Setor"}</h1>
          <p className="text-sm text-muted-foreground">Atividades de rotina e tarefas pontuais</p>
        </div>
      </div>

      <Tabs defaultValue="rotina" className="w-full">
        <TabsList>
          <TabsTrigger value="rotina" className="flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" /> Rotina
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" /> Tarefas Pontuais
            {tarefas.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                {tarefasPorStatus.a_fazer.length + tarefasPorStatus.fazendo.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Rotina */}
        <TabsContent value="rotina" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Atividades de Rotina</h2>
            <Button size="sm" onClick={() => setNovaAtiv(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova atividade
            </Button>
          </div>

          {novaAtiv && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Nome da atividade"
                  value={ativNome}
                  onChange={(e) => setAtivNome(e.target.value)}
                />
                <div className="flex gap-3 flex-wrap">
                  <div className="w-48">
                    <Select
                      value={ativFrequencia}
                      onValueChange={(v) => setAtivFrequencia(v as Frequencia)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FREQUENCIA_LABELS) as Frequencia[]).map((f) => (
                          <SelectItem key={f} value={f}>
                            {FREQUENCIA_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {ativFrequencia === "semanal" && (
                    <div className="flex gap-1">
                      {DIAS_SEMANA.map((d) => (
                        <label
                          key={d.valor}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs cursor-pointer hover:bg-accent"
                        >
                          <Checkbox
                            checked={ativDias.includes(d.valor)}
                            onCheckedChange={() => toggleDia(d.valor)}
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>
                  )}
                  {ativFrequencia === "mensal" && (
                    <Input
                      placeholder='Período (ex: "até dia 3", "última semana")'
                      className="w-64"
                      value={ativPeriodo}
                      onChange={(e) => setAtivPeriodo(e.target.value)}
                    />
                  )}
                </div>
                <Textarea
                  placeholder="Descrição da atividade"
                  value={ativDesc}
                  onChange={(e) => setAtivDesc(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={criarAtividade}>
                    Criar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNovaAtiv(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : atividades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade de rotina cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {atividades.map((a) => (
                <Link
                  key={a.id}
                  to="/rotina/atividade/$id"
                  params={{ id: a.id }}
                >
                  <Card className="hover:border-primary/50 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{a.nome}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {FREQUENCIA_LABELS[a.frequencia]}
                          </Badge>
                          {a.frequencia === "semanal" && a.dias_semana && a.dias_semana.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatDiasSemana(a.dias_semana)}
                            </span>
                          )}
                          {a.frequencia === "mensal" && a.periodo_mensal && (
                            <span className="text-xs text-muted-foreground">
                              {a.periodo_mensal}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Tarefas */}
        <TabsContent value="tarefas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Tarefas Pontuais</h2>
            <Button size="sm" onClick={() => setNovaTarefa(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova tarefa
            </Button>
          </div>

          {novaTarefa && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Nome da tarefa"
                  value={tarefaNome}
                  onChange={(e) => setTarefaNome(e.target.value)}
                />
                <div className="flex gap-3">
                  <div className="w-48">
                    <Input
                      type="date"
                      placeholder="Prazo"
                      value={tarefaPrazo}
                      onChange={(e) => setTarefaPrazo(e.target.value)}
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={tarefaDesc}
                  onChange={(e) => setTarefaDesc(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={criarTarefa}>
                    Criar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNovaTarefa(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : tarefas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa pontual cadastrada.</p>
          ) : (
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
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    onStatusChange={alterarStatusTarefa}
                  />
                ))}
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
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    onStatusChange={alterarStatusTarefa}
                  />
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
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    onStatusChange={alterarStatusTarefa}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TarefaCard({
  tarefa,
  onStatusChange,
}: {
  tarefa: Tarefa;
  onStatusChange: (id: string, status: StatusTarefa) => void;
}) {
  const proximoStatus: Record<StatusTarefa, StatusTarefa | null> = {
    a_fazer: "fazendo",
    fazendo: "concluido",
    concluido: null,
  };
  const prox = proximoStatus[tarefa.status];

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <Link
          to="/rotina/tarefa/$id"
          params={{ id: tarefa.id }}
          className="font-medium text-sm hover:text-primary transition-colors block"
        >
          {tarefa.nome}
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_TAREFA_COLORS[tarefa.status]}`}>
            {STATUS_TAREFA_LABELS[tarefa.status]}
          </Badge>
          {tarefa.prazo && (
            <span className="text-[10px] text-muted-foreground">
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
