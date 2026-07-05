import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Building2, Warehouse, FileText, Upload, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DiagnosticoCamposTemplate } from "@/components/toyota/DiagnosticoCamposTemplate";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  component: ToyotaConfiguracoes,
});

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
  nome_bi_toyota: string | null;
  ativo: boolean;
}

interface Patio {
  id: string;
  nome: string;
  ativo: boolean;
  filial_id: string | null;
}

function ToyotaConfiguracoes() {
  const { isAdmin } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [patios, setPatios] = useState<Patio[]>([]);
  const [loading, setLoading] = useState(true);

  const [filialModalOpen, setFilialModalOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [filialForm, setFilialForm] = useState({
    nome: "",
    dealer_number: "",
    nome_bi_toyota: "",
    ativo: true,
  });

  const [patioModalOpen, setPatioModalOpen] = useState(false);
  const [editingPatio, setEditingPatio] = useState<Patio | null>(null);
  const [patioForm, setPatioForm] = useState<{
    nome: string;
    ativo: boolean;
    filial_id: string | null;
  }>({
    nome: "",
    ativo: true,
    filial_id: null,
  });

  const [saving, setSaving] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        supabase
          .from("toyota_filiais")
          .select("id, nome, dealer_number, nome_bi_toyota, ativo")
          .order("nome"),
        supabase
          .from("toyota_patios")
          .select("id, nome, ativo, filial_id")
          .order("nome"),
      ]);
      if (fRes.error) throw fRes.error;
      if (pRes.error) throw pRes.error;
      setFiliais((fRes.data ?? []) as Filial[]);
      setPatios((pRes.data ?? []) as Patio[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function openNewFilial() {
    setEditingFilial(null);
    setFilialForm({ nome: "", dealer_number: "", nome_bi_toyota: "", ativo: true });
    setFilialModalOpen(true);
  }
  function openEditFilial(f: Filial) {
    setEditingFilial(f);
    setFilialForm({
      nome: f.nome,
      dealer_number: f.dealer_number ?? "",
      nome_bi_toyota: f.nome_bi_toyota ?? "",
      ativo: f.ativo,
    });
    setFilialModalOpen(true);
  }
  async function salvarFilial() {
    if (!filialForm.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: filialForm.nome.trim(),
        dealer_number: filialForm.dealer_number?.trim() || null,
        nome_bi_toyota: filialForm.nome_bi_toyota?.trim() || null,
        ativo: filialForm.ativo,
      };
      if (editingFilial) {
        const { error } = await supabase
          .from("toyota_filiais")
          .update(payload)
          .eq("id", editingFilial.id);
        if (error) throw error;
        toast.success("Filial atualizada.");
      } else {
        const { error } = await supabase.from("toyota_filiais").insert(payload);
        if (error) throw error;
        toast.success("Filial criada.");
      }
      setFilialModalOpen(false);
      await carregar();
    } catch (e: any) {
      toast.error(
        e.code === "23505" ? "Dealer Number já cadastrado." : (e.message ?? "Falha ao salvar."),
      );
    } finally {
      setSaving(false);
    }
  }
  async function excluirFilial(f: Filial) {
    if (!confirm(`Excluir a filial "${f.nome}"? Os pátios vinculados ficarão sem filial.`)) return;
    const { error } = await supabase.from("toyota_filiais").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Filial excluída.");
    carregar();
  }

  function openNewPatio() {
    setEditingPatio(null);
    setPatioForm({ nome: "", ativo: true, filial_id: null });
    setPatioModalOpen(true);
  }
  function openEditPatio(p: Patio) {
    setEditingPatio(p);
    setPatioForm({ nome: p.nome, ativo: p.ativo, filial_id: p.filial_id });
    setPatioModalOpen(true);
  }
  async function salvarPatio() {
    if (!patioForm.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: patioForm.nome.trim(),
        ativo: patioForm.ativo,
        filial_id: patioForm.filial_id,
      };
      if (editingPatio) {
        const { error } = await supabase
          .from("toyota_patios")
          .update(payload)
          .eq("id", editingPatio.id);
        if (error) throw error;
        toast.success("Pátio atualizado.");
      } else {
        const { error } = await supabase.from("toyota_patios").insert(payload);
        if (error) throw error;
        toast.success("Pátio criado.");
      }
      setPatioModalOpen(false);
      await carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }
  async function excluirPatio(p: Patio) {
    if (!confirm(`Excluir o pátio "${p.nome}"?`)) return;
    const { error } = await supabase.from("toyota_patios").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pátio excluído.");
    carregar();
  }

  const filialNome = (id: string | null) =>
    id ? (filiais.find((f) => f.id === id)?.nome ?? "—") : "—";

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações — Certificação Toyota</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as Filiais (agrupadores) e seus Pátios (unidades operacionais).
        </p>
      </header>

      {/* FILIAIS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Filiais</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filiais.length} cadastrada{filiais.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={openNewFilial}>
              <Plus className="w-4 h-4" />
              Nova Filial
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Dealer Number</TableHead>
                <TableHead>Nome BI Toyota</TableHead>
                <TableHead>Pátios</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filiais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    Nenhuma filial cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                filiais.map((f) => {
                  const count = patios.filter((p) => p.filial_id === f.id).length;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{f.dealer_number ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.nome_bi_toyota ?? "—"}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        <Badge variant={f.ativo ? "default" : "secondary"}>
                          {f.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditFilial(f)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => excluirFilial(f)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PÁTIOS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Pátios</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {patios.length} cadastrado{patios.length === 1 ? "" : "s"} — vincule cada pátio a uma Filial.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={openNewPatio}>
              <Plus className="w-4 h-4" />
              Novo Pátio
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Pátio</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : patios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    Nenhum pátio cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                patios.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {filialNome(p.filial_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "default" : "secondary"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditPatio(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => excluirPatio(p)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Filial */}
      <Dialog open={filialModalOpen} onOpenChange={setFilialModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFilial ? "Editar Filial" : "Nova Filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={filialForm.nome}
                onChange={(e) => setFilialForm({ ...filialForm, nome: e.target.value })}
                placeholder="Ex: Fomin SP"
              />
            </div>
            <div className="space-y-2">
              <Label>Dealer Number</Label>
              <Input
                value={filialForm.dealer_number}
                onChange={(e) => setFilialForm({ ...filialForm, dealer_number: e.target.value })}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome BI Toyota</Label>
              <Input
                value={filialForm.nome_bi_toyota}
                onChange={(e) => setFilialForm({ ...filialForm, nome_bi_toyota: e.target.value })}
                placeholder="Nome exatamente como aparece no BI Toyota"
              />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2.5">
              <Label className="cursor-pointer">Filial Ativa</Label>
              <Switch
                checked={filialForm.ativo}
                onCheckedChange={(v) => setFilialForm({ ...filialForm, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilialModalOpen(false)} disabled={saving}>
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button onClick={salvarFilial} disabled={saving}>
              {saving ? "Salvando..." : editingFilial ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pátio */}
      <Dialog open={patioModalOpen} onOpenChange={setPatioModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPatio ? "Editar Pátio" : "Novo Pátio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Pátio *</Label>
              <Input
                value={patioForm.nome}
                onChange={(e) => setPatioForm({ ...patioForm, nome: e.target.value })}
                placeholder="Ex: Toyota Centro"
              />
            </div>
            <div className="space-y-2">
              <Label>Filial *</Label>
              <Select
                value={patioForm.filial_id ?? "__none__"}
                onValueChange={(v) =>
                  setPatioForm({ ...patioForm, filial_id: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a filial..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem filial —</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2.5">
              <Label className="cursor-pointer">Pátio Ativo</Label>
              <Switch
                checked={patioForm.ativo}
                onCheckedChange={(v) => setPatioForm({ ...patioForm, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatioModalOpen(false)} disabled={saving}>
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button onClick={salvarPatio} disabled={saving}>
              {saving ? "Salvando..." : editingPatio ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && <TemplatesChecklistCard />}
      {isAdmin && <IntegracaoIlovePdfCard />}
    </div>
  );
}

// ============================================================================
// Templates de Check-list (Upload de .txt com Base64 pré-marcado)
// ============================================================================
//
// Cada template é um PDF cujos checkboxes já estão marcados. O usuário exporta
// esse PDF como Base64 dentro de um arquivo .txt e envia aqui. Guardamos a
// string em `system_settings.value.base64` sob a chave
// `toyota_template_<tipo>_<grupo>_base64`.

type Tipo = "tcuv" | "tsim";
type Grupo = "hev" | "utilitario" | "passeio";

const GRUPO_META: Record<Grupo, { label: string; hint: string }> = {
  hev: { label: "Grupo 1 — Híbridos (HEV)", hint: "Prius, Corolla Hybrid, linha Lexus…" },
  utilitario: {
    label: "Grupo 2 — Utilitários",
    hint: "Hilux, SW4 (combustão com itens 4x4/suspensão).",
  },
  passeio: { label: "Grupo 3 — Passeio", hint: "Etios, Yaris, Corolla flex, etc." },
};

const TIPOS: Tipo[] = ["tcuv", "tsim"];
const GRUPOS: Grupo[] = ["hev", "utilitario", "passeio"];

const settingKey = (tipo: Tipo, grupo: Grupo) => `toyota_template_${tipo}_${grupo}_base64`;

type StatusMap = Record<string, boolean>; // key => configurado?

function TemplatesChecklistCard() {
  const [status, setStatus] = useState<StatusMap>({});
  const [uploading, setUploading] = useState<string | null>(null);

  async function carregar() {
    const keys = TIPOS.flatMap((t) => GRUPOS.map((g) => settingKey(t, g)));
    const { data } = await supabase
      .from("system_settings")
      .select("key,value")
      .in("key", keys);
    const next: StatusMap = {};
    for (const row of data ?? []) {
      const v = row.value as { base64?: string } | string | null;
      const b64 = typeof v === "string" ? v : (v?.base64 ?? null);
      next[row.key] = !!(b64 && b64.length > 100);
    }
    setStatus(next);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function upload(tipo: Tipo, grupo: Grupo, file: File) {
    const isTxt =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    if (!isTxt) {
      toast.error("Envie um arquivo .txt contendo o Base64 do PDF.");
      return;
    }
    const key = settingKey(tipo, grupo);
    setUploading(key);
    try {
      const text = await file.text();
      const base64 = text
        .replace(/^data:application\/pdf;base64,/i, "")
        .replace(/\s+/g, "");
      if (base64.length < 100 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
        toast.error("Arquivo .txt não contém um Base64 válido.");
        return;
      }
      const { error: sErr } = await supabase.from("system_settings").upsert(
        { key, value: { base64 } as unknown as never },
        { onConflict: "key" },
      );
      if (sErr) throw sErr;
      toast.success(`Template ${tipo.toUpperCase()} • ${GRUPO_META[grupo].label} atualizado.`);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha no upload.";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Templates de Check-list</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Envie arquivos <strong>.txt</strong> contendo o Base64 do PDF já com os itens
              marcados. O sistema seleciona o template certo pelo modelo do veículo.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {TIPOS.map((tipo) => (
          <div key={tipo} className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {tipo.toUpperCase()}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GRUPOS.map((grupo) => {
                const key = settingKey(tipo, grupo);
                const ok = !!status[key];
                const isUp = uploading === key;
                return (
                  <div key={key} className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{GRUPO_META[grupo].label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {GRUPO_META[grupo].hint}
                        </p>
                        <p className="text-xs mt-2">
                          {ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Configurado
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Nenhum arquivo enviado</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={ok ? "default" : "secondary"}>
                        {ok ? "Ativo" : "Pendente"}
                      </Badge>
                    </div>
                    <label className="block">
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void upload(tipo, grupo, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        asChild
                        variant="outline"
                        className="w-full cursor-pointer"
                        disabled={isUp}
                      >
                        <span>
                          <Upload className="w-4 h-4" />
                          {isUp ? "Enviando..." : ok ? "Substituir .txt" : "Enviar .txt"}
                        </span>
                      </Button>
                    </label>
                    {ok && (
                      <DiagnosticoCamposTemplate tipo={tipo} grupo={grupo} disabled={isUp} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Card de integração iLovePDF (compressão de dossiê)
// ============================================================================
function IntegracaoIlovePdfCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4" /> Integração iLovePDF (compressão do Dossiê)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Quando o dossiê mesclado ultrapassa 2,8&nbsp;MB, a Edge Function{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">gerar-dossie</code>{" "}
          envia o arquivo para a API da iLovePDF e salva a versão comprimida.
          As chaves ficam guardadas como <strong>secrets do backend</strong> —
          nunca em banco ou no frontend.
        </p>

        <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-xs">
          <div>
            <strong>Public Key</strong> → secret{" "}
            <code className="rounded bg-background px-1 py-0.5">
              PDF_COMPRESSION_API_KEY
            </code>{" "}
            <Badge variant="secondary" className="ml-1">Em uso</Badge>
          </div>
          <div>
            <strong>Secret Key</strong> → opcional; usada apenas para gerar JWTs
            assinados localmente. O fluxo atual usa a Public Key via{" "}
            <code>/v1/auth</code> e não precisa da Secret Key.
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Como atualizar as chaves:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Gere as chaves em{" "}
              <a
                href="https://developer.ilovepdf.com/user/projects"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                developer.ilovepdf.com/user/projects
              </a>
              .
            </li>
            <li>
              Abra o painel do Backend e localize{" "}
              <strong>Edge Functions → Secrets</strong>.
            </li>
            <li>
              Edite <code>PDF_COMPRESSION_API_KEY</code> colando a{" "}
              <strong>Public Key</strong> do projeto iLovePDF.
            </li>
          </ol>
          <p>
            Como alternativa, peça ao assistente “atualizar chave iLovePDF” — um
            formulário seguro é aberto no chat para você colar o valor sem ele
            passar pelo código.
          </p>
        </div>

        <presentation-actions>
          <presentation-open-backend>Abrir Backend</presentation-open-backend>
        </presentation-actions>
      </CardContent>
    </Card>
  );
}



