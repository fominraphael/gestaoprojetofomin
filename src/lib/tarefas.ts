import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type Status = "Não iniciada" | "Em andamento" | "Concluído";
export type Prioridade = "Baixa" | "Média" | "Alta";
export type Categoria = "backlog" | "roadmap" | "historico" | "solicitacao";
export type TipoSolicitacao = "Reunião" | "Treinamento" | "Desenho" | "Estudo de caso" | "Outro";

export const TIPOS_SOLICITACAO: TipoSolicitacao[] = [
  "Reunião",
  "Treinamento",
  "Desenho",
  "Estudo de caso",
  "Outro",
];

export interface Tarefa {
  id: string;
  codigo: string | null;
  titulo: string;
  subtitulo: string | null;
  descricao_como: string | null;
  descricao_porque: string | null;
  projeto: string | null;
  responsaveis: string | null;
  status: Status;
  prioridade: Prioridade | null;
  inicio_previsto: string | null;
  estimativa_dias: number | null;
  fim_previsto: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  categoria: Categoria;
  tags: string | null;
  tipo: TipoSolicitacao | null;
  solicitante: string | null;
  categoria_origem: Categoria | null;
  ordem: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUSES: Status[] = ["Não iniciada", "Em andamento", "Concluído"];
export const PRIORIDADES: Prioridade[] = ["Baixa", "Média", "Alta"];

export const tarefasQuery = (categoria?: Categoria) =>
  queryOptions({
    queryKey: ["tarefas", categoria ?? "all"],
    queryFn: async (): Promise<Tarefa[]> => {
      let q = supabase.from("tarefas").select("*").order("updated_at", { ascending: false });
      if (categoria) q = q.eq("categoria", categoria);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
  });

export const todasTarefasQuery = () =>
  queryOptions({
    queryKey: ["tarefas", "all"],
    queryFn: async (): Promise<Tarefa[]> => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
  });

export const statusColor: Record<Status, string> = {
  "Não iniciada": "bg-status-todo-bg text-status-todo",
  "Em andamento": "bg-status-doing-bg text-status-doing",
  Concluído: "bg-status-done-bg text-status-done",
};

export const statusDot: Record<Status, string> = {
  "Não iniciada": "bg-status-todo",
  "Em andamento": "bg-status-doing",
  Concluído: "bg-status-done",
};

export const prioColor: Record<Prioridade, string> = {
  Baixa: "bg-muted text-prio-low border border-border",
  Média: "bg-prio-med/10 text-prio-med border border-prio-med/30",
  Alta: "bg-prio-high/10 text-prio-high border border-prio-high/30",
};

/**
 * Tarefa em risco: status "Em andamento", fim_previsto no passado e sem fim_real.
 */
export function isEmRisco(t: Tarefa): boolean {
  if (t.status !== "Em andamento") return false;
  if (!t.fim_previsto) return false;
  if (t.fim_real) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(t.fim_previsto + "T00:00:00");
  return fim.getTime() < hoje.getTime();
}
