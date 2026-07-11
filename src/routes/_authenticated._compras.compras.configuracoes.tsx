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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_compras/compras/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  component: ConfiguracoesCompras,
});

type Categoria =
  | "loja_estoque" | "tipo_compra" | "motivo_pendencia"
  | "motivo_cancelamento" | "tipo_debito" | "estado_uf" | "campo_formulario";

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
}

const TABS: { key: Categoria; title: string; hint: string; usaUf?: boolean; usaTipoCampo?: boolean }[] = [
  { key: "estado_uf", title: "Estados (UF)", hint: "Estados disponíveis. O valor deve ser a sigla (ex.: GO, ES)." },
  { key: "loja_estoque", title: "Lojas de estoque", hint: "Vincule cada loja ao estado. No formulário, apenas as lojas do estado selecionado aparecem.", usaUf: true },
  { key: "campo_formulario", title: "Campos por estado", hint: "Campos adicionais exigidos por estado (ex.: CPF do procurador).", usaUf: true, usaTipoCampo: true },
  { key: "tipo_compra", title: "Tipos de compra", hint: "Ex.: Somente compra, Troca por VU, Troca por VN." },
  { key: "tipo_debito", title: "Itens de checagem / débitos", hint: "Itens marcados como Pago/OK ou Pendente no chamado." },
  { key: "motivo_pendencia", title: "Motivos de pendência", hint: "Aparecem ao pendenciar um chamado." },
  { key: "motivo_cancelamento", title: "Motivos de cancelamento", hint: "Aparecem ao cancelar um chamado." },
];

const TIPOS_CAMPO = [
  { valor: "texto", label: "Texto" },
  { valor: "numero", label: "Número" },
  { valor: "cpf", label: "CPF" },
  { valor: "cnpj", label: "CNPJ" },
  { valor: "data", label: "Data" },
  { valor: "email", label: "E-mail" },
  { valor: "telefone", label: "Telefone" },
];

interface NovoForm {
  valor: string; label: string; ordem: string;
  uf: string; tipo_campo: string; obrigatorio: boolean;
}

const NOVO_VAZIO: NovoForm = { valor: "", label: "", ordem: "", uf: "", tipo_campo: "texto", obrigatorio: false };

function ConfiguracoesCompras() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState<Record<string, NovoForm>>({});

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

  useEffect(() => { carregar(); }, [carregar]);

  if (!isAdmin) return <div className="p-6">Acesso restrito.</div>;

  const ufs = items.filter((i) => i.categoria === "estado_uf" && i.ativo);

  const setNovoField = (cat: Categoria, patch: Partial<NovoForm>) =>
    setNovo((s) => ({ ...s, [cat]: { ...(s[cat] ?? NOVO_VAZIO), ...patch } }));

  async function adicionar(cat: Categoria, usaUf?: boolean, usaTipoCampo?: boolean) {
    const n = novo[cat] ?? NOVO_VAZIO;
    if (!n.valor.trim() || !n.label.trim()) { toast.error("Preencha valor e rótulo."); return; }
    if (usaUf && !n.uf) { toast.error("Selecione o estado (UF)."); return; }
    const valor = n.valor.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const { error } = await supabase.from("compras_cadastros").insert({
      categoria: cat,
      valor,
      label: n.label.trim(),
      ordem: Number(n.ordem) || 0,
      uf: usaUf ? n.uf.toUpperCase() : null,
      tipo_campo: usaTipoCampo ? n.tipo_campo : null,
      obrigatorio: usaTipoCampo ? n.obrigatorio : false,
    } as any);
    if (error) { toast.error(error.message); return; }
    setNovo((s) => ({ ...s, [cat]: NOVO_VAZIO }));
    toast.success("Item adicionado.");
    carregar();
  }

  async function salvar(i: Item) {
    const { error } = await supabase.from("compras_cadastros")
      .update({ label: i.label, ordem: i.ordem, ativo: i.ativo, uf: i.uf, tipo_campo: i.tipo_campo, obrigatorio: i.obrigatorio } as any)
      .eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("compras_cadastros").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function updateLocal(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } : x));
  }

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/compras" })}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Configurações — Compras Seminovos</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre estados primeiro, depois vincule lojas e campos adicionais a cada estado.
        </p>
      </div>

      <Tabs defaultValue="estado_uf" className="w-full">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.title}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const list = items.filter((i) => i.categoria === t.key);
          const n = novo[t.key] ?? NOVO_VAZIO;
          return (
            <TabsContent key={t.key} value={t.key} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Novo */}
                  <div className="grid md:grid-cols-6 gap-2 items-end border border-dashed border-border rounded-md p-3">
                    <div className="md:col-span-1">
                      <Label>Valor (chave)</Label>
                      <Input value={n.valor} onChange={(e) => setNovoField(t.key, { valor: e.target.value })} placeholder={t.key === "estado_uf" ? "GO" : "chave_curta"} />
                    </div>
                    <div className={t.usaUf ? "md:col-span-1" : "md:col-span-2"}>
                      <Label>Rótulo</Label>
                      <Input value={n.label} onChange={(e) => setNovoField(t.key, { label: e.target.value })} placeholder="Nome exibido" />
                    </div>
                    {t.usaUf && (
                      <div>
                        <Label>Estado (UF)</Label>
                        <Select value={n.uf} onValueChange={(v) => setNovoField(t.key, { uf: v })}>
                          <SelectTrigger><SelectValue placeholder="UF…" /></SelectTrigger>
                          <SelectContent>
                            {ufs.map((u) => (
                              <SelectItem key={u.id} value={u.valor.toUpperCase()}>{u.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {t.usaTipoCampo && (
                      <>
                        <div>
                          <Label>Tipo</Label>
                          <Select value={n.tipo_campo} onValueChange={(v) => setNovoField(t.key, { tipo_campo: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_CAMPO.map((tc) => (
                                <SelectItem key={tc.valor} value={tc.valor}>{tc.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            id={`obr-${t.key}`}
                            type="checkbox"
                            checked={n.obrigatorio}
                            onChange={(e) => setNovoField(t.key, { obrigatorio: e.target.checked })}
                          />
                          <Label htmlFor={`obr-${t.key}`} className="cursor-pointer">Obrigatório</Label>
                        </div>
                      </>
                    )}
                    <div>
                      <Label>Ordem</Label>
                      <Input type="number" value={n.ordem} onChange={(e) => setNovoField(t.key, { ordem: e.target.value })} />
                    </div>
                    <Button onClick={() => adicionar(t.key, t.usaUf, t.usaTipoCampo)} className="md:col-span-1">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>

                  {/* Lista */}
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Carregando…</div>
                  ) : list.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum item cadastrado.</div>
                  ) : (
                    <div className="space-y-2">
                      {list.map((i) => (
                        <div key={i.id} className="grid md:grid-cols-[140px_1fr_80px_100px_100px_auto_auto] gap-2 items-center border border-border rounded-md p-2">
                          <div className="text-xs font-mono text-muted-foreground truncate">{i.valor}</div>
                          <Input value={i.label} onChange={(e) => updateLocal(i.id, { label: e.target.value })} />
                          {t.usaUf ? (
                            <Select value={i.uf ?? ""} onValueChange={(v) => updateLocal(i.id, { uf: v })}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="UF" /></SelectTrigger>
                              <SelectContent>
                                {ufs.map((u) => (
                                  <SelectItem key={u.id} value={u.valor.toUpperCase()}>{u.valor.toUpperCase()}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : <div />}
                          {t.usaTipoCampo ? (
                            <Select value={i.tipo_campo ?? "texto"} onValueChange={(v) => updateLocal(i.id, { tipo_campo: v })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIPOS_CAMPO.map((tc) => (
                                  <SelectItem key={tc.valor} value={tc.valor}>{tc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : <div />}
                          <Input type="number" value={i.ordem} onChange={(e) => updateLocal(i.id, { ordem: Number(e.target.value) })} />
                          <Button
                            variant="outline" size="sm"
                            onClick={() => { updateLocal(i.id, { ativo: !i.ativo }); salvar({ ...i, ativo: !i.ativo }); }}
                          >
                            <Power className="w-3 h-3 mr-1" />
                            <Badge variant={i.ativo ? "default" : "secondary"} className="text-[10px]">
                              {i.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </Button>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => salvar(i)}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => excluir(i.id)}>
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
