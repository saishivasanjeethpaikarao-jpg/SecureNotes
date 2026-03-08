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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          created_at: string
          details: Json | null
          game_type: string
          id: string
          partner: string
          played_by: string
          question_text: string | null
          result: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          game_type: string
          id?: string
          partner: string
          played_by: string
          question_text?: string | null
          result?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          game_type?: string
          id?: string
          partner?: string
          played_by?: string
          question_text?: string | null
          result?: string | null
        }
        Relationships: []
      }
      listen_together: {
        Row: {
          ammu_feeling: string | null
          created_at: string
          id: string
          nani_feeling: string | null
          saved_to_memory: boolean
          song_title: string
          started_by: string
          youtube_url: string
        }
        Insert: {
          ammu_feeling?: string | null
          created_at?: string
          id?: string
          nani_feeling?: string | null
          saved_to_memory?: boolean
          song_title: string
          started_by: string
          youtube_url: string
        }
        Update: {
          ammu_feeling?: string | null
          created_at?: string
          id?: string
          nani_feeling?: string | null
          saved_to_memory?: boolean
          song_title?: string
          started_by?: string
          youtube_url?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          created_at: string
          created_at_date: string
          created_by: string
          description: string | null
          icon: string
          id: string
          image_url: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_at_date?: string
          created_by: string
          description?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_at_date?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_url: string | null
          read_at: string | null
          receiver: string
          sender: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          receiver: string
          sender: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          receiver?: string
          sender?: string
          type?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          gift_given: boolean
          id: string
          milestone_value: number
          reached_at: string
          username: string
        }
        Insert: {
          gift_given?: boolean
          id?: string
          milestone_value: number
          reached_at?: string
          username: string
        }
        Update: {
          gift_given?: boolean
          id?: string
          milestone_value?: number
          reached_at?: string
          username?: string
        }
        Relationships: []
      }
      stars: {
        Row: {
          created_at: string
          giver: string
          id: string
          message: string | null
          reason: string
          receiver: string
          value: number
        }
        Insert: {
          created_at?: string
          giver: string
          id?: string
          message?: string | null
          reason: string
          receiver: string
          value: number
        }
        Update: {
          created_at?: string
          giver?: string
          id?: string
          message?: string | null
          reason?: string
          receiver?: string
          value?: number
        }
        Relationships: []
      }
      together_chat: {
        Row: {
          content: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: []
      }
      together_playlist: {
        Row: {
          added_by: string
          created_at: string
          id: string
          media_type: string
          played: boolean
          title: string
          youtube_url: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          media_type?: string
          played?: boolean
          title: string
          youtube_url: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          media_type?: string
          played?: boolean
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      together_room_state: {
        Row: {
          current_time_seconds: number
          current_title: string | null
          current_youtube_url: string | null
          id: string
          is_playing: boolean
          media_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_time_seconds?: number
          current_title?: string | null
          current_youtube_url?: string | null
          id?: string
          is_playing?: boolean
          media_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_time_seconds?: number
          current_title?: string | null
          current_youtube_url?: string | null
          id?: string
          is_playing?: boolean
          media_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      totals: {
        Row: {
          ammu_total: number
          id: string
          nani_total: number
        }
        Insert: {
          ammu_total?: number
          id?: string
          nani_total?: number
        }
        Update: {
          ammu_total?: number
          id?: string
          nani_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_user_login: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
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
