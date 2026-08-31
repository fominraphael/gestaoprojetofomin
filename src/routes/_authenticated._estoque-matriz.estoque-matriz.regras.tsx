import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Plus, Save, Trash2 } from "lucide-react";
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
  CANAIS,
  CLASSIFICACOES,
  type ClassificacaoEstoque,
  type FaixaDias,
  type GatilhoLeads,
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
      },
    );
    setGatilhos(existente?.leads ?? []);
  };

  const salvar = async () => {
    if (!editando) return;
    try {
      await upsertRegra(editando as RegraEstoque, gatilhos);
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

function ListaSimples({
  titulo,
  itens,
  tabela,
}: {
  titulo: string;
  itens: string[];
  tabela: string;
}) {
  return (
    <Card className="p-5 space-y-2">
      <h2 className="font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum registro cadastrado em <code>{tabela}</code>.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i} className="border-b border-border pb-1">
              {i}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
