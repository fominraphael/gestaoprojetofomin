import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Link2, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import { obterUsuarios, type UsuarioSistema } from "@/lib/usuarios";
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

export const Route = createFileRoute("/_authenticated/_toyota/toyota/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  component: ToyotaConfiguracoes,
});

interface Filial {
  id: string;
  nome: string;
  dealer_number: string;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
}

interface VinculoRow {
  id: string;
  user_id: string;
  filial_id: string;
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function ToyotaConfiguracoes() {
  const { isAdmin } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [vinculos, setVinculos] = useState<VinculoRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal filial
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [form, setForm] = useState<Omit<Filial, "id">>({
    nome: "",
    dealer_number: "",
    cidade: "",
    uf: "",
    ativo: true,
  });
  const [saving, setSaving] = useState(false);

  // Vinculação
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const [f, u, v] = await Promise.all([
        supabase.from("toyota_filiais").select("*").order("nome"),
        obterUsuarios(),
        supabase.from("toyota_usuario_filial").select("id, user_id, filial_id"),
      ]);
      if (f.error) throw f.error;
      if (v.error) throw v.error;
      setFiliais((f.data ?? []) as Filial[]);
      setUsuarios(u);
      setVinculos((v.data ?? []) as VinculoRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ nome: "", dealer_number: "", cidade: "", uf: "", ativo: true });
    setModalOpen(true);
  }

  function openEdit(f: Filial) {
    setEditing(f);
    setForm({
      nome: f.nome,
      dealer_number: f.dealer_number,
      cidade: f.cidade ?? "",
      uf: f.uf ?? "",
      ativo: f.ativo,
    });
    setModalOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim() || !form.dealer_number.trim()) {
      toast.error("Nome e Dealer Number são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        dealer_number: form.dealer_number.trim(),
        cidade: form.cidade?.trim() || null,
        uf: form.uf?.trim() || null,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase
          .from("toyota_filiais")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Filial atualizada.");
      } else {
        const { error } = await supabase.from("toyota_filiais").insert(payload);
        if (error) throw error;
        toast.success("Filial criada.");
      }
      setModalOpen(false);
      await carregar();
    } catch (e: any) {
      const msg = e.code === "23505"
        ? "Dealer Number já cadastrado."
        : e.message ?? "Falha ao salvar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function excluir(f: Filial) {
    if (!confirm(`Excluir a filial "${f.nome}"? Os vínculos serão removidos.`)) return;
    const { error } = await supabase.from("toyota_filiais").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Filial excluída.");
    carregar();
  }

  async function toggleVinculo(filialId: string) {
    if (!selectedUser) return;
    const existente = vinculos.find(
      (v) => v.user_id === selectedUser && v.filial_id === filialId,
    );
    if (existente) {
      const { error } = await supabase
        .from("toyota_usuario_filial")
        .delete()
        .eq("id", existente.id);
      if (error) return toast.error(error.message);
      setVinculos((prev) => prev.filter((v) => v.id !== existente.id));
    } else {
      const { data, error } = await supabase
        .from("toyota_usuario_filial")
        .insert({ user_id: selectedUser, filial_id: filialId })
        .select("id, user_id, filial_id")
        .single();
      if (error) return toast.error(error.message);
      setVinculos((prev) => [...prev, data as VinculoRow]);
    }
  }

  const filteredUsuarios = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return usuarios;
    return usuarios.filter((u) => u.username.toLowerCase().includes(q));
  }, [usuarios, userSearch]);

  const vinculosDoUsuario = useMemo(
    () => new Set(vinculos.filter((v) => v.user_id === selectedUser).map((v) => v.filial_id)),
    [vinculos, selectedUser],
  );

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações — Certificação Toyota</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as filiais participantes e os vínculos com usuários do sistema.
        </p>
      </header>

      {/* Filiais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Filiais</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filiais.length} cadastrada{filiais.length === 1 ? "" : "s"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openNew}>
              <Plus className="w-4 h-4" />
              Criar Nova Filial
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Filial</TableHead>
                <TableHead>Dealer Number</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filiais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    Nenhuma filial cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                filiais.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{f.dealer_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[f.cidade, f.uf].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.ativo ? "default" : "secondary"}>
                        {f.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(f)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => excluir(f)}>
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

      {/* Vinculação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Vincular Usuário a Filiais</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um usuário do sistema e marque as filiais a que ele tem acesso.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar usuário</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Digite parte do login..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsuarios.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum usuário encontrado.
                    </div>
                  ) : (
                    filteredUsuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username} {u.role === "admin" && "(admin)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedUser ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-md py-8 text-center">
              Selecione um usuário para gerenciar os vínculos.
            </div>
          ) : !isAdmin ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-md py-8 text-center">
              Apenas administradores podem alterar vínculos.
            </div>
          ) : filiais.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-md py-8 text-center">
              Cadastre uma filial primeiro.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filiais.map((f) => {
                const vinculado = vinculosDoUsuario.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleVinculo(f.id)}
                    className={`text-left border rounded-md px-3 py-2.5 transition-colors ${
                      vinculado
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {f.dealer_number}
                        </div>
                      </div>
                      <Switch checked={vinculado} className="pointer-events-none" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal filial */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Filial" : "Nova Filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Filial *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Toyota Centro"
              />
            </div>
            <div className="space-y-2">
              <Label>Dealer Number *</Label>
              <Input
                value={form.dealer_number}
                onChange={(e) => setForm({ ...form, dealer_number: e.target.value })}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade ?? ""}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select
                  value={form.uf ?? ""}
                  onValueChange={(v) => setForm({ ...form, uf: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2.5">
              <div>
                <Label className="cursor-pointer">Filial Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Filiais inativas não aparecem em fluxos operacionais.
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar filial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
