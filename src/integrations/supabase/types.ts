export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      tarefas: {
        Row: {
          categoria: Database["public"]["Enums"]["tarefa_categoria"]
          codigo: string | null
          created_at: string
          descricao_como: string | null
          descricao_porque: string | null
          estimativa_dias: number | null
          fim_previsto: string | null
          fim_real: string | null
          id: string
          inicio_previsto: string | null
          inicio_real: string | null
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto: string | null
          responsaveis: string | null
          solicitante: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          tags: string | null
          tipo: Database["public"]["Enums"]["tarefa_tipo"] | null
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["tarefa_categoria"]
          codigo?: string | null
          created_at?: string
          descricao_como?: string | null
          descricao_porque?: string | null
          estimativa_dias?: number | null
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto?: string | null
          responsaveis?: string | null
          solicitante?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tags?: string | null
          tipo?: Database["public"]["Enums"]["tarefa_tipo"] | null
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["tarefa_categoria"]
          codigo?: string | null
          created_at?: string
          descricao_como?: string | null
          descricao_porque?: string | null
          estimativa_dias?: number | null
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto?: string | null
          responsaveis?: string | null
          solicitante?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tags?: string | null
          tipo?: Database["public"]["Enums"]["tarefa_tipo"] | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tarefa_categoria: "backlog" | "roadmap" | "historico" | "solicitacao"
      tarefa_prioridade: "Baixa" | "Média" | "Alta"
      tarefa_status: "Não iniciada" | "Em andamento" | "Concluído"
      tarefa_tipo:
        | "Reunião"
        | "Treinamento"
        | "Desenho"
        | "Estudo de caso"
        | "Outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tarefa_categoria: ["backlog", "roadmap", "historico", "solicitacao"],
      tarefa_prioridade: ["Baixa", "Média", "Alta"],
      tarefa_status: ["Não iniciada", "Em andamento", "Concluído"],
      tarefa_tipo: [
        "Reunião",
        "Treinamento",
        "Desenho",
        "Estudo de caso",
        "Outro",
      ],
    },
  },
} as const
