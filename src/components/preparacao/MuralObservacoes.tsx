import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const BUCKET = "prep-anexos";

interface Observacao {
  id: string; texto: string; autor_id: string | null; autor_nome: string | null; created_at: string;
  prep_observacoes_anexos: { id: string; storage_path: string; nome_original: string }[];
}

export function MuralObservacoes({ placa }: { placa: string }) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const chave = ["prep", "mural", placa];

  const { data = [], isLoading } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prep_observacoes")
        .select("*, prep_observacoes_anexos(id, storage_path, nome_original)")
        .eq("placa", placa)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Observacao[];
    },
  });

  const enviar = async () => {
    if (!user || !texto.trim()) return;
    setEnviando(true);
    try {
      const { data: obs, error } = await supabase
        .from("prep_observacoes")
        .insert({ placa, texto: texto.trim(), autor_id: user.id, autor_nome: user.username })
        .select("id")
        .single();
      if (error) throw error;
      for (const f of arquivos) {
        const path = `${placa}/${obs.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, f);
        if (up.error) throw up.error;
        const { error: e2 } = await supabase.from("prep_observacoes_anexos").insert({ observacao_id: obs.id, storage_path: path, nome_original: f.name, tamanho: f.size });
        if (e2) throw e2;
      }
      setTexto("");
      setArquivos([]);
      toast.success("Observação registrada.");
      await qc.invalidateQueries({ queryKey: chave });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar observação.");
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error || !data) return toast.error("Não foi possível abrir o anexo.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("prep_observacoes").delete().eq("id", id);
    if (error) return toast.error("Não foi possível excluir.");
    await qc.invalidateQueries({ queryKey: chave });
  };

  return (
    <Card className="p-4 space-y-4">
      <h2 className="font-semibold">Mural de observações</h2>
      <div className="space-y-2">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma observação sobre este veículo…" aria-label="Nova observação" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Paperclip className="h-4 w-4" /> Anexar arquivos
            <Input type="file" multiple className="hidden" onChange={(e) => setArquivos(Array.from(e.target.files ?? []))} />
          </label>
          {arquivos.length > 0 && <span className="text-xs text-muted-foreground">{arquivos.map((f) => f.name).join(", ")}</span>}
          <Button size="sm" className="ml-auto" onClick={enviar} disabled={enviando || !texto.trim()}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Registrar
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma observação ainda.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.id} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{o.autor_nome ?? "—"}</span>
                <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                {(o.autor_id === user?.id || isAdmin) && (
                  <button className="ml-auto hover:text-destructive" onClick={() => excluir(o.id)} aria-label="Excluir observação"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{o.texto}</p>
              {o.prep_observacoes_anexos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.prep_observacoes_anexos.map((a) => (
                    <button key={a.id} onClick={() => abrir(a.storage_path)} className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs hover:bg-muted">
                      <Paperclip className="h-3 w-3" /> {a.nome_original}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
