import { useEffect, useState } from "react";
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
import type { Tarefa, Status, Prioridade, Categoria } from "@/lib/tarefas";
import { STATUSES, PRIORIDADES } from "@/lib/tarefas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarefa: Tarefa | null;
  defaultCategoria?: Categoria;
}

type FormState = {
  codigo: string;
  titulo: string;
  descricao_como: string;
  descricao_porque: string;
  projeto: string;
  responsaveis: string;
  status: Status;
  prioridade: Prioridade | "nenhuma";
  prazo_inicio: string;
  prazo_fim: string;
  categoria: Categoria;
  tags: string;
};

const empty = (cat: Categoria): FormState => ({
  codigo: "",
  titulo: "",
  descricao_como: "",
  descricao_porque: "",
  projeto: "",
  responsaveis: "",
  status: "Não iniciada",
  prioridade: "nenhuma",
  prazo_inicio: "",
  prazo_fim: "",
  categoria: cat,
  tags: "",
});

export function TarefaModal({ open, onOpenChange, tarefa, defaultCategoria = "backlog" }: Props) {
  const [form, setForm] = useState<FormState>(empty(defaultCategoria));
  const qc = useQueryClient();

  useEffect(() => {
    if (tarefa) {
      setForm({
        codigo: tarefa.codigo ?? "",
        titulo: tarefa.titulo,
        descricao_como: tarefa.descricao_como ?? "",
        descricao_porque: tarefa.descricao_porque ?? "",
        projeto: tarefa.projeto ?? "",
        responsaveis: tarefa.responsaveis ?? "",
        status: tarefa.status,
        prioridade: tarefa.prioridade ?? "nenhuma",
        prazo_inicio: tarefa.prazo_inicio ?? "",
        prazo_fim: tarefa.prazo_fim ?? "",
        categoria: tarefa.categoria,
        tags: tarefa.tags ?? "",
      });
    } else {
      setForm(empty(defaultCategoria));
    }
  }, [tarefa, defaultCategoria, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo || null,
        titulo: form.titulo,
        descricao_como: form.descricao_como || null,
        descricao_porque: form.descricao_porque || null,
        projeto: form.projeto || null,
        responsaveis: form.responsaveis || null,
        status: form.status,
        prioridade: form.prioridade === "nenhuma" ? null : form.prioridade,
        prazo_inicio: form.prazo_inicio || null,
        prazo_fim: form.prazo_fim || null,
        categoria: form.categoria,
        tags: form.tags || null,
      };
      if (tarefa) {
        const { error } = await supabase.from("tarefas").update(payload).eq("id", tarefa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tarefas").insert(payload);
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
      const { error } = await supabase.from("tarefas").delete().eq("id", tarefa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa excluída");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select
              value={form.prioridade}
              onValueChange={(v) => setForm({ ...form, prioridade: v as Prioridade | "nenhuma" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem prioridade</SelectItem>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v as Categoria })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="roadmap">Roadmap</SelectItem>
                <SelectItem value="historico">Histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div>
            <Label>Prazo início</Label>
            <Input
              type="date"
              value={form.prazo_inicio}
              onChange={(e) => setForm({ ...form, prazo_inicio: e.target.value })}
            />
          </div>
          <div>
            <Label>Prazo fim</Label>
            <Input
              type="date"
              value={form.prazo_fim}
              onChange={(e) => setForm({ ...form, prazo_fim: e.target.value })}
            />
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.titulo.trim() || save.isPending}
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
