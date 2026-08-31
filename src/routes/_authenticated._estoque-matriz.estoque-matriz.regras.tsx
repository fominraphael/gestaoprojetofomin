import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModuleAccessDenied } from "@/components/ModuleAccessDenied";
import {
  ACOES_MATRIZ,
  CANAIS,
  CLASSIFICACOES,
  NIVEIS_BASE_PADRAO,
  ROTULO_NIVEL,
  normalizaNiveis,
  type ClassificacaoEstoque,
  type FaixaDias,
  type GatilhoLeads,
  type NivelBase,
  type RegraEstoque,
  type TipoRegra,
} from "@/lib/estoque-motor";

import {
  getEmpresasNbs,
  getFaixas,
  getFinalidades,
  getOrigens,
  getRegras,
  upsertRegra,
  type EmpresaNbs,
  type Finalidade,
  type Origem,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/regras")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Configurações — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Cadastro de origens, empresas NBS, finalidades, faixas de dias e a matriz de regras de precificação.",
      },
      { property: "og:title", content: "Configurações — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Matriz configurável de precificação por classificação e faixa de dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueRegras,
});

const TIPOS: { value: TipoRegra; label: string }[] = [
  { value: "base", label: "Base (define o valor inicial)" },
  { value: "ajuste", label: "Ajuste (aplica sobre o valor atual)" },
  { value: "finalidade", label: "Finalidade (move para repasse)" },
];

interface FormRegra extends Partial<RegraEstoque> {
  classificacao: ClassificacaoEstoque;
  faixa_id: string;
}

function EstoqueRegras() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState<FormRegra | null>(null);
  const [gatilhos, setGatilhos] = useState<GatilhoLeads[]>([]);
  const [niveis, setNiveis] = useState<NivelBase[]>(NIVEIS_BASE_PADRAO);

  const { data: origens = [] } = useQuery({ queryKey: ["estoque", "origens"], queryFn: getOrigens });
  const { data: empresas = [] } = useQuery({ queryKey: ["estoque", "nbs"], queryFn: getEmpresasNbs });
  const { data: finalidades = [] } = useQuery({
    queryKey: ["estoque", "finalidades"],
    queryFn: getFinalidades,
  });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: regras = [] } = useQuery({ queryKey: ["estoque", "regras"], queryFn: getRegras });

  if (!isAdmin) return <ModuleAccessDenied label="Configurações de Estoque" />;

  const regraDe = (c: ClassificacaoEstoque, f: FaixaDias) =>
    regras.find((r) => r.classificacao === c && r.faixa_id === f.id);

  const abrir = (c: ClassificacaoEstoque, f: FaixaDias) => {
    const existente = regraDe(c, f);
    setEditando(
      existente ?? {
        classificacao: c,
        faixa_id: f.id,
        tipo_regra: "ajuste",
        percentual: 0,
        arredonda_990: true,
        piso_fipe_ativo: false,
        teto_fipe_ativo: false,
        canais_exigidos: [],
        gera_tarefa: false,
        ativo: true,
        checagem_mercado_ativa: false,
        canal_referencia: "WebMotors",
        min_fotos: 2,
        acao_aceleradores: false,
        acao_fotos_ia: false,
        acao_repescagem: false,
        acao_auditoria: false,
      },
    );
    setGatilhos(existente?.leads ?? []);
    setNiveis(normalizaNiveis(existente?.fallback_niveis));
  };

  /** Move um nível para cima/baixo, mantendo a ordem sequencial persistida. */
  const moverNivel = (i: number, delta: number) =>
    setNiveis((arr) => {
      const destino = i + delta;
      if (destino < 0 || destino >= arr.length) return arr;
      const copia = [...arr];
      const [item] = copia.splice(i, 1);
      copia.splice(destino, 0, item!);
      return copia.map((n, idx) => ({ ...n, ordem: idx }));
    });

  const setNivel = (i: number, patch: Partial<NivelBase>) =>
    setNiveis((arr) => arr.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  const salvar = async () => {
    if (!editando) return;
    try {
      const ordenados = niveis.map((n, i) => ({ ...n, ordem: i }));
      await upsertRegra(
        { ...editando, fallback_niveis: ordenados } as RegraEstoque,
        gatilhos,
      );
      toast.success("Regra salva.");
      setEditando(null);
      await qc.invalidateQueries({ queryKey: ["estoque", "regras"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar regra");
    }
  };

  const set = <K extends keyof RegraEstoque>(campo: K, valor: RegraEstoque[K]) =>
    setEditando((r) => (r ? { ...r, [campo]: valor } : r));


  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toda a regra de negócio do módulo é configurada aqui — nada é fixo no código.
        </p>
      </div>

      <Tabs defaultValue="matriz">
        <TabsList>
          <TabsTrigger value="matriz">Matriz de regras</TabsTrigger>
          <TabsTrigger value="faixas">Faixas de dias</TabsTrigger>
          <TabsTrigger value="faixas-km">Faixas de KM</TabsTrigger>

          <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
        </TabsList>

        <TabsContent value="matriz" className="mt-4">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Classificação</th>
                  {faixas.map((f) => (
                    <th key={f.id} className="px-3 py-2 text-left font-medium">
                      {f.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASSIFICACOES.map((c) => (
                  <tr key={c} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{c}</td>
                    {faixas.map((f) => {
                      const r = regraDe(c, f);
                      return (
                        <td key={f.id} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => abrir(c, f)}
                            className="w-full rounded-lg border border-border px-2 py-1.5 text-left hover:bg-muted/50"
                          >
                            {r ? (
                              <span className="space-x-1">
                                <Badge variant="secondary">{r.tipo_regra}</Badge>
                                <span className="text-xs">{r.percentual}%</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Configurar</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="faixas" className="mt-4">
          <FaixasEditor faixas={faixas} />
        </TabsContent>

        <TabsContent value="faixas-km" className="mt-4">
          <FaixasKmEditor />
        </TabsContent>


        <TabsContent value="cadastros" className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-3">
          <OrigensEditor origens={origens} />
          <EmpresasNbsEditor empresas={empresas} origens={origens} />
          <FinalidadesEditor finalidades={finalidades} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Regra {editando?.classificacao} ·{" "}
              {faixas.find((f) => f.id === editando?.faixa_id)?.nome}
            </DialogTitle>
          </DialogHeader>

          {editando && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Tipo de regra</Label>
                  <Select
                    value={editando.tipo_regra}
                    onValueChange={(v) => set("tipo_regra", v as TipoRegra)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editando.percentual ?? 0}
                    onChange={(e) => set("percentual", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!editando.arredonda_990}
                    onCheckedChange={(c) => set("arredonda_990", c === true)}
                  />
                  Arredondar para final 990
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!editando.ativo}
                    onCheckedChange={(c) => set("ativo", c === true)}
                  />
                  Regra ativa
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!editando.piso_fipe_ativo}
                      onCheckedChange={(c) => set("piso_fipe_ativo", c === true)}
                    />
                    Piso FIPE (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!editando.piso_fipe_ativo}
                    value={editando.piso_fipe_percentual ?? ""}
                    onChange={(e) =>
                      set("piso_fipe_percentual", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!editando.teto_fipe_ativo}
                      onCheckedChange={(c) => set("teto_fipe_ativo", c === true)}
                    />
                    Teto FIPE (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!editando.teto_fipe_ativo}
                    value={editando.teto_fipe_percentual ?? ""}
                    onChange={(e) =>
                      set("teto_fipe_percentual", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <div>
                  <Label>Base do valor — níveis de fallback</Label>
                  <p className="text-xs text-muted-foreground">
                    O sistema percorre os níveis ativos, na ordem abaixo, e usa o primeiro que
                    retornar um valor válido.
                  </p>
                </div>
                {niveis.map((n, i) => (
                  <div key={n.tipo} className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
                    <label className="flex items-center gap-2 text-sm flex-1 min-w-[220px]">
                      <Checkbox
                        checked={n.ativo}
                        onCheckedChange={(c) => setNivel(i, { ativo: c === true })}
                      />
                      {ROTULO_NIVEL[n.tipo]}
                    </label>
                    {n.tipo === "fipe_fixo" ? (
                      <div className="space-y-1 w-28">
                        <Label className="text-xs">% da FIPE</Label>
                        <Input
                          type="number"
                          step="0.01"
                          disabled={!n.ativo}
                          value={n.percentual ?? 100}
                          onChange={(e) => setNivel(i, { percentual: Number(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1 w-24">
                          <Label className="text-xs">Dias</Label>
                          <Input
                            type="number"
                            disabled={!n.ativo}
                            value={n.dias ?? (n.tipo === "hist_curto" ? 30 : 60)}
                            onChange={(e) => setNivel(i, { dias: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1 w-28">
                          <Label className="text-xs" title="Ajuste aplicado sobre a média do histórico">
                            Ajuste (%)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            disabled={!n.ativo}
                            value={n.ajuste_percentual ?? 0}
                            onChange={(e) =>
                              setNivel(i, { ajuste_percentual: Number(e.target.value) })
                            }
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => moverNivel(i, -1)}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => moverNivel(i, 1)}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border p-3">
                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!editando.checagem_mercado_ativa}
                      onCheckedChange={(c) => set("checagem_mercado_ativa", c === true)}
                    />
                    Ativar checagem de mercado
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Se o valor calculado ficar abaixo da média do canal de referência, o valor de
                    anúncio passa a ser essa média.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Canal de referência</Label>
                  <Select
                    value={editando.canal_referencia ?? "WebMotors"}
                    onValueChange={(v) => set("canal_referencia", v)}
                  >
                    <SelectTrigger disabled={!editando.checagem_mercado_ativa}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANAIS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Mínimo de fotos para considerar fotografado</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editando.min_fotos ?? 2}
                    onChange={(e) => set("min_fotos", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <Label>Operacional (gera itens na aba “Ações da Matriz”)</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACOES_MATRIZ.map((a) => (
                    <label key={a.tipo} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!editando[a.campo]}
                        onCheckedChange={(c) =>
                          set(a.campo as "acao_aceleradores", c === true)
                        }
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>


              <div className="space-y-2">
                <Label>Canais exigidos para o anúncio</Label>
                <div className="flex flex-wrap gap-3">
                  {CANAIS.map((canal) => (
                    <label key={canal} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(editando.canais_exigidos ?? []).includes(canal)}
                        onCheckedChange={(c) => {
                          const atuais = editando.canais_exigidos ?? [];
                          set(
                            "canais_exigidos",
                            c === true ? [...atuais, canal] : atuais.filter((x) => x !== canal),
                          );
                        }}
                      />
                      {canal}
                    </label>
                  ))}
                </div>
              </div>

              {editando.tipo_regra === "finalidade" && (
                <div className="space-y-1">
                  <Label>Nova finalidade</Label>
                  <Select
                    value={editando.nova_finalidade ?? ""}
                    onValueChange={(v) => set("nova_finalidade", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalidades.map((f) => (
                        <SelectItem key={f.id} value={f.nome}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!editando.gera_tarefa}
                    onCheckedChange={(c) => set("gera_tarefa", c === true)}
                  />
                  Gerar tarefa de ação de leads
                </label>
                {editando.gera_tarefa && (
                  <Input
                    placeholder="Nome da tarefa"
                    value={editando.nome_tarefa ?? ""}
                    onChange={(e) => set("nome_tarefa", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Gatilhos por leads</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setGatilhos((g) => [
                        ...g,
                        { leads_min: 0, leads_max: null, percentual: 0, ordem: g.length },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4" /> Gatilho
                  </Button>
                </div>
                {gatilhos.map((g, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Leads mín.</Label>
                      <Input
                        type="number"
                        value={g.leads_min ?? ""}
                        onChange={(e) =>
                          setGatilhos((arr) =>
                            arr.map((x, j) =>
                              j === i
                                ? { ...x, leads_min: e.target.value === "" ? null : Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Leads máx.</Label>
                      <Input
                        type="number"
                        value={g.leads_max ?? ""}
                        onChange={(e) =>
                          setGatilhos((arr) =>
                            arr.map((x, j) =>
                              j === i
                                ? { ...x, leads_max: e.target.value === "" ? null : Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Percentual (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={g.percentual}
                        onChange={(e) =>
                          setGatilhos((arr) =>
                            arr.map((x, j) =>
                              j === i ? { ...x, percentual: Number(e.target.value) } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setGatilhos((arr) => arr.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>
              <Save className="w-4 h-4" /> Salvar regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FaixasEditor({ faixas }: { faixas: FaixaDias[] }) {
  const qc = useQueryClient();
  const [nova, setNova] = useState({ nome: "", dia_inicio: 0, dia_fim: 0 });

  const criar = async () => {
    if (!nova.nome.trim()) return toast.error("Informe o nome da faixa.");
    const { error } = await supabase.from("estoque_faixas_dias").insert({
      nome: nova.nome.trim(),
      dia_inicio: nova.dia_inicio,
      dia_fim: nova.dia_fim,
      ordem: faixas.length,
      ativo: true,
    } as never);
    if (error) return toast.error(error.message);
    setNova({ nome: "", dia_inicio: 0, dia_fim: 0 });
    toast.success("Faixa criada.");
    await qc.invalidateQueries({ queryKey: ["estoque", "faixas"] });
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("estoque_faixas_dias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Faixa removida.");
    await qc.invalidateQueries({ queryKey: ["estoque", "faixas"] });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="space-y-2">
        {faixas.map((f) => (
          <div key={f.id} className="flex items-center gap-3 text-sm border-b border-border pb-2">
            <span className="font-medium">{f.nome}</span>
            <span className="text-muted-foreground">
              {f.dia_inicio} a {f.dia_fim} dias
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto text-destructive"
              onClick={() => remover(f.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Nome</Label>
          <Input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
        </div>
        <div className="space-y-1 w-24">
          <Label className="text-xs">Início</Label>
          <Input
            type="number"
            value={nova.dia_inicio}
            onChange={(e) => setNova({ ...nova, dia_inicio: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1 w-24">
          <Label className="text-xs">Fim</Label>
          <Input
            type="number"
            value={nova.dia_fim}
            onChange={(e) => setNova({ ...nova, dia_fim: Number(e.target.value) })}
          />
        </div>
        <Button onClick={criar}>
          <Plus className="w-4 h-4" /> Adicionar faixa
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------ Cadastros base ------------------------------ */

function OrigensEditor({ origens }: { origens: Origem[] }) {
  const qc = useQueryClient();
  const [nova, setNova] = useState({ codigo: "", nome: "" });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["estoque", "origens"] });

  const criar = async () => {
    const codigo = Number(nova.codigo);
    if (!Number.isInteger(codigo)) return toast.error("Informe um código numérico válido.");
    if (!nova.nome.trim()) return toast.error("Informe o nome da origem.");
    const { error } = await supabase.from("estoque_origens").insert({
      codigo,
      nome: nova.nome.trim(),
      ativo: true,
    } as never);
    if (error) return toast.error(error.message);
    setNova({ codigo: "", nome: "" });
    toast.success("Origem cadastrada.");
    await invalidar();
  };

  const alternarAtivo = async (o: Origem) => {
    const { error } = await supabase
      .from("estoque_origens")
      .update({ ativo: !o.ativo } as never)
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    await invalidar();
  };

  const remover = async (id: string) => {
    if (!window.confirm("Excluir esta origem? Empresas NBS vinculadas também serão removidas."))
      return;
    const { error } = await supabase.from("estoque_origens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Origem removida.");
    await invalidar();
    await qc.invalidateQueries({ queryKey: ["estoque", "nbs"] });
  };

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">Origens</h2>
      <ul className="space-y-1 text-sm">
        {origens.map((o) => (
          <li key={o.id} className="flex items-center gap-2 border-b border-border pb-1">
            <span className="font-medium">
              {o.codigo} — {o.nome}
            </span>
            {!o.ativo && <Badge variant="secondary">Inativa</Badge>}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() => alternarAtivo(o)}
            >
              {o.ativo ? "Desativar" : "Ativar"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => remover(o.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
        {origens.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhuma origem cadastrada.</li>
        )}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 w-24">
          <Label className="text-xs">Código</Label>
          <Input
            type="number"
            value={nova.codigo}
            onChange={(e) => setNova({ ...nova, codigo: e.target.value })}
          />
        </div>
        <div className="space-y-1 flex-1 min-w-32">
          <Label className="text-xs">Nome</Label>
          <Input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
        </div>
        <Button size="sm" onClick={criar}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>
    </Card>
  );
}

function EmpresasNbsEditor({
  empresas,
  origens,
}: {
  empresas: EmpresaNbs[];
  origens: Origem[];
}) {
  const qc = useQueryClient();
  const [nova, setNova] = useState({ origem_id: "", nome: "" });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["estoque", "nbs"] });

  const criar = async () => {
    if (!nova.origem_id) return toast.error("Selecione a origem.");
    if (!nova.nome.trim()) return toast.error("Informe o nome de exibição.");
    const { error } = await supabase.from("estoque_empresas_nbs").insert({
      origem_id: nova.origem_id,
      nome_exibicao: nova.nome.trim(),
      ativo: true,
    } as never);
    if (error) return toast.error(error.message);
    setNova({ origem_id: "", nome: "" });
    toast.success("Empresa NBS cadastrada.");
    await invalidar();
  };

  const alternarAtivo = async (e: EmpresaNbs) => {
    const { error } = await supabase
      .from("estoque_empresas_nbs")
      .update({ ativo: !e.ativo } as never)
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    await invalidar();
  };

  const remover = async (id: string) => {
    if (!window.confirm("Excluir esta empresa NBS?")) return;
    const { error } = await supabase.from("estoque_empresas_nbs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Empresa NBS removida.");
    await invalidar();
  };

  const nomeOrigem = (id: string) => origens.find((o) => o.id === id)?.nome ?? "—";

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">Empresas NBS</h2>
      <p className="text-xs text-muted-foreground">
        O chassi resumido não é cadastrado aqui: ele é um dado transacional de cada compra do
        veículo e é lido da planilha, sempre validado dentro da mesma origem/base.
      </p>
      <ul className="space-y-1 text-sm">
        {empresas.map((e) => (
          <li key={e.id} className="flex items-center gap-2 border-b border-border pb-1">
            <span className="font-medium">{e.nome_exibicao}</span>
            <span className="text-xs text-muted-foreground">({nomeOrigem(e.origem_id)})</span>
            {!e.ativo && <Badge variant="secondary">Inativa</Badge>}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() => alternarAtivo(e)}
            >
              {e.ativo ? "Desativar" : "Ativar"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => remover(e.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
        {empresas.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhuma empresa NBS cadastrada.</li>
        )}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 min-w-32">
          <Label className="text-xs">Origem</Label>
          <Select value={nova.origem_id} onValueChange={(v) => setNova({ ...nova, origem_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {origens.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo} — {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-32">
          <Label className="text-xs">Nome de exibição</Label>
          <Input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
        </div>
        <Button size="sm" onClick={criar}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>
    </Card>
  );
}

function FinalidadesEditor({ finalidades }: { finalidades: Finalidade[] }) {
  const qc = useQueryClient();
  const [nova, setNova] = useState("");

  const invalidar = () => qc.invalidateQueries({ queryKey: ["estoque", "finalidades"] });

  const criar = async () => {
    if (!nova.trim()) return toast.error("Informe o nome da finalidade.");
    const { error } = await supabase.from("estoque_finalidades").insert({
      nome: nova.trim(),
      ativo: true,
    } as never);
    if (error) return toast.error(error.message);
    setNova("");
    toast.success("Finalidade cadastrada.");
    await invalidar();
  };

  const alternarAtivo = async (f: Finalidade) => {
    const { error } = await supabase
      .from("estoque_finalidades")
      .update({ ativo: !f.ativo } as never)
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    await invalidar();
  };

  const remover = async (id: string) => {
    if (!window.confirm("Excluir esta finalidade?")) return;
    const { error } = await supabase.from("estoque_finalidades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Finalidade removida.");
    await invalidar();
  };

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">Finalidades</h2>
      <ul className="space-y-1 text-sm">
        {finalidades.map((f) => (
          <li key={f.id} className="flex items-center gap-2 border-b border-border pb-1">
            <span className="font-medium">{f.nome}</span>
            {!f.ativo && <Badge variant="secondary">Inativa</Badge>}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() => alternarAtivo(f)}
            >
              {f.ativo ? "Desativar" : "Ativar"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => remover(f.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
        {finalidades.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhuma finalidade cadastrada.</li>
        )}
      </ul>
      <div className="flex items-end gap-2">
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Nome</Label>
          <Input value={nova} onChange={(e) => setNova(e.target.value)} />
        </div>
        <Button size="sm" onClick={criar}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>
    </Card>
  );
}
