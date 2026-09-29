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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          delivery_status: string | null
          id: string
          is_nudge: boolean | null
          reactions: Json | null
          read_at: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          is_nudge?: boolean | null
          reactions?: Json | null
          read_at?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          is_nudge?: boolean | null
          reactions?: Json | null
          read_at?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          disconnect_reason: string | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string | null
          status: string | null
          title: string | null
          topics: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          status?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          status?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          age_range: string | null
          astrology_familiarity: string | null
          can_contact: boolean | null
          chat_purpose: string[]
          chat_purpose_other: string | null
          clarity_rating: number | null
          consent_given: boolean
          contact_email: string | null
          country: string | null
          created_at: string
          ease_of_use_rating: number | null
          experience_rating: string
          got_what_needed: string | null
          guidance_type: string | null
          had_issues: string
          id: string
          improvement_suggestions: string | null
          is_first_time: boolean
          issue_description: string | null
          liked_most: string | null
          likelihood_recommend: number
          likelihood_use_again: number | null
          resonance_rating: number
          response_speed: string | null
          session_id: string | null
          sun_sign: string | null
          tone_rating: number
          understanding_rating: number | null
          wrong_or_insensitive: string | null
        }
        Insert: {
          age_range?: string | null
          astrology_familiarity?: string | null
          can_contact?: boolean | null
          chat_purpose: string[]
          chat_purpose_other?: string | null
          clarity_rating?: number | null
          consent_given?: boolean
          contact_email?: string | null
          country?: string | null
          created_at?: string
          ease_of_use_rating?: number | null
          experience_rating: string
          got_what_needed?: string | null
          guidance_type?: string | null
          had_issues: string
          id?: string
          improvement_suggestions?: string | null
          is_first_time: boolean
          issue_description?: string | null
          liked_most?: string | null
          likelihood_recommend: number
          likelihood_use_again?: number | null
          resonance_rating: number
          response_speed?: string | null
          session_id?: string | null
          sun_sign?: string | null
          tone_rating: number
          understanding_rating?: number | null
          wrong_or_insensitive?: string | null
        }
        Update: {
          age_range?: string | null
          astrology_familiarity?: string | null
          can_contact?: boolean | null
          chat_purpose?: string[]
          chat_purpose_other?: string | null
          clarity_rating?: number | null
          consent_given?: boolean
          contact_email?: string | null
          country?: string | null
          created_at?: string
          ease_of_use_rating?: number | null
          experience_rating?: string
          got_what_needed?: string | null
          guidance_type?: string | null
          had_issues?: string
          id?: string
          improvement_suggestions?: string | null
          is_first_time?: boolean
          issue_description?: string | null
          liked_most?: string | null
          likelihood_recommend?: number
          likelihood_use_again?: number | null
          resonance_rating?: number
          response_speed?: string | null
          session_id?: string | null
          sun_sign?: string | null
          tone_rating?: number
          understanding_rating?: number | null
          wrong_or_insensitive?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          created_at: string
          entry_time: string
          exit_time: string | null
          id: string
          interactions_count: number | null
          page_url: string
          scroll_depth_percent: number | null
          session_id: string
          time_on_page_seconds: number | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          entry_time: string
          exit_time?: string | null
          id?: string
          interactions_count?: number | null
          page_url: string
          scroll_depth_percent?: number | null
          session_id: string
          time_on_page_seconds?: number | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          entry_time?: string
          exit_time?: string | null
          id?: string
          interactions_count?: number | null
          page_url?: string
          scroll_depth_percent?: number | null
          session_id?: string
          time_on_page_seconds?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_birth_details: {
        Row: {
          created_at: string
          date_of_birth: string
          id: string
          place_of_birth: string
          time_of_birth: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          id?: string
          place_of_birth: string
          time_of_birth: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          id?: string
          place_of_birth?: string
          time_of_birth?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          page_url: string
          session_id: string
          timestamp: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          page_url: string
          session_id: string
          timestamp?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          page_url?: string
          session_id?: string
          timestamp?: string
          visitor_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          page_url: string
          session_end: string | null
          session_id: string
          session_start: string
          total_duration_seconds: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          page_url: string
          session_end?: string | null
          session_id: string
          session_start: string
          total_duration_seconds?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          page_url?: string
          session_end?: string | null
          session_id?: string
          session_start?: string
          total_duration_seconds?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      utm_tracking: {
        Row: {
          created_at: string
          id: string
          page_url: string
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_url: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_url?: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
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
