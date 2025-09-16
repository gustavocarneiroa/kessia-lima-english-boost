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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          anotacoes_externas: string | null
          anotacoes_internas: string | null
          assunto: string | null
          contract_id: string
          created_at: string
          data_aula: string
          horario_aula: string
          id: string
          links_acesso: string | null
          realizada: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          anotacoes_externas?: string | null
          anotacoes_internas?: string | null
          assunto?: string | null
          contract_id: string
          created_at?: string
          data_aula: string
          horario_aula: string
          id?: string
          links_acesso?: string | null
          realizada?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          anotacoes_externas?: string | null
          anotacoes_internas?: string | null
          assunto?: string | null
          contract_id?: string
          created_at?: string
          data_aula?: string
          horario_aula?: string
          id?: string
          links_acesso?: string | null
          realizada?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          dias_semana: number[]
          horarios_aulas: Json
          id: string
          is_active: boolean
          quantidade_aulas: number
          quantidade_parcelas: number
          student_country_code: string
          student_cpf: string | null
          student_data_nascimento: string | null
          student_email: string
          student_endereco: string
          student_id: string
          student_name: string
          student_pais: string | null
          student_preferred_name: string | null
          student_rg: string | null
          student_whatsapp: string
          tenant_cnpj: string
          tenant_cpf_professora: string
          tenant_endereco: string
          tenant_id: string
          tenant_nome_fantasia: string | null
          tenant_nome_professora: string
          tenant_razao_social: string
          tenant_telefone: string
          tenant_valor_base_hora_aula: number
          updated_at: string
          valor_aula: number
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dias_semana: number[]
          horarios_aulas?: Json
          id?: string
          is_active?: boolean
          quantidade_aulas: number
          quantidade_parcelas?: number
          student_country_code: string
          student_cpf?: string | null
          student_data_nascimento?: string | null
          student_email: string
          student_endereco: string
          student_id: string
          student_name: string
          student_pais?: string | null
          student_preferred_name?: string | null
          student_rg?: string | null
          student_whatsapp: string
          tenant_cnpj: string
          tenant_cpf_professora: string
          tenant_endereco: string
          tenant_id: string
          tenant_nome_fantasia?: string | null
          tenant_nome_professora: string
          tenant_razao_social: string
          tenant_telefone: string
          tenant_valor_base_hora_aula: number
          updated_at?: string
          valor_aula: number
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dias_semana?: number[]
          horarios_aulas?: Json
          id?: string
          is_active?: boolean
          quantidade_aulas?: number
          quantidade_parcelas?: number
          student_country_code?: string
          student_cpf?: string | null
          student_data_nascimento?: string | null
          student_email?: string
          student_endereco?: string
          student_id?: string
          student_name?: string
          student_pais?: string | null
          student_preferred_name?: string | null
          student_rg?: string | null
          student_whatsapp?: string
          tenant_cnpj?: string
          tenant_cpf_professora?: string
          tenant_endereco?: string
          tenant_id?: string
          tenant_nome_fantasia?: string | null
          tenant_nome_professora?: string
          tenant_razao_social?: string
          tenant_telefone?: string
          tenant_valor_base_hora_aula?: number
          updated_at?: string
          valor_aula?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      result: {
        Row: {
          json_build_object: Json | null
        }
        Insert: {
          json_build_object?: Json | null
        }
        Update: {
          json_build_object?: Json | null
        }
        Relationships: []
      }
      scheduled_classes: {
        Row: {
          contract_id: string
          created_at: string
          data_aula: string
          horario_aula: string
          id: string
          motivo_cancelamento: string | null
          sequence_number: number
          student_id: string
          turno: string | null
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          data_aula: string
          horario_aula: string
          id?: string
          motivo_cancelamento?: string | null
          sequence_number: number
          student_id: string
          turno?: string | null
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          data_aula?: string
          horario_aula?: string
          id?: string
          motivo_cancelamento?: string | null
          sequence_number?: number
          student_id?: string
          turno?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_classes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          note_content: string
          scheduled_class_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          note_content: string
          scheduled_class_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          note_content?: string
          scheduled_class_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class_reminders: boolean
          country_code: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          endereco: string
          id: string
          name: string
          pais: string | null
          preferred_name: string | null
          reminder_confirmations: boolean
          rg: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          class_reminders?: boolean
          country_code?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          endereco?: string
          id?: string
          name?: string
          pais?: string | null
          preferred_name?: string | null
          reminder_confirmations?: boolean
          rg?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          class_reminders?: boolean
          country_code?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          endereco?: string
          id?: string
          name?: string
          pais?: string | null
          preferred_name?: string | null
          reminder_confirmations?: boolean
          rg?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant: {
        Row: {
          cnpj: string
          cpf_professora: string
          created_at: string
          endereco: string
          id: string
          nome_fantasia: string | null
          nome_professora: string
          razao_social: string
          telefone: string
          updated_at: string
          valor_base_hora_aula: number
        }
        Insert: {
          cnpj: string
          cpf_professora: string
          created_at?: string
          endereco: string
          id?: string
          nome_fantasia?: string | null
          nome_professora: string
          razao_social: string
          telefone: string
          updated_at?: string
          valor_base_hora_aula: number
        }
        Update: {
          cnpj?: string
          cpf_professora?: string
          created_at?: string
          endereco?: string
          id?: string
          nome_fantasia?: string | null
          nome_professora?: string
          razao_social?: string
          telefone?: string
          updated_at?: string
          valor_base_hora_aula?: number
        }
        Relationships: []
      }
      tenant_vacations: {
        Row: {
          ano: number
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          motivo: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          motivo: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          motivo?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_tenant: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      verify_student_access: {
        Args: { p_cpf_first_4: string; p_email: string }
        Returns: Json
      }
      verify_student_access1: {
        Args: { p_cpf_first_4: string; p_email: string }
        Returns: Record<string, unknown>
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
