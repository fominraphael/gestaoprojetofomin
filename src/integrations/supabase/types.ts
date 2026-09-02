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
      compras_cadastros: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          exige_anexo: boolean
          exige_descricao: boolean
          grupo: string | null
          id: string
          label: string
          obrigatorio: boolean
          ordem: number
          tipo_campo: string | null
          tipo_pessoa: string | null
          uf: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          exige_anexo?: boolean
          exige_descricao?: boolean
          grupo?: string | null
          id?: string
          label: string
          obrigatorio?: boolean
          ordem?: number
          tipo_campo?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          exige_anexo?: boolean
          exige_descricao?: boolean
          grupo?: string | null
          id?: string
          label?: string
          obrigatorio?: boolean
          ordem?: number
          tipo_campo?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      compras_chamados: {
        Row: {
          ano_modelo: string | null
          assumido_em: string | null
          assumido_por: string | null
          campos_extras: Json
          campos_liberados: string[] | null
          cancelado_em: string | null
          chassi: string | null
          codigo_avaliacao_nbs: string | null
          concluido_em: string | null
          cor_externa: string | null
          cpf_cnpj: string
          created_at: string
          criado_por: string
          estado_uf: string
          filial_id: string | null
          id: string
          loja_estoque: string | null
          modelo: string | null
          motivo_cancelamento: string | null
          motivo_pendencia: string | null
          motivo_suspensao: string | null
          nf_observacao: string | null
          nf_status: string | null
          nome: string
          notificacao_ultima_envio: Json
          observacao_cancelamento: string | null
          observacao_compra: string | null
          observacao_pendencia: string | null
          observacao_solicitante: string | null
          observacao_suspensao: string | null
          ordem: number | null
          placa: string
          renavam: string | null
          status: string
          status_entrou_em: string
          suspenso_em: string | null
          suspenso_por: string | null
          tem_inscricao_estadual: boolean | null
          tipo_compra: string
          tipo_pessoa: string
          updated_at: string
          valor_avaliado: number | null
        }
        Insert: {
          ano_modelo?: string | null
          assumido_em?: string | null
          assumido_por?: string | null
          campos_extras?: Json
          campos_liberados?: string[] | null
          cancelado_em?: string | null
          chassi?: string | null
          codigo_avaliacao_nbs?: string | null
          concluido_em?: string | null
          cor_externa?: string | null
          cpf_cnpj: string
          created_at?: string
          criado_por: string
          estado_uf: string
          filial_id?: string | null
          id?: string
          loja_estoque?: string | null
          modelo?: string | null
          motivo_cancelamento?: string | null
          motivo_pendencia?: string | null
          motivo_suspensao?: string | null
          nf_observacao?: string | null
          nf_status?: string | null
          nome: string
          notificacao_ultima_envio?: Json
          observacao_cancelamento?: string | null
          observacao_compra?: string | null
          observacao_pendencia?: string | null
          observacao_solicitante?: string | null
          observacao_suspensao?: string | null
          ordem?: number | null
          placa: string
          renavam?: string | null
          status?: string
          status_entrou_em?: string
          suspenso_em?: string | null
          suspenso_por?: string | null
          tem_inscricao_estadual?: boolean | null
          tipo_compra: string
          tipo_pessoa: string
          updated_at?: string
          valor_avaliado?: number | null
        }
        Update: {
          ano_modelo?: string | null
          assumido_em?: string | null
          assumido_por?: string | null
          campos_extras?: Json
          campos_liberados?: string[] | null
          cancelado_em?: string | null
          chassi?: string | null
          codigo_avaliacao_nbs?: string | null
          concluido_em?: string | null
          cor_externa?: string | null
          cpf_cnpj?: string
          created_at?: string
          criado_por?: string
          estado_uf?: string
          filial_id?: string | null
          id?: string
          loja_estoque?: string | null
          modelo?: string | null
          motivo_cancelamento?: string | null
          motivo_pendencia?: string | null
          motivo_suspensao?: string | null
          nf_observacao?: string | null
          nf_status?: string | null
          nome?: string
          notificacao_ultima_envio?: Json
          observacao_cancelamento?: string | null
          observacao_compra?: string | null
          observacao_pendencia?: string | null
          observacao_solicitante?: string | null
          observacao_suspensao?: string | null
          ordem?: number | null
          placa?: string
          renavam?: string | null
          status?: string
          status_entrou_em?: string
          suspenso_em?: string | null
          suspenso_por?: string | null
          tem_inscricao_estadual?: boolean | null
          tipo_compra?: string
          tipo_pessoa?: string
          updated_at?: string
          valor_avaliado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_chamados_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_debitos: {
        Row: {
          chamado_id: string
          comprovante_path: string | null
          created_at: string
          id: string
          observacao: string | null
          status: string
          tipo: string
        }
        Insert: {
          chamado_id: string
          comprovante_path?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          status: string
          tipo: string
        }
        Update: {
          chamado_id?: string
          comprovante_path?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_debitos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "compras_chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_documentos: {
        Row: {
          categoria: string
          chamado_id: string
          created_at: string
          descricao: string | null
          enviado_por: string | null
          id: string
          storage_path: string
        }
        Insert: {
          categoria: string
          chamado_id: string
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          categoria?: string
          chamado_id?: string
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_documentos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "compras_chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_historico: {
        Row: {
          acao: string
          anexo_path: string | null
          autor_id: string | null
          campo: string | null
          chamado_id: string
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          valor_antes: string | null
          valor_depois: string | null
        }
        Insert: {
          acao: string
          anexo_path?: string | null
          autor_id?: string | null
          campo?: string | null
          chamado_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          valor_antes?: string | null
          valor_depois?: string | null
        }
        Update: {
          acao?: string
          anexo_path?: string | null
          autor_id?: string | null
          campo?: string | null
          chamado_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          valor_antes?: string | null
          valor_depois?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_historico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "compras_chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_notificacoes: {
        Row: {
          chamado_id: string
          criado_em: string
          destinatario_id: string
          enviado_em: string | null
          id: string
          lido_em: string | null
          link: string | null
          mensagem: string
          status_notif: string
          tipo: string
          titulo: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          destinatario_id: string
          enviado_em?: string | null
          id?: string
          lido_em?: string | null
          link?: string | null
          mensagem: string
          status_notif?: string
          tipo: string
          titulo: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          destinatario_id?: string
          enviado_em?: string | null
          id?: string
          lido_em?: string | null
          link?: string | null
          mensagem?: string
          status_notif?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_notificacoes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "compras_chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_log: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          job_name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          job_name: string
          status: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      documentos_arquivo: {
        Row: {
          arquivo_nome: string
          arquivo_tamanho: number | null
          arquivo_url: string
          data_vencimento: string | null
          empresa_id: string
          id: string
          notificado_em: string | null
          storage_path: string | null
          tipo_id: string
          uploaded_at: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_tamanho?: number | null
          arquivo_url: string
          data_vencimento?: string | null
          empresa_id: string
          id?: string
          notificado_em?: string | null
          storage_path?: string | null
          tipo_id: string
          uploaded_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_tamanho?: number | null
          arquivo_url?: string
          data_vencimento?: string | null
          empresa_id?: string
          id?: string
          notificado_em?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string
          created_at: string
          email_notificacao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          created_at?: string
          email_notificacao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          created_at?: string
          email_notificacao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_acoes_matriz: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          faixa_id: string | null
          id: string
          tipo_acao: string
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          faixa_id?: string | null
          id?: string
          tipo_acao: string
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          faixa_id?: string | null
          id?: string
          tipo_acao?: string
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_acoes_matriz_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "estoque_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_anuncios: {
        Row: {
          ano_fabricacao: string | null
          ano_modelo: string | null
          canal_olx: boolean
          canal_site_proprio: boolean
          canal_webmotors: boolean
          chassi: string
          codigo: string | null
          conta: string | null
          cor: string | null
          created_at: string
          dados: Json
          deleted_at: string | null
          id: string
          importado_em: string
          km: number | null
          marca: string | null
          modelo: string | null
          placa: string | null
          plataformas: Json
          preco_venda: number | null
          qtd_fotos: number | null
          status: string | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          canal_olx?: boolean
          canal_site_proprio?: boolean
          canal_webmotors?: boolean
          chassi: string
          codigo?: string | null
          conta?: string | null
          cor?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          id?: string
          importado_em?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string | null
          plataformas?: Json
          preco_venda?: number | null
          qtd_fotos?: number | null
          status?: string | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          ano_fabricacao?: string | null
          ano_modelo?: string | null
          canal_olx?: boolean
          canal_site_proprio?: boolean
          canal_webmotors?: boolean
          chassi?: string
          codigo?: string | null
          conta?: string | null
          cor?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          id?: string
          importado_em?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string | null
          plataformas?: Json
          preco_venda?: number | null
          qtd_fotos?: number | null
          status?: string | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: []
      }
      estoque_empresas_nbs: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_exibicao: string
          origem_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_exibicao: string
          origem_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_exibicao?: string
          origem_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_empresas_nbs_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "estoque_origens"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_faixas_dias: {
        Row: {
          ativo: boolean
          created_at: string
          dia_fim: number
          dia_inicio: number
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_fim: number
          dia_inicio: number
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_fim?: number
          dia_inicio?: number
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      estoque_faixas_km: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          km_fim: number
          km_inicio: number
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          km_fim?: number
          km_inicio?: number
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          km_fim?: number
          km_inicio?: number
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      estoque_finalidades: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_importacoes: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          created_at: string
          id: string
          relatorio: Json
          tipo: string
          total_atualizados: number
          total_ignorados: number
          total_importados: number
          total_linhas: number
          user_id: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          id?: string
          relatorio?: Json
          tipo: string
          total_atualizados?: number
          total_ignorados?: number
          total_importados?: number
          total_linhas?: number
          user_id?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          id?: string
          relatorio?: Json
          tipo?: string
          total_atualizados?: number
          total_ignorados?: number
          total_importados?: number
          total_linhas?: number
          user_id?: string | null
        }
        Relationships: []
      }
      estoque_origens: {
        Row: {
          ativo: boolean
          codigo: number
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: number
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: number
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_pref_colunas: {
        Row: {
          colunas: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          colunas?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          colunas?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estoque_regra_leads: {
        Row: {
          created_at: string
          id: string
          leads_max: number | null
          leads_min: number | null
          ordem: number
          percentual: number
          regra_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leads_max?: number | null
          leads_min?: number | null
          ordem?: number
          percentual?: number
          regra_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leads_max?: number | null
          leads_min?: number | null
          ordem?: number
          percentual?: number
          regra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_regra_leads_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "estoque_regras"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_regras: {
        Row: {
          acao_aceleradores: boolean
          acao_auditoria: boolean
          acao_fotos_ia: boolean
          acao_repescagem: boolean
          arredonda_990: boolean
          ativo: boolean
          canais_exigidos: string[]
          canal_referencia: string
          checagem_mercado_ativa: boolean
          classificacao: string
          created_at: string
          faixa_id: string
          fallback_niveis: Json
          gera_tarefa: boolean
          id: string
          min_fotos: number
          nome_tarefa: string | null
          nova_finalidade: string | null
          percentual: number
          piso_fipe_ativo: boolean
          piso_fipe_percentual: number | null
          teto_fipe_ativo: boolean
          teto_fipe_percentual: number | null
          tipo_regra: string
          updated_at: string
        }
        Insert: {
          acao_aceleradores?: boolean
          acao_auditoria?: boolean
          acao_fotos_ia?: boolean
          acao_repescagem?: boolean
          arredonda_990?: boolean
          ativo?: boolean
          canais_exigidos?: string[]
          canal_referencia?: string
          checagem_mercado_ativa?: boolean
          classificacao: string
          created_at?: string
          faixa_id: string
          fallback_niveis?: Json
          gera_tarefa?: boolean
          id?: string
          min_fotos?: number
          nome_tarefa?: string | null
          nova_finalidade?: string | null
          percentual?: number
          piso_fipe_ativo?: boolean
          piso_fipe_percentual?: number | null
          teto_fipe_ativo?: boolean
          teto_fipe_percentual?: number | null
          tipo_regra?: string
          updated_at?: string
        }
        Update: {
          acao_aceleradores?: boolean
          acao_auditoria?: boolean
          acao_fotos_ia?: boolean
          acao_repescagem?: boolean
          arredonda_990?: boolean
          ativo?: boolean
          canais_exigidos?: string[]
          canal_referencia?: string
          checagem_mercado_ativa?: boolean
          classificacao?: string
          created_at?: string
          faixa_id?: string
          fallback_niveis?: Json
          gera_tarefa?: boolean
          id?: string
          min_fotos?: number
          nome_tarefa?: string | null
          nova_finalidade?: string | null
          percentual?: number
          piso_fipe_ativo?: boolean
          piso_fipe_percentual?: number | null
          teto_fipe_ativo?: boolean
          teto_fipe_percentual?: number | null
          tipo_regra?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_regras_faixa_id_fkey"
            columns: ["faixa_id"]
            isOneToOne: false
            referencedRelation: "estoque_faixas_dias"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_tarefas_lead: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          faixa_nome: string | null
          id: string
          nome: string
          regra_id: string | null
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          faixa_nome?: string | null
          id?: string
          nome: string
          regra_id?: string | null
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          faixa_nome?: string | null
          id?: string
          nome?: string
          regra_id?: string | null
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_tarefas_lead_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "estoque_regras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_tarefas_lead_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "estoque_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_valor_historico: {
        Row: {
          classificacao: string | null
          created_at: string
          faixa_nome: string | null
          id: string
          memoria_calculo: Json
          percentual: number | null
          regra_tipo: string | null
          valor_anterior: number | null
          valor_novo: number | null
          veiculo_id: string
        }
        Insert: {
          classificacao?: string | null
          created_at?: string
          faixa_nome?: string | null
          id?: string
          memoria_calculo?: Json
          percentual?: number | null
          regra_tipo?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
          veiculo_id: string
        }
        Update: {
          classificacao?: string | null
          created_at?: string
          faixa_nome?: string | null
          id?: string
          memoria_calculo?: Json
          percentual?: number | null
          regra_tipo?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_valor_historico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "estoque_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_veiculos: {
        Row: {
          acao_planilha: string | null
          ano_mod: string | null
          campos_manuais: string[]
          chassi: string
          chassi_resumido: string
          classificacao: string | null
          codigo_fipe: string | null
          cor: string | null
          created_at: string
          custo_total: number | null
          deleted_at: string | null
          dias_em_estoque: number
          editado_em: string | null
          em_repasse: boolean
          em_vendido: boolean
          empresa_nbs_id: string | null
          faixa_id_atual: string | null
          finalidade: string | null
          finalidade_atual: string | null
          fipe: number | null
          fotos_qtd: number | null
          id: string
          importado_em: string
          inativado_em: string | null
          inativo: boolean
          km: number | null
          leads_60_dias: number
          loja: string | null
          modelo: string | null
          origem_id: string
          percentual_fipe_planilha: number | null
          placa: string | null
          regional: string | null
          ultimo_calculo_em: string | null
          updated_at: string
          valor_anunciado_planilha: number | null
          valor_anuncio_calculado: number | null
          valor_manual_faixa_id: string | null
          valor_motor: number | null
        }
        Insert: {
          acao_planilha?: string | null
          ano_mod?: string | null
          campos_manuais?: string[]
          chassi: string
          chassi_resumido: string
          classificacao?: string | null
          codigo_fipe?: string | null
          cor?: string | null
          created_at?: string
          custo_total?: number | null
          deleted_at?: string | null
          dias_em_estoque?: number
          editado_em?: string | null
          em_repasse?: boolean
          em_vendido?: boolean
          empresa_nbs_id?: string | null
          faixa_id_atual?: string | null
          finalidade?: string | null
          finalidade_atual?: string | null
          fipe?: number | null
          fotos_qtd?: number | null
          id?: string
          importado_em?: string
          inativado_em?: string | null
          inativo?: boolean
          km?: number | null
          leads_60_dias?: number
          loja?: string | null
          modelo?: string | null
          origem_id: string
          percentual_fipe_planilha?: number | null
          placa?: string | null
          regional?: string | null
          ultimo_calculo_em?: string | null
          updated_at?: string
          valor_anunciado_planilha?: number | null
          valor_anuncio_calculado?: number | null
          valor_manual_faixa_id?: string | null
          valor_motor?: number | null
        }
        Update: {
          acao_planilha?: string | null
          ano_mod?: string | null
          campos_manuais?: string[]
          chassi?: string
          chassi_resumido?: string
          classificacao?: string | null
          codigo_fipe?: string | null
          cor?: string | null
          created_at?: string
          custo_total?: number | null
          deleted_at?: string | null
          dias_em_estoque?: number
          editado_em?: string | null
          em_repasse?: boolean
          em_vendido?: boolean
          empresa_nbs_id?: string | null
          faixa_id_atual?: string | null
          finalidade?: string | null
          finalidade_atual?: string | null
          fipe?: number | null
          fotos_qtd?: number | null
          id?: string
          importado_em?: string
          inativado_em?: string | null
          inativo?: boolean
          km?: number | null
          leads_60_dias?: number
          loja?: string | null
          modelo?: string | null
          origem_id?: string
          percentual_fipe_planilha?: number | null
          placa?: string | null
          regional?: string | null
          ultimo_calculo_em?: string | null
          updated_at?: string
          valor_anunciado_planilha?: number | null
          valor_anuncio_calculado?: number | null
          valor_manual_faixa_id?: string | null
          valor_motor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_veiculos_empresa_nbs_id_fkey"
            columns: ["empresa_nbs_id"]
            isOneToOne: false
            referencedRelation: "estoque_empresas_nbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_veiculos_faixa_id_atual_fkey"
            columns: ["faixa_id_atual"]
            isOneToOne: false
            referencedRelation: "estoque_faixas_dias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_veiculos_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "estoque_origens"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_vendas_historico: {
        Row: {
          ano_modelo: string | null
          chassi: string | null
          codigo_fipe: string | null
          created_at: string
          data_venda: string | null
          deleted_at: string | null
          dias_em_estoque: number | null
          finalidade: string | null
          id: string
          km: number | null
          loja: string | null
          lucro_bruto: number | null
          modelo: string | null
          nome_cliente: string | null
          placa: string | null
          regional: string | null
          updated_at: string
          valor_custo: number | null
          valor_imposto: number | null
          valor_venda: number | null
          vendedor: string | null
          versao: string | null
        }
        Insert: {
          ano_modelo?: string | null
          chassi?: string | null
          codigo_fipe?: string | null
          created_at?: string
          data_venda?: string | null
          deleted_at?: string | null
          dias_em_estoque?: number | null
          finalidade?: string | null
          id?: string
          km?: number | null
          loja?: string | null
          lucro_bruto?: number | null
          modelo?: string | null
          nome_cliente?: string | null
          placa?: string | null
          regional?: string | null
          updated_at?: string
          valor_custo?: number | null
          valor_imposto?: number | null
          valor_venda?: number | null
          vendedor?: string | null
          versao?: string | null
        }
        Update: {
          ano_modelo?: string | null
          chassi?: string | null
          codigo_fipe?: string | null
          created_at?: string
          data_venda?: string | null
          deleted_at?: string | null
          dias_em_estoque?: number | null
          finalidade?: string | null
          id?: string
          km?: number | null
          loja?: string | null
          lucro_bruto?: number | null
          modelo?: string | null
          nome_cliente?: string | null
          placa?: string | null
          regional?: string | null
          updated_at?: string
          valor_custo?: number | null
          valor_imposto?: number | null
          valor_venda?: number | null
          vendedor?: string | null
          versao?: string | null
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          campos_customizados: Json
          central_compras: boolean
          cnpj: string | null
          created_at: string
          email_recuperacao: string | null
          empresa_id: string | null
          filial_id: string | null
          id: string
          modulos: string[]
          nome_fantasia: string | null
          pode_criar_admin: boolean
          status: string
          tipo_usuario: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          campos_customizados?: Json
          central_compras?: boolean
          cnpj?: string | null
          created_at?: string
          email_recuperacao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          id: string
          modulos?: string[]
          nome_fantasia?: string | null
          pode_criar_admin?: boolean
          status?: string
          tipo_usuario?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          campos_customizados?: Json
          central_compras?: boolean
          cnpj?: string | null
          created_at?: string
          email_recuperacao?: string | null
          empresa_id?: string | null
          filial_id?: string | null
          id?: string
          modulos?: string[]
          nome_fantasia?: string | null
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
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rotina_anexos: {
        Row: {
          arquivo_path: string
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          nome_original: string
          tamanho: number | null
          tipo_mime: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_path: string
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          nome_original: string
          tamanho?: number | null
          tipo_mime?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_path?: string
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          nome_original?: string
          tamanho?: number | null
          tipo_mime?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      rotina_atividades: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string
          dias_semana: number[] | null
          frequencia: string
          id: string
          nome: string
          ordem: number
          periodo_mensal: string | null
          setor_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string
          dias_semana?: number[] | null
          frequencia: string
          id?: string
          nome: string
          ordem?: number
          periodo_mensal?: string | null
          setor_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string
          dias_semana?: number[] | null
          frequencia?: string
          id?: string
          nome?: string
          ordem?: number
          periodo_mensal?: string | null
          setor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_atividades_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "rotina_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_avisos: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string | null
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      rotina_checkpoints: {
        Row: {
          atividade_id: string
          concluido_por: string | null
          created_at: string
          data: string
          id: string
        }
        Insert: {
          atividade_id: string
          concluido_por?: string | null
          created_at?: string
          data?: string
          id?: string
        }
        Update: {
          atividade_id?: string
          concluido_por?: string | null
          created_at?: string
          data?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_checkpoints_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "rotina_atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_kpi_historico: {
        Row: {
          created_at: string
          id: string
          kpi_id: string
          mes: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_id: string
          mes: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi_id?: string
          mes?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rotina_kpi_historico_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "rotina_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_kpis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          unidade: string
          updated_at: string
          valor_atual: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          unidade?: string
          updated_at?: string
          valor_atual?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          unidade?: string
          updated_at?: string
          valor_atual?: number
        }
        Relationships: []
      }
      rotina_missao: {
        Row: {
          conteudo: string
          id: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          id?: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rotina_semanas: {
        Row: {
          created_at: string
          encerrado_por: string | null
          fim: string
          id: string
          inicio: string
          setor_id: string
          snapshot: Json
          total_atividades: number
          total_concluidos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          encerrado_por?: string | null
          fim: string
          id?: string
          inicio: string
          setor_id: string
          snapshot?: Json
          total_atividades?: number
          total_concluidos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          encerrado_por?: string | null
          fim?: string
          id?: string
          inicio?: string
          setor_id?: string
          snapshot?: Json
          total_atividades?: number
          total_concluidos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_semanas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "rotina_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_setor_funcoes: {
        Row: {
          created_at: string
          funcao_valor: string
          id: string
          setor_id: string
        }
        Insert: {
          created_at?: string
          funcao_valor: string
          id?: string
          setor_id: string
        }
        Update: {
          created_at?: string
          funcao_valor?: string
          id?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_setor_funcoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "rotina_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_setor_usuarios: {
        Row: {
          created_at: string
          id: string
          setor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_setor_usuarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "rotina_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_setores: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          descricao: string
          icone: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      rotina_tarefas: {
        Row: {
          concluido_em: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string
          id: string
          nome: string
          prazo: string | null
          setor_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string
          id?: string
          nome: string
          prazo?: string | null
          setor_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string
          id?: string
          nome?: string
          prazo?: string | null
          setor_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_tarefas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "rotina_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          ordem: number | null
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto: string | null
          responsaveis: string | null
          solicitante: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          subtitulo: string | null
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
          ordem?: number | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto?: string | null
          responsaveis?: string | null
          solicitante?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          subtitulo?: string | null
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
          ordem?: number | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"] | null
          projeto?: string | null
          responsaveis?: string | null
          solicitante?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          subtitulo?: string | null
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
      toyota_estoque_veiculos: {
        Row: {
          ano_fabricacao: number | null
          ano_modelo: number | null
          aprovado_em: string | null
          aprovado_por: string | null
          aprovado_toyota_em: string | null
          certificado_pdf_path: string | null
          certificado_uploaded_at: string | null
          chassi: string
          chassi_resumido: string | null
          checklist_data: Json | null
          checklist_itens: Json | null
          checklist_pdf_path: string | null
          codigo_tcuv: string | null
          created_at: string
          dados_originais: Json | null
          dossie_enviado_em: string | null
          dossie_pdf_path: string | null
          elegibilidade: string | null
          enviado_central_em: string | null
          enviado_posvendas_em: string | null
          enviado_toyota_em: string | null
          external_id: string | null
          filial_destino_id: string | null
          filial_id: string
          fonte_importacao: string
          health_check_pdf_path: string | null
          health_check_uploaded_at: string | null
          hsv_analisado_em: string | null
          hsv_analisado_por: string | null
          hsv_observacoes_preparador: string | null
          hsv_os_ajustes: string[]
          hsv_revisoes_pendentes: string[]
          hsv_status: string
          id: string
          importado_em: string
          laudo_arquivo_path: string | null
          laudo_url: string | null
          marca: string | null
          modelo: string | null
          motivo_reprovacao: string | null
          observacao_toyota: string | null
          origem: string | null
          placa: string | null
          posvendas_finalizado_em: string | null
          posvendas_finalizado_por: string | null
          posvendas_km: number | null
          quilometragem: number | null
          resultado_laudo: string | null
          retorno_toyota_em: string | null
          status_aprovacao: string
          status_cautelar: string | null
          ultimo_envio_toyota_em: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovado_toyota_em?: string | null
          certificado_pdf_path?: string | null
          certificado_uploaded_at?: string | null
          chassi: string
          chassi_resumido?: string | null
          checklist_data?: Json | null
          checklist_itens?: Json | null
          checklist_pdf_path?: string | null
          codigo_tcuv?: string | null
          created_at?: string
          dados_originais?: Json | null
          dossie_enviado_em?: string | null
          dossie_pdf_path?: string | null
          elegibilidade?: string | null
          enviado_central_em?: string | null
          enviado_posvendas_em?: string | null
          enviado_toyota_em?: string | null
          external_id?: string | null
          filial_destino_id?: string | null
          filial_id: string
          fonte_importacao?: string
          health_check_pdf_path?: string | null
          health_check_uploaded_at?: string | null
          hsv_analisado_em?: string | null
          hsv_analisado_por?: string | null
          hsv_observacoes_preparador?: string | null
          hsv_os_ajustes?: string[]
          hsv_revisoes_pendentes?: string[]
          hsv_status?: string
          id?: string
          importado_em?: string
          laudo_arquivo_path?: string | null
          laudo_url?: string | null
          marca?: string | null
          modelo?: string | null
          motivo_reprovacao?: string | null
          observacao_toyota?: string | null
          origem?: string | null
          placa?: string | null
          posvendas_finalizado_em?: string | null
          posvendas_finalizado_por?: string | null
          posvendas_km?: number | null
          quilometragem?: number | null
          resultado_laudo?: string | null
          retorno_toyota_em?: string | null
          status_aprovacao?: string
          status_cautelar?: string | null
          ultimo_envio_toyota_em?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovado_toyota_em?: string | null
          certificado_pdf_path?: string | null
          certificado_uploaded_at?: string | null
          chassi?: string
          chassi_resumido?: string | null
          checklist_data?: Json | null
          checklist_itens?: Json | null
          checklist_pdf_path?: string | null
          codigo_tcuv?: string | null
          created_at?: string
          dados_originais?: Json | null
          dossie_enviado_em?: string | null
          dossie_pdf_path?: string | null
          elegibilidade?: string | null
          enviado_central_em?: string | null
          enviado_posvendas_em?: string | null
          enviado_toyota_em?: string | null
          external_id?: string | null
          filial_destino_id?: string | null
          filial_id?: string
          fonte_importacao?: string
          health_check_pdf_path?: string | null
          health_check_uploaded_at?: string | null
          hsv_analisado_em?: string | null
          hsv_analisado_por?: string | null
          hsv_observacoes_preparador?: string | null
          hsv_os_ajustes?: string[]
          hsv_revisoes_pendentes?: string[]
          hsv_status?: string
          id?: string
          importado_em?: string
          laudo_arquivo_path?: string | null
          laudo_url?: string | null
          marca?: string | null
          modelo?: string | null
          motivo_reprovacao?: string | null
          observacao_toyota?: string | null
          origem?: string | null
          placa?: string | null
          posvendas_finalizado_em?: string | null
          posvendas_finalizado_por?: string | null
          posvendas_km?: number | null
          quilometragem?: number | null
          resultado_laudo?: string | null
          retorno_toyota_em?: string | null
          status_aprovacao?: string
          status_cautelar?: string | null
          ultimo_envio_toyota_em?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toyota_estoque_veiculos_filial_destino_id_fkey"
            columns: ["filial_destino_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toyota_estoque_veiculos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_patios"
            referencedColumns: ["id"]
          },
        ]
      }
      toyota_filiais: {
        Row: {
          ativo: boolean
          created_at: string
          dealer_number: string | null
          id: string
          nome: string
          nome_bi_toyota: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dealer_number?: string | null
          id?: string
          nome: string
          nome_bi_toyota?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dealer_number?: string | null
          id?: string
          nome?: string
          nome_bi_toyota?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      toyota_importacoes: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          created_at: string
          filial_id: string | null
          id: string
          mensagem: string | null
          status: string
          tipo: string
          total_ignorados: number | null
          total_linhas: number | null
          total_salvos: number | null
          user_id: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          mensagem?: string | null
          status: string
          tipo: string
          total_ignorados?: number | null
          total_linhas?: number | null
          total_salvos?: number | null
          user_id?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tipo?: string
          total_ignorados?: number | null
          total_linhas?: number | null
          total_salvos?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toyota_importacoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_patios"
            referencedColumns: ["id"]
          },
        ]
      }
      toyota_patios: {
        Row: {
          ativo: boolean
          created_at: string
          filial_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toyota_patios_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      toyota_revisoes: {
        Row: {
          certificacao: boolean | null
          chassi: string
          consultor_seminovos: string
          created_at: string | null
          data_abertura_os: string | null
          data_aprovacao: string | null
          data_execucao_concluida: string | null
          data_finalizacao: string | null
          data_inicio_execucao: string | null
          filial_id: string | null
          gestora_id: string | null
          id: string
          km_atual: number | null
          km_validado_mecanico: number | null
          link_health_check: string | null
          link_pdf_certificacao: string | null
          link_pdf_revalidacao: string | null
          mecanico_id: string | null
          modelo: string
          numero_os: string | null
          observacao_finalizacao: string | null
          observacao_gestora: string | null
          observacao_mecanico: string | null
          observacao_pos_vendas: string | null
          observacao_seminovos: string | null
          placa: string
          prioridade: string | null
          responsavel_pos_vendas_id: string | null
          revisao: boolean | null
          solicitante_id: string | null
          status: Database["public"]["Enums"]["toyota_revisao_status"] | null
          tipo_os: string | null
          updated_at: string | null
        }
        Insert: {
          certificacao?: boolean | null
          chassi: string
          consultor_seminovos: string
          created_at?: string | null
          data_abertura_os?: string | null
          data_aprovacao?: string | null
          data_execucao_concluida?: string | null
          data_finalizacao?: string | null
          data_inicio_execucao?: string | null
          filial_id?: string | null
          gestora_id?: string | null
          id?: string
          km_atual?: number | null
          km_validado_mecanico?: number | null
          link_health_check?: string | null
          link_pdf_certificacao?: string | null
          link_pdf_revalidacao?: string | null
          mecanico_id?: string | null
          modelo: string
          numero_os?: string | null
          observacao_finalizacao?: string | null
          observacao_gestora?: string | null
          observacao_mecanico?: string | null
          observacao_pos_vendas?: string | null
          observacao_seminovos?: string | null
          placa: string
          prioridade?: string | null
          responsavel_pos_vendas_id?: string | null
          revisao?: boolean | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["toyota_revisao_status"] | null
          tipo_os?: string | null
          updated_at?: string | null
        }
        Update: {
          certificacao?: boolean | null
          chassi?: string
          consultor_seminovos?: string
          created_at?: string | null
          data_abertura_os?: string | null
          data_aprovacao?: string | null
          data_execucao_concluida?: string | null
          data_finalizacao?: string | null
          data_inicio_execucao?: string | null
          filial_id?: string | null
          gestora_id?: string | null
          id?: string
          km_atual?: number | null
          km_validado_mecanico?: number | null
          link_health_check?: string | null
          link_pdf_certificacao?: string | null
          link_pdf_revalidacao?: string | null
          mecanico_id?: string | null
          modelo?: string
          numero_os?: string | null
          observacao_finalizacao?: string | null
          observacao_gestora?: string | null
          observacao_mecanico?: string | null
          observacao_pos_vendas?: string | null
          observacao_seminovos?: string | null
          placa?: string
          prioridade?: string | null
          responsavel_pos_vendas_id?: string | null
          revisao?: boolean | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["toyota_revisao_status"] | null
          tipo_os?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toyota_revisoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      toyota_usuario_filial: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toyota_usuario_filial_filial_id_fkey1"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "toyota_filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      toyota_usuario_patio: {
        Row: {
          created_at: string
          id: string
          patio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patio_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toyota_usuario_filial_filial_id_fkey"
            columns: ["patio_id"]
            isOneToOne: false
            referencedRelation: "toyota_patios"
            referencedColumns: ["id"]
          },
        ]
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
      tipos_usuario_publicos: {
        Row: {
          ativo: boolean | null
          campos_schema: Json | null
          id: string | null
          nome: string | null
          role: string | null
        }
        Insert: {
          ativo?: boolean | null
          campos_schema?: Json | null
          id?: string | null
          nome?: string | null
          role?: string | null
        }
        Update: {
          ativo?: boolean | null
          campos_schema?: Json | null
          id?: string | null
          nome?: string | null
          role?: string | null
        }
        Relationships: []
      }
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
      can_access_chamado: { Args: { _chamado_id: string }; Returns: boolean }
      can_access_documentos_object: {
        Args: { _name: string }
        Returns: boolean
      }
      has_filial: {
        Args: { _filial_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_old_trash: { Args: never; Returns: undefined }
      user_has_setor: {
        Args: { p_setor_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_setores: {
        Args: { p_user_id?: string }
        Returns: {
          setor_cor: string
          setor_id: string
          setor_nome: string
        }[]
      }
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
      toyota_revisao_status:
        | "aguardando_aprovacao"
        | "aprovado_pos_vendas"
        | "devolvido_seminovos"
        | "os_aberta"
        | "em_execucao"
        | "aguardando_documentos"
        | "finalizado"
        | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      toyota_revisao_status: [
        "aguardando_aprovacao",
        "aprovado_pos_vendas",
        "devolvido_seminovos",
        "os_aberta",
        "em_execucao",
        "aguardando_documentos",
        "finalizado",
        "cancelado",
      ],
    },
  },
} as const
