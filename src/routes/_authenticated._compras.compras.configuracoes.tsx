import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_compras/compras/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  component: ConfiguracoesCompras,
});

type Categoria =
  | "loja_estoque"
  | "tipo_compra"
  | "motivo_pendencia"
  | "motivo_cancelamento"
  | "tipo_debito"
  | "estado_uf"
  | "campo_formulario"
  | "documento"
  | "status_debito";

type MotivoTipo = "pendencia" | "cancelamento" | "suspensao";

const MOTIVO_TIPO_LABELS: Record<MotivoTipo, string> = {
  pendencia: "Pendência",
  cancelamento: "Cancelamento",
  suspensao: "Suspensão",
};

interface Item {
  id: string;
  categoria: Categoria;
  valor: string;
  label: string;
  ordem: number;
  ativo: boolean;
  uf: string | null;
  tipo_campo: string | null;
  obrigatorio: boolean;
  grupo: string | null;
  tipo_pessoa: "PF" | "PJ" | null;
  exige_anexo: boolean;
  exige_descricao: boolean;
}

const TABS: {
  key: Categoria | "motivos";
  title: string;
  hint: string;
  usaUf?: boolean;
  usaTipoCampo?: boolean;
  usaGrupo?: boolean;
  multiUf?: boolean;
  usaObrigatorio?: boolean;
  usaTipoPessoa?: boolean;
  multiTipoPessoa?: boolean;
  usaStatusDebito?: boolean;
  usaMotivoTipo?: boolean;
}[] = [
  {
    key: "estado_uf",
    title: "Estados (UF)",
    hint: "Estados disponíveis. O valor deve ser a sigla (ex.: GO, ES).",
  },
  {
    key: "loja_estoque",
    title: "Lojas de estoque",
    hint: "Vincule cada loja ao estado. No formulário, apenas as lojas do estado selecionado aparecem.",
    usaUf: true,
  },
  {
    key: "campo_formulario",
    title: "Campos",
    hint: "Campos adicionais exigidos por estado. Selecione um ou mais estados — o campo é replicado para cada UF selecionada.",
    usaUf: true,
    usaTipoCampo: true,
    usaGrupo: true,
    multiUf: true,
  },
  {
    key: "documento",
    title: "Documentos",
    hint: "Documentos exigidos por estado e pessoa (PF/PJ). Marque um ou vários estados e PF/PJ — o item é replicado para cada combinação. Marque como obrigatório para bloquear o envio à Central sem anexo.",
    usaUf: true,
    multiUf: true,
    usaObrigatorio: true,
    usaTipoPessoa: true,
    multiTipoPessoa: true,
  },
  {
    key: "tipo_compra",
    title: "Tipos de compra",
    hint: "Ex.: Somente compra, Troca por VU, Troca por VN.",
  },
  {
    key: "tipo_debito",
    title: "Itens de checagem / débitos",
    hint: "Itens marcados no chamado com um status configurado abaixo. Marque como obrigatório para bloquear o envio à Central.",
    usaObrigatorio: true,
  },
  {
    key: "status_debito",
    title: "Status de débito",
    hint: "Opções do seletor de status em cada item de checagem/débito. Vincule a um tipo específico (ex.: só aparece em Multas) ou deixe em Todos. Marque se ao selecionar exige descrição e/ou anexo.",
    usaStatusDebito: true,
  },
  {
    key: "motivos",
    title: "Motivos",
    hint: "Motivos para pendência, cancelamento e suspensão de chamados. Selecione o tipo ao adicionar.",
    usaMotivoTipo: true,
  },
];

const TIPOS_CAMPO = [
  { valor: "texto", label: "Texto" },
  { valor: "numero", label: "Número" },
  { valor: "moeda", label: "Moeda (R$ 1.000,00)" },
  { valor: "ano", label: "Ano (2026)" },
  { valor: "ano_mod", label: "Ano/Modelo (2026/2027)" },
  { valor: "placa", label: "Placa (Mercosul/Antiga)" },
  { valor: "cpf", label: "CPF" },
  { valor: "cnpj", label: "CNPJ (alfanumérico)" },
  { valor: "renavam", label: "Renavam" },
  { valor: "cor", label: "Cor externa" },
  { valor: "data", label: "Data" },
  { valor: "email", label: "E-mail" },
  { valor: "telefone", label: "Telefone" },
];

const GRUPOS = [
  { valor: "cliente", label: "Cliente / Localização" },
  { valor: "veiculo", label: "Veículo" },
];

const TIPOS_PESSOA_OPT: ("PF" | "PJ")[] = ["PF", "PJ"];

function parseGrupoLinks(grupo: string | null): string[] {
  if (!grupo) return [];
  try {
    const parsed = JSON.parse(grupo);
    return Array.isArray(parsed) ? parsed : [grupo];
  } catch {
    return [grupo];
  }
}

function encodeGrupoLinks(arr: string[]): string | null {
  return arr.length > 0 ? JSON.stringify(arr) : null;
}

interface NovoForm {
  valor: string;
  label: string;
  ordem: string;
  uf: string;
  ufs: string[];
  tipo_campo: string;
  obrigatorio: boolean;
  grupo: string;
  tipos_pessoa: ("PF" | "PJ")[];
  link_tipo_debito: string[]; // vazio = todos
  exige_anexo: boolean;
  exige_descricao: boolean;
  motivo_tipo: MotivoTipo;
}

const NOVO_VAZIO: NovoForm = {
  valor: "",
  label: "",
  ordem: "",
  uf: "",
  ufs: [],
  tipo_campo: "texto",
  obrigatorio: false,
  grupo: "cliente",
  tipos_pessoa: [],
  link_tipo_debito: [],
  exige_anexo: false,
  exige_descricao: false,
  motivo_tipo: "pendencia",
};

function ConfiguracoesCompras() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState<Record<string, NovoForm>>({});
  const [filtroMotivoTipo, setFiltroMotivoTipo] = useState<MotivoTipo | "todos">("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("compras_cadastros")
      .select("*")
      .order("categoria")
      .order("ordem");
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!isAdmin) return <div className="p-6">Acesso restrito.</div>;

  const ufs = items.filter((i) => i.categoria === "estado_uf" && i.ativo);

  const setNovoField = (cat: Categoria | "motivos", patch: Partial<NovoForm>) =>
    setNovo((s) => ({ ...s, [cat]: { ...(s[cat] ?? NOVO_VAZIO), ...patch } }));

  const toggleUf = (cat: Categoria | "motivos", uf: string) => {
    const cur = novo[cat]?.ufs ?? [];
    const next = cur.includes(uf) ? cur.filter((x) => x !== uf) : [...cur, uf];
    setNovoField(cat, { ufs: next });
  };

  const toggleTipoPessoa = (cat: Categoria | "motivos", tp: "PF" | "PJ") => {
    const cur = novo[cat]?.tipos_pessoa ?? [];
    const next = cur.includes(tp) ? cur.filter((x) => x !== tp) : [...cur, tp];
    setNovoField(cat, { tipos_pessoa: next });
  };

  async function adicionar(cat: Categoria | "motivos", tab: (typeof TABS)[number]) {
    const n = novo[tab.key] ?? NOVO_VAZIO;
    if (!n.valor.trim() || !n.label.trim()) {
      toast.error("Preencha valor e rótulo.");
      return;
    }
    if (tab.usaUf && !tab.multiUf && !n.uf) {
      toast.error("Selecione o estado (UF).");
      return;
    }
    if (tab.usaUf && tab.multiUf && n.ufs.length === 0) {
      toast.error("Selecione pelo menos um estado.");
      return;
    }
    if (tab.usaMotivoTipo && !n.motivo_tipo) {
      toast.error("Selecione o tipo de motivo.");
      return;
    }
    const valor = n.valor
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    const ufsAlvo: (string | null)[] = tab.multiUf
      ? n.ufs.map((u) => u.toUpperCase())
      : tab.usaUf
        ? [n.uf.toUpperCase()]
        : [null];
    // Se multiTipoPessoa e nenhum selecionado => NULL (aplica a ambos)
    const tpsAlvo: (("PF" | "PJ") | null)[] = tab.usaTipoPessoa
      ? tab.multiTipoPessoa
        ? n.tipos_pessoa.length === 0
          ? [null]
          : n.tipos_pessoa
        : [null]
      : [null];
    const rows: any[] = [];
    for (const uf of ufsAlvo) {
      for (const tp of tpsAlvo) {
        rows.push({
          categoria: tab.usaMotivoTipo ? "motivo_pendencia" : cat,
          valor: tab.usaMotivoTipo ? `${n.motivo_tipo}_${valor}` : valor,
          label: n.label.trim(),
          ordem: Number(n.ordem) || 0,
          uf,
          tipo_campo: tab.usaTipoCampo ? n.tipo_campo : null,
          obrigatorio: tab.usaTipoCampo || tab.usaObrigatorio ? n.obrigatorio : false,
          grupo: tab.usaMotivoTipo
            ? n.motivo_tipo
            : tab.usaStatusDebito
              ? n.link_tipo_debito.length > 0
                ? JSON.stringify(n.link_tipo_debito)
                : null
              : tab.usaGrupo
                ? n.grupo
                : null,
          tipo_pessoa: tp,
          exige_anexo: tab.usaStatusDebito ? n.exige_anexo : false,
          exige_descricao: tab.usaStatusDebito ? n.exige_descricao : false,
        });
      }
    }
    const { error } = await supabase.from("compras_cadastros").insert(rows as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovo((s) => ({ ...s, [tab.key]: NOVO_VAZIO }));
    toast.success(`${rows.length} item(ns) adicionado(s).`);
    carregar();
  }

  async function salvar(i: Item) {
    const { error } = await supabase
      .from("compras_cadastros")
      .update({
        label: i.label,
        ordem: i.ordem,
        ativo: i.ativo,
        uf: i.uf,
        tipo_campo: i.tipo_campo,
        obrigatorio: i.obrigatorio,
        grupo: i.grupo,
        tipo_pessoa: i.tipo_pessoa,
        exige_anexo: i.exige_anexo,
        exige_descricao: i.exige_descricao,
      } as any)
      .eq("id", i.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Salvo.");
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("compras_cadastros").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function updateLocal(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="p-4 space-y-4 w-full">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/compras" })}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Configurações — Compras Seminovos</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre estados primeiro, depois vincule lojas e campos a cada estado.
        </p>
      </div>

      <Tabs defaultValue="estado_uf" className="w-full">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const isMotivos = t.key === "motivos";
          const rawList = isMotivos
            ? items.filter((i) => i.categoria === "motivo_pendencia")
            : items.filter((i) => i.categoria === t.key);
          const list =
            isMotivos && filtroMotivoTipo !== "todos"
              ? rawList.filter((i) => i.grupo === filtroMotivoTipo)
              : rawList;
          const n = novo[t.key] ?? NOVO_VAZIO;
          // Column template for list rows
          const cols = [
            "140px", // valor
            "minmax(200px,1fr)", // label
            isMotivos ? "130px" : null, // tipo (motivos)
            t.usaUf ? "110px" : null, // uf
            t.usaTipoPessoa ? "90px" : null, // tipo_pessoa
            t.usaGrupo ? "160px" : null, // grupo
            t.usaStatusDebito ? "minmax(200px,1fr)" : null, // aplica-se a
            t.usaStatusDebito ? "80px" : null, // exige anexo
            t.usaStatusDebito ? "80px" : null, // exige descricao
            t.usaTipoCampo ? "140px" : null, // tipo
            t.usaTipoCampo || t.usaObrigatorio ? "70px" : null, // obrig
            "80px", // ordem
            "100px", // ativo
            "90px", // ações
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <TabsContent key={t.key} value={t.key} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{t.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Novo */}
                  <div className="flex flex-wrap gap-2 items-end border border-dashed border-border rounded-md p-3">
                    <div className="w-[160px]">
                      <Label>Valor (chave)</Label>
                      <Input
                        value={n.valor}
                        onChange={(e) => setNovoField(t.key, { valor: e.target.value })}
                        placeholder={t.key === "estado_uf" ? "GO" : "chave_curta"}
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <Label>Rótulo</Label>
                      <Input
                        value={n.label}
                        onChange={(e) => setNovoField(t.key, { label: e.target.value })}
                        placeholder="Nome exibido"
                      />
                    </div>
                    {t.usaMotivoTipo && (
                      <div className="w-[170px]">
                        <Label>Tipo de Motivo</Label>
                        <Select
                          value={n.motivo_tipo}
                          onValueChange={(v) =>
                            setNovoField(t.key, { motivo_tipo: v as MotivoTipo })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(MOTIVO_TIPO_LABELS) as MotivoTipo[]).map((mt) => (
                              <SelectItem key={mt} value={mt}>
                                {MOTIVO_TIPO_LABELS[mt]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {t.usaUf && !t.multiUf && (
                      <div className="w-[140px]">
                        <Label>Estado (UF)</Label>
                        <Select value={n.uf} onValueChange={(v) => setNovoField(t.key, { uf: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="UF…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ufs.map((u) => (
                              <SelectItem key={u.id} value={u.valor.toUpperCase()}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {t.usaUf && t.multiUf && (
                      <div className="w-[260px]">
                        <Label>Estados (UF)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {n.ufs.length === 0
                                  ? "Selecione…"
                                  : n.ufs.length === ufs.length
                                    ? "Todos os estados"
                                    : n.ufs.join(", ")}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-2" align="start">
                            {ufs.length === 0 ? (
                              <div className="text-xs text-muted-foreground p-2">
                                Cadastre estados primeiro.
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-60 overflow-auto">
                                {ufs.map((u) => {
                                  const val = u.valor.toUpperCase();
                                  const sel = n.ufs.includes(val);
                                  return (
                                    <label
                                      key={u.id}
                                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                                    >
                                      <Checkbox
                                        checked={sel}
                                        onCheckedChange={() => toggleUf(t.key, val)}
                                      />
                                      <span className="flex-1">{u.label}</span>
                                      <span className="text-xs text-muted-foreground">{val}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {t.usaTipoPessoa && t.multiTipoPessoa && (
                      <div className="w-[200px]">
                        <Label>Pessoa (PF/PJ)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {n.tipos_pessoa.length === 0
                                  ? "Ambos (PF e PJ)"
                                  : n.tipos_pessoa.join(" + ")}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-2" align="start">
                            <div className="space-y-1">
                              {TIPOS_PESSOA_OPT.map((tp) => (
                                <label
                                  key={tp}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                                >
                                  <Checkbox
                                    checked={n.tipos_pessoa.includes(tp)}
                                    onCheckedChange={() => toggleTipoPessoa(t.key, tp)}
                                  />
                                  <span className="flex-1">
                                    {tp === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{tp}</span>
                                </label>
                              ))}
                              <p className="text-[10px] text-muted-foreground px-2 pt-1">
                                Nenhum marcado = aplica a ambos.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {t.usaGrupo && (
                      <div className="w-[180px]">
                        <Label>Grupo</Label>
                        <Select
                          value={n.grupo}
                          onValueChange={(v) => setNovoField(t.key, { grupo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRUPOS.map((g) => (
                              <SelectItem key={g.valor} value={g.valor}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {t.usaTipoCampo && (
                      <div className="w-[170px]">
                        <Label>Tipo</Label>
                        <Select
                          value={n.tipo_campo}
                          onValueChange={(v) => setNovoField(t.key, { tipo_campo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CAMPO.map((tc) => (
                              <SelectItem key={tc.valor} value={tc.valor}>
                                {tc.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(t.usaTipoCampo || t.usaObrigatorio) && (
                      <div className="flex items-center gap-2 h-10 px-2">
                        <input
                          id={`obr-${t.key}`}
                          type="checkbox"
                          checked={n.obrigatorio}
                          onChange={(e) => setNovoField(t.key, { obrigatorio: e.target.checked })}
                        />
                        <Label htmlFor={`obr-${t.key}`} className="cursor-pointer">
                          Obrigatório
                        </Label>
                      </div>
                    )}
                    {t.usaStatusDebito && (
                      <>
                        <div className="min-w-[220px]">
                          <Label>Aplica-se a</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {items
                              .filter((i) => i.categoria === "tipo_debito" && i.ativo)
                              .map((td) => (
                                <label
                                  key={td.id}
                                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-primary"
                                    checked={n.link_tipo_debito.includes(td.valor)}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...n.link_tipo_debito, td.valor]
                                        : n.link_tipo_debito.filter((v) => v !== td.valor);
                                      setNovoField(t.key, { link_tipo_debito: next });
                                    }}
                                  />
                                  {td.label}
                                </label>
                              ))}
                          </div>
                          {n.link_tipo_debito.length === 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Nenhum marcado = aplica a todos
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 h-10 px-2">
                          <input
                            id={`ea-${t.key}`}
                            type="checkbox"
                            checked={n.exige_anexo}
                            onChange={(e) => setNovoField(t.key, { exige_anexo: e.target.checked })}
                          />
                          <Label htmlFor={`ea-${t.key}`} className="cursor-pointer">
                            Exige anexo
                          </Label>
                        </div>
                        <div className="flex items-center gap-2 h-10 px-2">
                          <input
                            id={`ed-${t.key}`}
                            type="checkbox"
                            checked={n.exige_descricao}
                            onChange={(e) =>
                              setNovoField(t.key, { exige_descricao: e.target.checked })
                            }
                          />
                          <Label htmlFor={`ed-${t.key}`} className="cursor-pointer">
                            Exige descrição
                          </Label>
                        </div>
                      </>
                    )}
                    <div className="w-[90px]">
                      <Label>Ordem</Label>
                      <Input
                        type="number"
                        value={n.ordem}
                        onChange={(e) => setNovoField(t.key, { ordem: e.target.value })}
                      />
                    </div>
                    <Button onClick={() => adicionar(t.key, t)}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>

                  {/* Lista */}
                  {isMotivos && (
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-xs text-muted-foreground">Filtrar por tipo:</Label>
                      <Select
                        value={filtroMotivoTipo}
                        onValueChange={(v) => setFiltroMotivoTipo(v as MotivoTipo | "todos")}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {(Object.keys(MOTIVO_TIPO_LABELS) as MotivoTipo[]).map((mt) => (
                            <SelectItem key={mt} value={mt}>
                              {MOTIVO_TIPO_LABELS[mt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Carregando…</div>
                  ) : list.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum item cadastrado.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {/* header */}
                      <div
                        className="hidden md:grid gap-2 px-2 text-[11px] uppercase tracking-wide text-muted-foreground"
                        style={{ gridTemplateColumns: cols }}
                      >
                        <div>Chave</div>
                        <div>Rótulo</div>
                        {isMotivos && <div>Tipo</div>}
                        {t.usaUf && <div>UF</div>}
                        {t.usaTipoPessoa && <div>PF/PJ</div>}
                        {t.usaGrupo && <div>Grupo</div>}
                        {t.usaStatusDebito && <div>Aplica-se</div>}
                        {t.usaStatusDebito && <div>Anexo?</div>}
                        {t.usaStatusDebito && <div>Descr.?</div>}
                        {t.usaTipoCampo && <div>Tipo</div>}
                        {(t.usaTipoCampo || t.usaObrigatorio) && <div>Obrig.</div>}
                        <div>Ordem</div>
                        <div>Status</div>
                        <div className="text-right">Ações</div>
                      </div>
                      {list.map((i) => (
                        <div
                          key={i.id}
                          className="grid gap-2 items-center border border-border rounded-md p-2"
                          style={{ gridTemplateColumns: cols }}
                        >
                          <div className="text-xs font-mono text-muted-foreground truncate">
                            {i.valor}
                          </div>
                          <Input
                            value={i.label}
                            onChange={(e) => updateLocal(i.id, { label: e.target.value })}
                            className="h-8"
                          />
                          {isMotivos && (
                            <Badge variant="outline" className="text-[10px] h-7 justify-center">
                              {MOTIVO_TIPO_LABELS[(i.grupo as MotivoTipo) ?? "pendencia"] ??
                                i.grupo}
                            </Badge>
                          )}
                          {t.usaUf && (
                            <Select
                              value={i.uf ?? ""}
                              onValueChange={(v) => updateLocal(i.id, { uf: v })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent>
                                {ufs.map((u) => (
                                  <SelectItem key={u.id} value={u.valor.toUpperCase()}>
                                    {u.valor.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {t.usaTipoPessoa && (
                            <Select
                              value={i.tipo_pessoa ?? "AMBOS"}
                              onValueChange={(v) =>
                                updateLocal(i.id, {
                                  tipo_pessoa: v === "AMBOS" ? null : (v as "PF" | "PJ"),
                                })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AMBOS">Ambos</SelectItem>
                                <SelectItem value="PF">PF</SelectItem>
                                <SelectItem value="PJ">PJ</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {t.usaGrupo && (
                            <Select
                              value={i.grupo ?? "cliente"}
                              onValueChange={(v) => updateLocal(i.id, { grupo: v })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GRUPOS.map((g) => (
                                  <SelectItem key={g.valor} value={g.valor}>
                                    {g.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {t.usaStatusDebito && (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {items
                                  .filter((x) => x.categoria === "tipo_debito" && x.ativo)
                                  .map((td) => {
                                    const current = parseGrupoLinks(i.grupo);
                                    const checked = current.includes(td.valor);
                                    return (
                                      <label
                                        key={td.id}
                                        className="flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap"
                                        title={td.label}
                                      >
                                        <input
                                          type="checkbox"
                                          className="accent-primary scale-90"
                                          checked={checked}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...current, td.valor]
                                              : current.filter((v) => v !== td.valor);
                                            updateLocal(i.id, { grupo: encodeGrupoLinks(next) });
                                          }}
                                        />
                                        {td.label}
                                      </label>
                                    );
                                  })}
                              </div>
                              <label className="flex items-center justify-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={i.exige_anexo}
                                  onChange={(e) =>
                                    updateLocal(i.id, { exige_anexo: e.target.checked })
                                  }
                                />
                              </label>
                              <label className="flex items-center justify-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={i.exige_descricao}
                                  onChange={(e) =>
                                    updateLocal(i.id, { exige_descricao: e.target.checked })
                                  }
                                />
                              </label>
                            </>
                          )}
                          {t.usaTipoCampo && (
                            <Select
                              value={i.tipo_campo ?? "texto"}
                              onValueChange={(v) => updateLocal(i.id, { tipo_campo: v })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS_CAMPO.map((tc) => (
                                  <SelectItem key={tc.valor} value={tc.valor}>
                                    {tc.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {(t.usaTipoCampo || t.usaObrigatorio) && (
                            <label
                              className="flex items-center justify-center gap-1 text-xs"
                              title="Obrigatório"
                            >
                              <input
                                type="checkbox"
                                checked={i.obrigatorio}
                                onChange={(e) =>
                                  updateLocal(i.id, { obrigatorio: e.target.checked })
                                }
                              />
                            </label>
                          )}
                          <Input
                            type="number"
                            value={i.ordem}
                            onChange={(e) => updateLocal(i.id, { ordem: Number(e.target.value) })}
                            className="h-8"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateLocal(i.id, { ativo: !i.ativo });
                              salvar({ ...i, ativo: !i.ativo });
                            }}
                            className="h-8"
                          >
                            <Power className="w-3 h-3 mr-1" />
                            <Badge
                              variant={i.ativo ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {i.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </Button>
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => salvar(i)} className="h-8 px-2">
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => excluir(i.id)}
                              className="h-8 px-2"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
