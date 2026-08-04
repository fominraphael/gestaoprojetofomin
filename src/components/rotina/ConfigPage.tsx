import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Users,
  Palette,
  BarChart3,
  GripVertical,
} from "lucide-react";
import type { Setor, Kpi } from "@/lib/rotina";

export function ConfigPage() {
  const { isAdmin } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [funcoes, setFuncoes] = useState<{ valor: string; label: string }[]>([]);
  const [setorFuncoes, setSetorFuncoes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Novo setor
  const [novoSetor, setNovoSetor] = useState(false);
  const [setorNome, setSetorNome] = useState("");
  const [setorCor, setSetorCor] = useState("#6366f1");

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
    const [setoresRes, kpisRes, funcoesRes, sfRes] = await Promise.all([
      supabase.from("rotina_setores").select("*").order("ordem"),
      supabase.from("rotina_kpis").select("*").order("ordem"),
      supabase.from("tipos_usuario_config").select("valor, label").order("label"),
      supabase.from("rotina_setor_funcoes").select("setor_id, funcao_valor"),
    ]);
    setSetores((setoresRes.data as any) ?? []);
    setKpis((kpisRes.data as any) ?? []);
    setFuncoes((funcoesRes.data as any) ?? []);
    const sfMap: Record<string, string[]> = {};
    (sfRes.data as any ?? []).forEach((sf: any) => {
      if (!sfMap[sf.setor_id]) sfMap[sf.setor_id] = [];
      sfMap[sf.setor_id].push(sf.funcao_valor);
    });
    setSetorFuncoes(sfMap);
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

  // Setor CRUD
  async function criarSetor() {
    if (!setorNome.trim()) {
      toast.error("Preencha o nome do setor.");
      return;
    }
    const { error } = await supabase.from("rotina_setores").insert({
      nome: setorNome.trim(),
      cor: setorCor,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setor criado.");
    setNovoSetor(false);
    setSetorNome("");
    setSetorCor("#6366f1");
    carregar();
  }

  async function excluirSetor(id: string) {
    if (!confirm("Excluir este setor? As atividades e tarefas vinculadas perderão o vínculo.")) return;
    const { error } = await supabase.from("rotina_setores").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setor excluído.");
    carregar();
  }

  async function salvarSetor(s: Setor) {
    const { error } = await supabase
      .from("rotina_setores")
      .update({ nome: s.nome, cor: s.cor, ordem: s.ordem })
      .eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setor salvo.");
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

  // Funções do setor
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
    // Adicionar primeiro registro de histórico
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
    // Registrar no histórico
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

  const CORES = [
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
    "#3b82f6", "#64748b",
  ];

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie setores, funções vinculadas, indicadores e permissões
        </p>
      </div>

      <Tabs defaultValue="setores" className="w-full">
        <TabsList>
          <TabsTrigger value="setores" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Setores
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Indicadores
          </TabsTrigger>
        </TabsList>

        {/* TAB: Setores */}
        <TabsContent value="setores" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Setores do Núcleo</h2>
            <Button size="sm" onClick={() => setNovoSetor(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo setor
            </Button>
          </div>

          {novoSetor && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Nome do setor</Label>
                    <Input
                      value={setorNome}
                      onChange={(e) => setSetorNome(e.target.value)}
                      placeholder="Ex: Anúncios/Análise"
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
            <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {setores.map((s) => (
                <Card key={s.id} className={!s.ativo ? "opacity-60" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: s.cor }}
                      >
                        {s.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <Input
                        value={s.nome}
                        onChange={(e) => setSetores((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, nome: e.target.value } : x)),
                        )}
                        className="flex-1"
                      />
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
                    <div className="ml-12">
                      <Label className="text-xs text-muted-foreground">
                        Funções vinculadas (quais funções enxergam este setor):
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
                        Se nenhuma função for marcada, todos os usuários com acesso ao módulo enxergam o setor.
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
