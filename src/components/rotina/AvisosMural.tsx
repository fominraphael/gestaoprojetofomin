import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Edit3, Save, X } from "lucide-react";
import type { Aviso } from "@/lib/rotina";

export function AvisosMural() {
  const { user, isAdmin } = useAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rotina_avisos")
      .select("*")
      .order("created_at", { ascending: false });
    setAvisos((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criarAviso() {
    if (!novoTitulo.trim() || !user) return;
    const { error } = await supabase.from("rotina_avisos").insert({
      titulo: novoTitulo.trim(),
      conteudo: novoConteudo.trim(),
      criado_por: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aviso criado.");
    setNovo(false);
    setNovoTitulo("");
    setNovoConteudo("");
    carregar();
  }

  async function salvarEdicao(id: string) {
    const { error } = await supabase
      .from("rotina_avisos")
      .update({ titulo: editTitulo.trim(), conteudo: editConteudo.trim() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aviso atualizado.");
    setEditando(null);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este aviso?")) return;
    const { error } = await supabase.from("rotina_avisos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aviso excluído.");
    carregar();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4" /> Mural de Avisos
          </CardTitle>
          {!novo && (
            <Button variant="outline" size="sm" onClick={() => setNovo(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo aviso
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {novo && (
          <div className="border border-dashed border-border rounded-md p-3 space-y-2">
            <Input
              placeholder="Título do aviso"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
            <Textarea
              placeholder="Conteúdo (opcional)"
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={criarAviso} disabled={!novoTitulo.trim()}>
                <Save className="w-3.5 h-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setNovo(false); setNovoTitulo(""); setNovoConteudo(""); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso no mural.</p>
        ) : (
          avisos.map((a) => (
            <div key={a.id} className="border border-border rounded-md p-3 space-y-2 group">
              {editando === a.id ? (
                <>
                  <Input
                    value={editTitulo}
                    onChange={(e) => setEditTitulo(e.target.value)}
                  />
                  <Textarea
                    value={editConteudo}
                    onChange={(e) => setEditConteudo(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => salvarEdicao(a.id)}>
                      <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-sm">{a.titulo}</div>
                  {a.conteudo && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {a.conteudo}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(isAdmin || a.criado_por === user?.id) && (
                        <>
                          <button
                            onClick={() => {
                              setEditando(a.id);
                              setEditTitulo(a.titulo);
                              setEditConteudo(a.conteudo);
                            }}
                            className="p-1 rounded hover:bg-accent text-muted-foreground"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => excluir(a.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
