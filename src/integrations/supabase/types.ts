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
      business_profiles: {
        Row: {
          business_name: string
          contact: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          contact?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          contact?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          created_at: string
          date: string
          expenses: number
          id: string
          profit: number
          raw_input: string | null
          revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          expenses?: number
          id?: string
          profit?: number
          raw_input?: string | null
          revenue?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          expenses?: number
          id?: string
          profit?: number
          raw_input?: string | null
          revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_versions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          notes: string | null
          status: string
          storage_path: string
          updated_at: string
          version_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          version_label: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          version_label?: string
        }
        Relationships: []
      }
      efris_documents: {
        Row: {
          created_at: string
          customer_brn: string | null
          customer_name: string | null
          customer_nin: string | null
          customer_tin: string | null
          customer_type: string
          doc_type: string
          fdn: string | null
          id: string
          issue_date: string
          items: Json
          local_number: string
          qr_code: string | null
          reason: string | null
          related_document_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          ura_response: Json | null
          user_id: string
          vat_amount: number
          verification_code: string | null
        }
        Insert: {
          created_at?: string
          customer_brn?: string | null
          customer_name?: string | null
          customer_nin?: string | null
          customer_tin?: string | null
          customer_type?: string
          doc_type: string
          fdn?: string | null
          id?: string
          issue_date?: string
          items?: Json
          local_number: string
          qr_code?: string | null
          reason?: string | null
          related_document_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          ura_response?: Json | null
          user_id: string
          vat_amount?: number
          verification_code?: string | null
        }
        Update: {
          created_at?: string
          customer_brn?: string | null
          customer_name?: string | null
          customer_nin?: string | null
          customer_tin?: string | null
          customer_type?: string
          doc_type?: string
          fdn?: string | null
          id?: string
          issue_date?: string
          items?: Json
          local_number?: string
          qr_code?: string | null
          reason?: string | null
          related_document_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          ura_response?: Json | null
          user_id?: string
          vat_amount?: number
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "efris_documents_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "efris_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      efris_products: {
        Row: {
          commodity_code: string | null
          created_at: string
          id: string
          inventory_item_id: string | null
          item_code: string | null
          kind: string
          name: string
          unit: string
          unit_price: number
          user_id: string
          vat_category: string
        }
        Insert: {
          commodity_code?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_code?: string | null
          kind?: string
          name: string
          unit?: string
          unit_price?: number
          user_id: string
          vat_category?: string
        }
        Update: {
          commodity_code?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_code?: string | null
          kind?: string
          name?: string
          unit?: string
          unit_price?: number
          user_id?: string
          vat_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "efris_products_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          quantity: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          contact: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          contact?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          contact?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_profiles: {
        Row: {
          brn: string | null
          business_address: string | null
          created_at: string
          efris_connection: string
          efris_device_no: string | null
          efris_status: string
          id: string
          legal_name: string | null
          prices_include_vat: boolean
          taxpayer_type: string
          tin: string | null
          updated_at: string
          user_id: string
          vat_registration_date: string | null
          vat_status: string
        }
        Insert: {
          brn?: string | null
          business_address?: string | null
          created_at?: string
          efris_connection?: string
          efris_device_no?: string | null
          efris_status?: string
          id?: string
          legal_name?: string | null
          prices_include_vat?: boolean
          taxpayer_type?: string
          tin?: string | null
          updated_at?: string
          user_id: string
          vat_registration_date?: string | null
          vat_status?: string
        }
        Update: {
          brn?: string | null
          business_address?: string | null
          created_at?: string
          efris_connection?: string
          efris_device_no?: string | null
          efris_status?: string
          id?: string
          legal_name?: string | null
          prices_include_vat?: boolean
          taxpayer_type?: string
          tin?: string | null
          updated_at?: string
          user_id?: string
          vat_registration_date?: string | null
          vat_status?: string
        }
        Relationships: []
      }
      tax_returns: {
        Row: {
          authorized_at: string | null
          created_at: string
          figures: Json
          id: string
          inputs: Json
          manual_ack_reference: string | null
          manual_filed_at: string | null
          notes: string | null
          period_end: string
          period_start: string
          return_type: string
          status: string
          updated_at: string
          ura_ack: Json | null
          user_id: string
        }
        Insert: {
          authorized_at?: string | null
          created_at?: string
          figures?: Json
          id?: string
          inputs?: Json
          manual_ack_reference?: string | null
          manual_filed_at?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          return_type: string
          status?: string
          updated_at?: string
          ura_ack?: Json | null
          user_id: string
        }
        Update: {
          authorized_at?: string | null
          created_at?: string
          figures?: Json
          id?: string
          inputs?: Json
          manual_ack_reference?: string | null
          manual_filed_at?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          return_type?: string
          status?: string
          updated_at?: string
          ura_ack?: Json | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
