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
      answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean
          player_id: string
          points_earned: number
          question_index: number
          session_id: string
          time_taken_ms: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean
          player_id: string
          points_earned?: number
          question_index: number
          session_id: string
          time_taken_ms?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          player_id?: string
          points_earned?: number
          question_index?: number
          session_id?: string
          time_taken_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quiz_questions: {
        Row: {
          acceptable_answers: Json | null
          blur_levels: Json | null
          category: string | null
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          options: Json | null
          question: string
          quiz_id: string
          sort_order: number
          spotify_embed_url: string | null
          time_limit_seconds: number
          type: string
        }
        Insert: {
          acceptable_answers?: Json | null
          blur_levels?: Json | null
          category?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          question: string
          quiz_id: string
          sort_order?: number
          spotify_embed_url?: string | null
          time_limit_seconds?: number
          type?: string
        }
        Update: {
          acceptable_answers?: Json | null
          blur_levels?: Json | null
          category?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          question?: string
          quiz_id?: string
          sort_order?: number
          spotify_embed_url?: string | null
          time_limit_seconds?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "custom_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          score: number
          session_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          score?: number
          session_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          created_at: string
          current_question: number
          id: string
          join_code: string
          question_started_at: string | null
          quiz_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_question?: number
          id?: string
          join_code: string
          question_started_at?: string | null
          quiz_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_question?: number
          id?: string
          join_code?: string
          question_started_at?: string | null
          quiz_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "custom_quizzes"
            referencedColumns: ["id"]
          },
        ]
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
