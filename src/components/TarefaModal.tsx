import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { Tarefa, Status, Prioridade, Categoria, TipoSolicitacao } from "@/lib/tarefas";
import { STATUSES, PRIORIDADES, TIPOS_SOLICITACAO } from "@/lib/tarefas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarefa: Tarefa | null;
  defaultCategoria?: Categoria;
}

type FormState = {
  codigo: string;
  titulo: string;
  subtitulo: string;
  descricao_como: string;
  descricao_porque: string;
  projeto: string;
  responsaveis: string;
  status: Status;
  prioridade: Prioridade | "nenhuma";
  ordem: string;
  inicio_previsto: string;
  estimativa_dias: string;
  inicio_real: string;
  fim_real: string;
  categoria: Categoria;
  tags: string;
  tipo: TipoSolicitacao | "nenhum";
  solicitante: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty = (cat: Categoria): FormState => ({
  codigo: "",
  titulo: "",
  subtitulo: "",
  descricao_como: "",
  descricao_porque: "",
  projeto: "",
  responsaveis: "",
  status: "Não iniciada",
  prioridade: "nenhuma",
  ordem: "",
  inicio_previsto: today(),
  estimativa_dias: "",
  inicio_real: "",
  fim_real: "",
  categoria: cat,
  tags: "",
  tipo: "nenhum",
  solicitante: "",
});

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TarefaModal({ open, onOpenChange, tarefa, defaultCategoria = "backlog" }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(empty(defaultCategoria));

  useEffect(() => {
    if (tarefa) {
      setForm({
        codigo: tarefa.codigo ?? "",
        titulo: tarefa.titulo,
        subtitulo: tarefa.subtitulo ?? "",
        descricao_como: tarefa.descricao_como ?? "",
        descricao_porque: tarefa.descricao_porque ?? "",
        projeto: tarefa.projeto ?? "",
        responsaveis: tarefa.responsaveis ?? "",
        status: tarefa.status,
        prioridade: tarefa.prioridade ?? "nenhuma",
        ordem: tarefa.ordem != null ? String(tarefa.ordem) : "",
        inicio_previsto: tarefa.inicio_previsto ?? "",
        estimativa_dias: tarefa.estimativa_dias != null ? String(tarefa.estimativa_dias) : "",
        inicio_real: tarefa.inicio_real ?? "",
        fim_real: tarefa.fim_real ?? "",
        categoria: tarefa.categoria,
        tags: tarefa.tags ?? "",
        tipo: tarefa.tipo ?? "nenhum",
        solicitante: tarefa.solicitante ?? "",
      });
    } else {
      setForm(empty(defaultCategoria));
    }
  }, [tarefa, defaultCategoria, open]);

  const fimPrevisto = useMemo(() => {
    const dias = parseInt(form.estimativa_dias, 10);
    if (!form.inicio_previsto || Number.isNaN(dias)) return "";
    return addDays(form.inicio_previsto, dias);
  }, [form.inicio_previsto, form.estimativa_dias]);

  const save = useMutation({
    mutationFn: async () => {
      const diasNum =
        form.estimativa_dias.trim() === "" ? null : parseInt(form.estimativa_dias, 10);
      const basePayload = {
        codigo: form.codigo || null,
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        descricao_como: form.descricao_como || null,
        descricao_porque: form.descricao_porque || null,
        projeto: form.projeto || null,
        responsaveis: form.responsaveis || null,
        status: form.status,
        prioridade: form.prioridade === "nenhuma" ? null : form.prioridade,
        ordem: form.ordem.trim() === "" ? null : parseInt(form.ordem, 10),
        estimativa_dias: diasNum != null && !Number.isNaN(diasNum) ? diasNum : null,
        inicio_real: form.inicio_real || null,
        fim_real: form.fim_real || null,
        categoria: form.categoria,
        tags: form.tags || null,
        tipo: form.categoria === "solicitacao" && form.tipo !== "nenhum" ? form.tipo : null,
        solicitante: form.categoria === "solicitacao" ? form.solicitante || null : null,
      };
      if (tarefa) {
        // inicio_previsto não é editável após criação
        const { error } = await supabase.from("tarefas").update(basePayload).eq("id", tarefa.id);
        if (error) throw error;
      } else {
        const inicio = form.inicio_previsto
          ? form.inicio_previsto
          : form.categoria === "solicitacao"
            ? null
            : today();
        if (!user) throw new Error("Sessão expirada. Faça login novamente.");
        const { error } = await supabase.from("tarefas").insert({
          ...basePayload,
          inicio_previsto: inicio,
          user_id: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success(tarefa ? "Tarefa atualizada" : "Tarefa criada");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!tarefa) return;
      // Soft-delete: move to lixeira preservando origem
      const origem =
        tarefa.categoria === "historico"
          ? (tarefa.categoria_origem ?? "backlog")
          : tarefa.categoria;
      const { error } = await supabase
        .from("tarefas")
        .update({
          categoria: "historico",
          categoria_origem: origem,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", tarefa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Movida para a lixeira");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (d: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="O que precisa ser feito"
            />
          </div>

          <div className="col-span-2">
            <Label>Subtítulo</Label>
            <Input
              value={form.subtitulo}
              onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
              placeholder="Resumo breve exibido abaixo do título na listagem"
              maxLength={200}
            />
          </div>

          <div>
            <Label>Código</Label>
            <Input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="GSH-00"
            />
          </div>
          <div>
            <Label>Projeto</Label>
            <Input
              value={form.projeto}
              onChange={(e) => setForm({ ...form, projeto: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <Label>Responsáveis</Label>
            <Input
              value={form.responsaveis}
              onChange={(e) => setForm({ ...form, responsaveis: e.target.value })}
              placeholder="Nomes separados por vírgula"
            />
          </div>

          <div className="col-span-2">
            <Label>Como</Label>
            <Textarea
              rows={3}
              value={form.descricao_como}
              onChange={(e) => setForm({ ...form, descricao_como: e.target.value })}
              placeholder="Como será executada"
            />
          </div>

          <div className="col-span-2">
            <Label>Porquê</Label>
            <Textarea
              rows={3}
              value={form.descricao_porque}
              onChange={(e) => setForm({ ...form, descricao_porque: e.target.value })}
              placeholder="Problema que resolve / justificativa"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Input
              type="number"
              min={1}
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              placeholder="1, 2, 3…"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Menor número aparece primeiro na fila.
            </p>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v as Categoria })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="roadmap">Roadmap</SelectItem>
                <SelectItem value="solicitacao">Solicitação</SelectItem>
                <SelectItem value="historico">Histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.categoria === "solicitacao" && (
            <>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as TipoSolicitacao | "nenhum" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem tipo</SelectItem>
                    {TIPOS_SOLICITACAO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Solicitante</Label>
                <Input
                  value={form.solicitante}
                  onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                  placeholder="Quem pediu"
                />
              </div>
            </>
          )}

          <div>
            <Label>Tags</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>

          <div className="col-span-2 border-t pt-3 mt-1">
            <h4 className="text-sm font-semibold mb-2">Planejamento</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>
                  Início previsto
                  {tarefa && <span className="ml-1 text-xs text-muted-foreground">(travado)</span>}
                </Label>
                <Input
                  type="date"
                  value={form.inicio_previsto}
                  disabled={!!tarefa}
                  onChange={(e) => setForm({ ...form, inicio_previsto: e.target.value })}
                />
              </div>
              <div>
                <Label>Estimativa (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimativa_dias}
                  onChange={(e) => setForm({ ...form, estimativa_dias: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Fim previsto</Label>
                <Input value={fmt(fimPrevisto || (tarefa?.fim_previsto ?? ""))} disabled readOnly />
              </div>
            </div>
          </div>

          <div className="col-span-2 border-t pt-3">
            <h4 className="text-sm font-semibold mb-2">Execução</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início real</Label>
                <Input
                  type="date"
                  value={form.inicio_real}
                  onChange={(e) => setForm({ ...form, inicio_real: e.target.value })}
                />
              </div>
              <div>
                <Label>Fim real</Label>
                <Input
                  type="date"
                  value={form.fim_real}
                  onChange={(e) => setForm({ ...form, fim_real: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <div>
            {tarefa && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Excluir esta tarefa?")) del.mutate();
                }}
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!form.titulo.trim() || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
