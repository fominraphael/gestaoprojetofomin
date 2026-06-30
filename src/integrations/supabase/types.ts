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
      documentos_arquivo: {
        Row: {
          arquivo_nome: string
          arquivo_tamanho: number | null
          arquivo_url: string
          empresa_id: string
          id: string
          storage_path: string | null
          tipo_id: string
          uploaded_at: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_tamanho?: number | null
          arquivo_url: string
          empresa_id: string
          id?: string
          storage_path?: string | null
          tipo_id: string
          uploaded_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_tamanho?: number | null
          arquivo_url?: string
          empresa_id?: string
          id?: string
          storage_path?: string | null
          tipo_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_arquivo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_arquivo_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "documentos_tipo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_tipo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          campos_customizados: Json
          cnpj: string | null
          created_at: string
          empresa_id: string | null
          id: string
          modulos: string[]
          pode_criar_admin: boolean
          status: string
          tipo_usuario: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          campos_customizados?: Json
          cnpj?: string | null
          created_at?: string
          empresa_id?: string | null
          id: string
          modulos?: string[]
          pode_criar_admin?: boolean
          status?: string
          tipo_usuario?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          campos_customizados?: Json
          cnpj?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          modulos?: string[]
          pode_criar_admin?: boolean
          status?: string
          tipo_usuario?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          categoria: Database["public"]["Enums"]["tarefa_categoria"]
          categoria_origem:
            | Database["public"]["Enums"]["tarefa_categoria"]
            | null
          codigo: string | null
          created_at: string
          deleted_at: string | null
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
          user_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["tarefa_categoria"]
          categoria_origem?:
            | Database["public"]["Enums"]["tarefa_categoria"]
            | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
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
          user_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["tarefa_categoria"]
          categoria_origem?:
            | Database["public"]["Enums"]["tarefa_categoria"]
            | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
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
          user_id?: string
        }
        Relationships: []
      }
      tipos_usuario_config: {
        Row: {
          ativo: boolean
          campos_schema: Json
          created_at: string
          id: string
          nome: string
          role: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campos_schema?: Json
          created_at?: string
          id?: string
          nome: string
          role?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campos_schema?: Json
          created_at?: string
          id?: string
          nome?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_sistema: {
        Row: {
          ativo: boolean
          campos_customizados: Json
          cnpj: string | null
          created_at: string
          empresa_id: string | null
          id: string
          modulos: string[]
          password_hash: string
          pode_criar_admin: boolean
          role: string
          status: string
          tipo_usuario: string | null
          updated_at: string
          username: string
        }
        Insert: {
          ativo?: boolean
          campos_customizados?: Json
          cnpj?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          modulos?: string[]
          password_hash: string
          pode_criar_admin?: boolean
          role?: string
          status?: string
          tipo_usuario?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          ativo?: boolean
          campos_customizados?: Json
          cnpj?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          modulos?: string[]
          password_hash?: string
          pode_criar_admin?: boolean
          role?: string
          status?: string
          tipo_usuario?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      usuarios_sistema_public: {
        Row: {
          ativo: boolean | null
          campos_customizados: Json | null
          cnpj: string | null
          created_at: string | null
          empresa_id: string | null
          id: string | null
          modulos: string[] | null
          pode_criar_admin: boolean | null
          role: string | null
          status: string | null
          tipo_usuario: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          ativo?: boolean | null
          campos_customizados?: Json | null
          cnpj?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string | null
          modulos?: string[] | null
          pode_criar_admin?: boolean | null
          role?: string | null
          status?: string | null
          tipo_usuario?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          ativo?: boolean | null
          campos_customizados?: Json | null
          cnpj?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string | null
          modulos?: string[] | null
          pode_criar_admin?: boolean | null
          role?: string | null
          status?: string | null
          tipo_usuario?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_old_trash: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
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
