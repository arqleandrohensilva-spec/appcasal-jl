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
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          owner?: Database["public"]["Enums"]["pessoa"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          owner: Database["public"]["Enums"]["pessoa"]
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit?: number
          owner: Database["public"]["Enums"]["pessoa"]
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          owner?: Database["public"]["Enums"]["pessoa"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          card_limit: number
          closing_day: number
          color: string
          created_at: string
          due_day: number
          id: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          card_limit?: number
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          card_limit?: number
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          name?: string
          owner?: Database["public"]["Enums"]["pessoa"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          thread_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          thread_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
          thread_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          note: string | null
          owner: Database["public"]["Enums"]["pessoa"]
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          goal_id: string
          id?: string
          note?: string | null
          owner: Database["public"]["Enums"]["pessoa"]
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          note?: string | null
          owner?: Database["public"]["Enums"]["pessoa"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          target: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          owner: Database["public"]["Enums"]["pessoa"]
          target?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          owner?: Database["public"]["Enums"]["pessoa"]
          target?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_workspace_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          pessoa: Database["public"]["Enums"]["pessoa"] | null
          updated_at: string
        }
        Insert: {
          active_workspace_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          pessoa?: Database["public"]["Enums"]["pessoa"] | null
          updated_at?: string
        }
        Update: {
          active_workspace_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          pessoa?: Database["public"]["Enums"]["pessoa"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_workspace_id_fkey"
            columns: ["active_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category: string
          created_at: string
          date: string
          description: string
          group_id: string | null
          id: string
          installment_current: number | null
          installment_total: number | null
          owner: Database["public"]["Enums"]["pessoa"]
          payment_method: string
          pessoa: Database["public"]["Enums"]["pessoa"]
          recurrence: Database["public"]["Enums"]["recurrence"] | null
          recurrence_end_date: string | null
          type: Database["public"]["Enums"]["tx_type"]
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category?: string
          created_at?: string
          date: string
          description: string
          group_id?: string | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          owner: Database["public"]["Enums"]["pessoa"]
          payment_method?: string
          pessoa: Database["public"]["Enums"]["pessoa"]
          recurrence?: Database["public"]["Enums"]["recurrence"] | null
          recurrence_end_date?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          group_id?: string | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          owner?: Database["public"]["Enums"]["pessoa"]
          payment_method?: string
          pessoa?: Database["public"]["Enums"]["pessoa"]
          recurrence?: Database["public"]["Enums"]["recurrence"] | null
          recurrence_end_date?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      join_workspace_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      account_type: "corrente" | "poupanca" | "dinheiro" | "investimento"
      pessoa: "leandro" | "jonathan" | "casal"
      recurrence: "none" | "weekly" | "monthly"
      tx_type: "receita" | "despesa"
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
      account_type: ["corrente", "poupanca", "dinheiro", "investimento"],
      pessoa: ["leandro", "jonathan", "casal"],
      recurrence: ["none", "weekly", "monthly"],
      tx_type: ["receita", "despesa"],
    },
  },
} as const
