import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Users,
  BarChart3,
  Search,
  UserCheck,
  UserX,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { Setor, Kpi } from "@/lib/rotina";

const EMOJIS = [
  "📋", "🎯", "📝", "💼", "📊", "📈", "🔧", "⚙️", "🗂️", "📁",
  "🚀", "💡", "📌", "🔖", "🏷️", "📎", "✅", "⭐", "🔥", "💎",
  "🎨", "🏗️", "🛠️", "📦", "🗄️", "🗓️", "⏰", "📍", "🔗", "📄",
];

const CORES = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#64748b",
];

export function ConfigPage() {
  const { isAdmin } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [funcoes, setFuncoes] = useState<{ valor: string; label: string }[]>([]);
  const [setorFuncoes, setSetorFuncoes] = useState<Record<string, string[]>>({});
  const [usuarios, setUsuarios] = useState<{ id: string; username: string; nome_fantasia: string | null }[]>([]);
  const [setorUsuarios, setSetorUsuarios] = useState<Record<string, string[]>>({});
  const [buscaUsuario, setBuscaUsuario] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Nova frente
  const [novoSetor, setNovoSetor] = useState(false);
  const [setorNome, setSetorNome] = useState("");
  const [setorCor, setSetorCor] = useState("#6366f1");
  const [setorIcone, setSetorIcone] = useState("📋");
  const [setorDesc, setSetorDesc] = useState("");

  // Novo KPI
  const [novoKpi, setNovoKpi] = useState(false);
  const [kpiNome, setKpiNome] = useState("");
  const [kpiUnidade, setKpiUnidade] = useState("");
  const [kpiValor, setKpiValor] = useState("");
  const [kpiMes, setKpiMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    const [setoresRes, kpisRes, funcoesRes, sfRes, profilesRes, suRes] = await Promise.all([
      supabase.from("rotina_setores").select("*").order("ordem"),
      supabase.from("rotina_kpis").select("*").order("ordem"),
      supabase.from("tipos_usuario_config").select("valor, label").order("label"),
      supabase.from("rotina_setor_funcoes").select("setor_id, funcao_valor"),
      supabase.from("profiles").select("id, username, nome_fantasia").eq("ativo", true).order("username"),
      supabase.from("rotina_setor_usuarios").select("setor_id, user_id"),
    ]);
    setSetores((setoresRes.data as any) ?? []);
    setKpis((kpisRes.data as any) ?? []);
    setFuncoes((funcoesRes.data as any) ?? []);
    setUsuarios((profilesRes.data as any) ?? []);
    const sfMap: Record<string, string[]> = {};
    (sfRes.data as any ?? []).forEach((sf: any) => {
      if (!sfMap[sf.setor_id]) sfMap[sf.setor_id] = [];
      sfMap[sf.setor_id].push(sf.funcao_valor);
    });
    setSetorFuncoes(sfMap);
    const suMap: Record<string, string[]> = {};
    (suRes.data as any ?? []).forEach((su: any) => {
      if (!suMap[su.setor_id]) suMap[su.setor_id] = [];
      suMap[su.setor_id].push(su.user_id);
    });
    setSetorUsuarios(suMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  // Mover ordem da frente (para cima ou para baixo)
  async function moverSetor(index: number, direcao: "up" | "down") {
    const targetIndex = direcao === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= setores.length) return;

    const novisetores = [...setores];
    const temp = novisetores[index];
    novisetores[index] = novisetores[targetIndex];
    novisetores[targetIndex] = temp;

    // Atualiza a propriedade ordem com base no índice no array
    const atualizados = novisetores.map((s, idx) => ({ ...s, ordem: idx }));
    setSetores(atualizados);

    // Persiste a nova ordem no Supabase
    const updates = atualizados.map((s) =>
      supabase.from("rotina_setores").update({ ordem: s.ordem }).eq("id", s.id)
    );

    const results = await Promise.all(updates);
    const erro = results.find((r) => r.error);
    if (erro) {
      toast.error("Erro ao salvar nova ordem das frentes.");
      carregar();
    } else {
      toast.success("Ordem atualizada com sucesso.");
    }
  }

  // Frente CRUD
  async function criarSetor() {
    if (!setorNome.trim()) {
      toast.error("Preencha o nome da frente.");
      return;
    }
    const { error } = await supabase.from("rotina_setores").insert({
      nome: setorNome.trim(),
      cor: setorCor,
      icone: setorIcone,
      descricao: setorDesc.trim(),
      ordem: setores.length,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Frente criada.");
    setNovoSetor(false);
    setSetorNome("");
    setSetorCor("#6366f1");
    setSetorIcone("📋");
    setSetorDesc("");
    carregar();
  }

  async function excluirSetor(id: string) {
    if (!confirm("Excluir esta frente? As atividades e tarefas vinculadas perderão o vínculo.")) return;
    const { error } = await supabase.from("rotina_setores").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Frente excluída.");
    carregar();
  }

  async function salvarSetor(s: Setor) {
    const { error } = await supabase
      .from("rotina_setores")
      .update({ nome: s.nome, cor: s.cor, icone: s.icone, descricao: s.descricao, ordem: s.ordem })
      .eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Frente salva.");
  }

  async function toggleSetorAtivo(s: Setor) {
    const { error } = await supabase
      .from("rotina_setores")
      .update({ ativo: !s.ativo })
      .eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    carregar();
  }

  // Funções da frente
  async function toggleFuncaoSetor(setorId: string, funcaoValor: string) {
    const current = setorFuncoes[setorId] ?? [];
    const has = current.includes(funcaoValor);
    if (has) {
      const { error } = await supabase
        .from("rotina_setor_funcoes")
        .delete()
        .eq("setor_id", setorId)
        .eq("funcao_valor", funcaoValor);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("rotina_setor_funcoes").insert({
        setor_id: setorId,
        funcao_valor: funcaoValor,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    carregar();
  }

  // Usuários da frente
  async function toggleUsuarioSetor(setorId: string, userId: string) {
    const current = setorUsuarios[setorId] ?? [];
    const has = current.includes(userId);
    if (has) {
      const { error } = await supabase
        .from("rotina_setor_usuarios")
        .delete()
        .eq("setor_id", setorId)
        .eq("user_id", userId);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("rotina_setor_usuarios").insert({
        setor_id: setorId,
        user_id: userId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    carregar();
  }

  // KPI CRUD
  async function criarKpi() {
    if (!kpiNome.trim()) {
      toast.error("Preencha o nome do indicador.");
      return;
    }
    const { data, error } = await supabase
      .from("rotina_kpis")
      .insert({
        nome: kpiNome.trim(),
        unidade: kpiUnidade.trim(),
        valor_atual: Number(kpiValor) || 0,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data && kpiMes) {
      await supabase.from("rotina_kpi_historico").insert({
        kpi_id: data.id,
        mes: kpiMes,
        valor: Number(kpiValor) || 0,
      });
    }
    toast.success("Indicador criado.");
    setNovoKpi(false);
    setKpiNome("");
    setKpiUnidade("");
    setKpiValor("");
    carregar();
  }

  async function atualizarKpiValor(kpi: Kpi, novoValor: string) {
    const valor = Number(novoValor) || 0;
    const { error } = await supabase
      .from("rotina_kpis")
      .update({ valor_atual: valor })
      .eq("id", kpi.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("rotina_kpi_historico").upsert(
      { kpi_id: kpi.id, mes: kpiMes, valor },
      { onConflict: "kpi_id,mes" },
    );
    carregar();
  }

  async function excluirKpi(id: string) {
    if (!confirm("Excluir este indicador e todo seu histórico?")) return;
    const { error } = await supabase.from("rotina_kpis").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Indicador excluído.");
    carregar();
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie frentes, funções vinculadas, indicadores e permissões
        </p>
      </div>

      <Tabs defaultValue="frentes" className="w-full">
        <TabsList>
          <TabsTrigger value="frentes" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Frentes
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Indicadores
          </TabsTrigger>
        </TabsList>

        {/* TAB: Frentes */}
        <TabsContent value="frentes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Frentes de Trabalho</h2>
            <Button size="sm" onClick={() => setNovoSetor(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova frente
            </Button>
          </div>

          {novoSetor && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3 items-start flex-wrap">
                  <div>
                    <Label>Ícone</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          className={`w-8 h-8 rounded-md border-2 text-lg flex items-center justify-center transition-all ${
                            setorIcone === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                          }`}
                          onClick={() => setSetorIcone(e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label>Nome da frente</Label>
                    <Input
                      value={setorNome}
                      onChange={(e) => setSetorNome(e.target.value)}
                      placeholder="Ex: Gestão de Anúncios"
                    />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-1 mt-1">
                      {CORES.map((c) => (
                        <button
                          key={c}
                          className={`w-7 h-7 rounded-md border-2 transition-all ${
                            setorCor === c ? "border-white scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => setSetorCor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={setorDesc}
                    onChange={(e) => setSetorDesc(e.target.value)}
                    placeholder="Breve descrição sobre esta frente de trabalho"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={criarSetor}>
                    <Save className="w-3.5 h-3.5 mr-1" /> Criar
                  </Button>
                  <Button variant="ghost" onClick={() => setNovoSetor(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : setores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma frente cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {setores.map((s, index) => (
                <Card key={s.id} className={!s.ativo ? "opacity-60" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          disabled={index === 0}
                          onClick={() => moverSetor(index, "up")}
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          disabled={index === setores.length - 1}
                          onClick={() => moverSetor(index, "down")}
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <button
                        className="w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all hover:bg-accent"
                        style={{ borderColor: s.cor + "60" }}
                      >
                        {s.icone || "📋"}
                      </button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <Input
                          value={s.nome}
                          onChange={(e) => setSetores((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, nome: e.target.value } : x)),
                          )}
                          className="font-medium"
                        />
                        <Input
                          value={s.descricao}
                          onChange={(e) => setSetores((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, descricao: e.target.value } : x)),
                          )}
                          placeholder="Descrição (opcional)"
                          className="text-xs h-7"
                        />
                      </div>
                      <div className="flex gap-1">
                        {CORES.map((c) => (
                          <button
                            key={c}
                            className={`w-5 h-5 rounded border transition-all ${
                              s.cor === c ? "border-white scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                              setSetores((prev) =>
                                prev.map((x) => (x.id === s.id ? { ...x, cor: c } : x)),
                              );
                              supabase.from("rotina_setores").update({ cor: c }).eq("id", s.id);
                            }}
                          />
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSetorAtivo(s)}
                      >
                        <Badge variant={s.ativo ? "default" : "secondary"} className="text-[10px]">
                          {s.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </Button>
                      <Button size="sm" onClick={() => salvarSetor(s)}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => excluirSetor(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>

                    {/* Funções vinculadas */}
                    <div className="ml-14">
                      <Label className="text-xs text-muted-foreground">
                        Funções vinculadas (quais funções enxergam esta frente):
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {funcoes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma função cadastrada em tipos_usuario_config
                          </span>
                        ) : (
                          funcoes.map((f) => {
                            const has = (setorFuncoes[s.id] ?? []).includes(f.valor);
                            return (
                              <label
                                key={f.valor}
                                className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs cursor-pointer hover:bg-accent"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-primary"
                                  checked={has}
                                  onChange={() => toggleFuncaoSetor(s.id, f.valor)}
                                />
                                {f.label}
                              </label>
                            );
                          })
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Se nenhuma função for marcada, todos os usuários com acesso ao módulo enxergam a frente.
                      </p>
                    </div>

                    {/* Usuários vinculados */}
                    <div className="ml-14 mt-3 pt-3 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                          Usuários vinculados (quais usuários enxergam esta frente):
                        </Label>
                        {(setorUsuarios[s.id] ?? []).length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {(setorUsuarios[s.id] ?? []).length} vinculado{(setorUsuarios[s.id] ?? []).length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>

                      {/* Usuários já vinculados como Badges/Chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                        {(setorUsuarios[s.id] ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            Nenhum usuário vinculado (todos com acesso ao módulo enxergam a frente).
                          </span>
                        ) : (
                          usuarios
                            .filter((u) => (setorUsuarios[s.id] ?? []).includes(u.id))
                            .map((u) => (
                              <Badge
                                key={u.id}
                                variant="outline"
                                className="bg-primary/10 border-primary/30 text-primary text-xs gap-1.5 py-1 px-2.5 flex items-center font-normal"
                              >
                                <span>{u.nome_fantasia || u.username}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleUsuarioSetor(s.id, u.id)}
                                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                  title="Remover vínculo"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))
                        )}
                      </div>

                      {/* Campo de busca (digite para buscar e adicionar) */}
                      <div className="relative">
                        <div className="relative max-w-sm">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Digite para buscar e vincular usuário…"
                            value={buscaUsuario[s.id] ?? ""}
                            onChange={(e) => setBuscaUsuario((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="h-8 text-xs pl-8"
                          />
                        </div>

                        {/* Lista de resultados filtrados (só aparece se houver texto digitado) */}
                        {(buscaUsuario[s.id] ?? "").trim().length > 0 && (
                          <div className="mt-1 p-2 bg-popover border border-border rounded-md shadow-md max-w-sm max-h-48 overflow-y-auto space-y-1 z-10 relative">
                            {(() => {
                              const termo = (buscaUsuario[s.id] ?? "").toLowerCase().trim();
                              const vinculadosIds = setorUsuarios[s.id] ?? [];
                              const resultados = usuarios.filter((u) => {
                                const nome = (u.nome_fantasia || u.username).toLowerCase();
                                const username = u.username.toLowerCase();
                                return nome.includes(termo) || username.includes(termo);
                              });

                              if (resultados.length === 0) {
                                return (
                                  <p className="text-xs text-muted-foreground p-1 text-center">
                                    Nenhum usuário encontrado para "{buscaUsuario[s.id]}".
                                  </p>
                                );
                              }

                              return resultados.map((u) => {
                                const isVinculado = vinculadosIds.includes(u.id);
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      toggleUsuarioSetor(s.id, u.id);
                                    }}
                                    className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${
                                      isVinculado
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "hover:bg-accent text-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {isVinculado ? (
                                        <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                      ) : (
                                        <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="truncate">{u.nome_fantasia || u.username}</span>
                                      {u.nome_fantasia && (
                                        <span className="text-[10px] text-muted-foreground font-normal">
                                          ({u.username})
                                        </span>
                                      )}
                                    </div>
                                    <Badge
                                      variant={isVinculado ? "default" : "outline"}
                                      className="text-[9px] h-4 px-1 shrink-0"
                                    >
                                      {isVinculado ? "Vinculado" : "Adicionar"}
                                    </Badge>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-1">
                        {(setorUsuarios[s.id] ?? []).length === 0
                          ? "Nenhum usuário vinculado especificamente — todos os usuários com acesso ao módulo enxergam esta frente."
                          : "Apenas os usuários vinculados acima (e administradores) enxergam esta frente."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: KPIs */}
        <TabsContent value="kpis" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Indicadores (KPIs)</h2>
            <Button size="sm" onClick={() => setNovoKpi(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo indicador
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Label className="text-muted-foreground">Mês de referência:</Label>
            <Input
              type="month"
              value={kpiMes}
              onChange={(e) => setKpiMes(e.target.value)}
              className="w-44"
            />
          </div>

          {novoKpi && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Nome do indicador</Label>
                    <Input
                      value={kpiNome}
                      onChange={(e) => setKpiNome(e.target.value)}
                      placeholder="Ex: Tempo médio de resposta"
                    />
                  </div>
                  <div className="w-32">
                    <Label>Unidade</Label>
                    <Input
                      value={kpiUnidade}
                      onChange={(e) => setKpiUnidade(e.target.value)}
                      placeholder="dias, %, R$, un"
                    />
                  </div>
                  <div className="w-32">
                    <Label>Valor atual</Label>
                    <Input
                      type="number"
                      value={kpiValor}
                      onChange={(e) => setKpiValor(e.target.value)}
                    />
                  </div>
                  <Button onClick={criarKpi}>
                    <Save className="w-3.5 h-3.5 mr-1" /> Criar
                  </Button>
                  <Button variant="ghost" onClick={() => setNovoKpi(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum indicador cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {kpis.map((k) => (
                <Card key={k.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{k.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        Unidade: {k.unidade || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={k.valor_atual}
                        onChange={(e) => atualizarKpiValor(k, e.target.value)}
                        className="w-28 h-8"
                      />
                      <span className="text-xs text-muted-foreground">{k.unidade}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => excluirKpi(k.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
