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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          organization: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_requested: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string
          status?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          country: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          region: string | null
          subdivision: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          region?: string | null
          subdivision?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string | null
          subdivision?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          category: string
          context: string | null
          created_at: string
          id: string
          metadata: Json | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          context?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          context?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      escalations: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          id: string
          incident_id: string
          incident_title: string
          notes: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by: string
          id?: string
          incident_id: string
          incident_title: string
          notes?: string | null
          priority: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          id?: string
          incident_id?: string
          incident_title?: string
          notes?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          analyst: string | null
          category: string
          confidence: number
          country: string | null
          created_at: string
          datetime: string
          id: string
          lat: number | null
          lng: number | null
          location: string
          region: string
          section: string
          severity: number
          sources: string[] | null
          status: Database["public"]["Enums"]["incident_status"]
          subdivision: string | null
          summary: string | null
          title: string
          trend: string | null
          updated_at: string
        }
        Insert: {
          analyst?: string | null
          category: string
          confidence: number
          country?: string | null
          created_at?: string
          datetime?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location: string
          region: string
          section?: string
          severity: number
          sources?: string[] | null
          status?: Database["public"]["Enums"]["incident_status"]
          subdivision?: string | null
          summary?: string | null
          title: string
          trend?: string | null
          updated_at?: string
        }
        Update: {
          analyst?: string | null
          category?: string
          confidence?: number
          country?: string | null
          created_at?: string
          datetime?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string
          region?: string
          section?: string
          severity?: number
          sources?: string[] | null
          status?: Database["public"]["Enums"]["incident_status"]
          subdivision?: string | null
          summary?: string | null
          title?: string
          trend?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monitored_regions: {
        Row: {
          country: string
          country_label: string
          created_at: string
          id: string
          region: string
          region_label: string
          subdivision: string | null
          subdivision_label: string | null
          user_id: string
        }
        Insert: {
          country: string
          country_label: string
          created_at?: string
          id?: string
          region: string
          region_label: string
          subdivision?: string | null
          subdivision_label?: string | null
          user_id: string
        }
        Update: {
          country?: string
          country_label?: string
          created_at?: string
          id?: string
          region?: string
          region_label?: string
          subdivision?: string | null
          subdivision_label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      osint_sources: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          label: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          label: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          label?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          checkpoints: Json | null
          country: string | null
          created_at: string
          end_label: string
          end_lat: number
          end_lng: number
          id: string
          name: string
          region: string | null
          start_label: string
          start_lat: number
          start_lng: number
          subdivision: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checkpoints?: Json | null
          country?: string | null
          created_at?: string
          end_label: string
          end_lat: number
          end_lng: number
          id?: string
          name: string
          region?: string | null
          start_label: string
          start_lat: number
          start_lng: number
          subdivision?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checkpoints?: Json | null
          country?: string | null
          created_at?: string
          end_label?: string
          end_lat?: number
          end_lng?: number
          id?: string
          name?: string
          region?: string | null
          start_label?: string
          start_lat?: number
          start_lng?: number
          subdivision?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_channels: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          label: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          label: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          label?: string
          username?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_my_organization_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "operator" | "viewer" | "executive"
      incident_status: "ai" | "reviewed" | "confirmed"
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
      app_role: ["admin", "analyst", "operator", "viewer", "executive"],
      incident_status: ["ai", "reviewed", "confirmed"],
    },
  },
} as const
