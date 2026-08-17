import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, ListTodo } from "lucide-react";
import { AnexosUpload } from "@/components/rotina/AnexosUpload";
import {
  type Tarefa,
  type StatusTarefa,
  STATUS_TAREFA_LABELS,
  STATUS_TAREFA_COLORS,
} from "@/lib/rotina";

export function TarefaDetalhe() {
  const { id } = useParams({ from: "/_authenticated/_rotina/rotina/tarefa/$id" });
  const { user, isAdmin } = useAuth();
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<StatusTarefa>("a_fazer");
  const [prazo, setPrazo] = useState("");
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rotina_tarefas")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Tarefa não encontrada.");
      setLoading(false);
      return;
    }
    setTarefa(data as any);
    setDescricao((data as any).descricao ?? "");
    setStatus((data as any).status);
    setPrazo((data as any).prazo ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar() {
    if (!tarefa) return;
    setSalvando(true);
    const { error } = await supabase
      .from("rotina_tarefas")
      .update({
        descricao: descricao.trim(),
        status,
        prazo: prazo || null,
      })
      .eq("id", tarefa.id);
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTarefa({ ...tarefa, descricao: descricao.trim(), status, prazo: prazo || null });
    setEditando(false);
    toast.success("Tarefa atualizada.");
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!tarefa) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Tarefa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" asChild>
        <Link
          to="/rotina/$setorId"
          params={{ setorId: tarefa.setor_id ?? "" }}
          search={{ tab: "tarefas" as const }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar às Atividades Pontuais
        </Link>
      </Button>


      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ListTodo className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{tarefa.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_TAREFA_COLORS[tarefa.status]}`}
            >
              {STATUS_TAREFA_LABELS[tarefa.status]}
            </Badge>
            {tarefa.prazo && (
              <span className="text-sm text-muted-foreground">
                Prazo: {new Date(tarefa.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        {!editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      </div>

      {/* Edição */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editando ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as StatusTarefa)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_TAREFA_LABELS) as StatusTarefa[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_TAREFA_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Prazo</label>
                  <Input
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={6}
                  placeholder="Descreva esta tarefa…"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={salvar} disabled={salvando}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {salvando ? "Salvando…" : "Salvar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditando(false);
                    setDescricao(tarefa.descricao ?? "");
                    setStatus(tarefa.status);
                    setPrazo(tarefa.prazo ?? "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_TAREFA_COLORS[tarefa.status]}`}
                  >
                    {STATUS_TAREFA_LABELS[tarefa.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo:</span>{" "}
                  {tarefa.prazo
                    ? new Date(tarefa.prazo + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Descrição:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {tarefa.descricao || "Nenhuma descrição adicionada."}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Anexos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Anexos</CardTitle>
        </CardHeader>
        <CardContent>
          <AnexosUpload entidade="tarefa" entidadeId={tarefa.id} />
        </CardContent>
      </Card>
    </div>
  );
}
