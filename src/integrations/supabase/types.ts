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
      canvas_games: {
        Row: {
          addition_index: number
          addition_seconds: number
          addition_started_at: string | null
          created_at: string
          current_artist_id: string | null
          duration_seconds: number
          game_ends_at: string | null
          id: string
          last_artist_id: string | null
          last_points: number
          last_result: string | null
          masterpiece_index: number
          phase: string
          rescue_count: number
          revealed_answer: string | null
          round_artist_ids: string[]
          scene: Json
          session_id: string
          status: string
          team_score: number
          total_additions: number
          used_answers: string[]
          words_attempted: number
        }
        Insert: {
          addition_index?: number
          addition_seconds?: number
          addition_started_at?: string | null
          created_at?: string
          current_artist_id?: string | null
          duration_seconds?: number
          game_ends_at?: string | null
          id?: string
          last_artist_id?: string | null
          last_points?: number
          last_result?: string | null
          masterpiece_index?: number
          phase?: string
          rescue_count?: number
          revealed_answer?: string | null
          round_artist_ids?: string[]
          scene?: Json
          session_id: string
          status?: string
          team_score?: number
          total_additions?: number
          used_answers?: string[]
          words_attempted?: number
        }
        Update: {
          addition_index?: number
          addition_seconds?: number
          addition_started_at?: string | null
          created_at?: string
          current_artist_id?: string | null
          duration_seconds?: number
          game_ends_at?: string | null
          id?: string
          last_artist_id?: string | null
          last_points?: number
          last_result?: string | null
          masterpiece_index?: number
          phase?: string
          rescue_count?: number
          revealed_answer?: string | null
          round_artist_ids?: string[]
          scene?: Json
          session_id?: string
          status?: string
          team_score?: number
          total_additions?: number
          used_answers?: string[]
          words_attempted?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvas_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_guesses: {
        Row: {
          addition_index: number
          created_at: string
          game_id: string
          guess: string
          id: string
          is_correct: boolean
          masterpiece_index: number
          player_id: string
          points_earned: number
        }
        Insert: {
          addition_index: number
          created_at?: string
          game_id: string
          guess: string
          id?: string
          is_correct?: boolean
          masterpiece_index: number
          player_id: string
          points_earned?: number
        }
        Update: {
          addition_index?: number
          created_at?: string
          game_id?: string
          guess?: string
          id?: string
          is_correct?: boolean
          masterpiece_index?: number
          player_id?: string
          points_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvas_guesses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "canvas_games"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_masterpieces: {
        Row: {
          additions: number
          created_at: string
          game_id: string
          id: string
          image_data: string | null
          masterpiece_index: number
          points: number
          scene: Json
        }
        Insert: {
          additions?: number
          created_at?: string
          game_id: string
          id?: string
          image_data?: string | null
          masterpiece_index: number
          points?: number
          scene?: Json
        }
        Update: {
          additions?: number
          created_at?: string
          game_id?: string
          id?: string
          image_data?: string | null
          masterpiece_index?: number
          points?: number
          scene?: Json
        }
        Relationships: [
          {
            foreignKeyName: "canvas_masterpieces_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "canvas_games"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_secrets: {
        Row: {
          alternates: Json
          answer: string | null
          game_id: string
          host_token: string
          prompt: string | null
        }
        Insert: {
          alternates?: Json
          answer?: string | null
          game_id: string
          host_token: string
          prompt?: string | null
        }
        Update: {
          alternates?: Json
          answer?: string | null
          game_id?: string
          host_token?: string
          prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_secrets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "canvas_games"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_strokes: {
        Row: {
          addition_index: number
          artist_id: string
          color: string
          created_at: string
          game_id: string
          id: string
          masterpiece_index: number
          points: Json
          width: number
        }
        Insert: {
          addition_index: number
          artist_id: string
          color: string
          created_at?: string
          game_id: string
          id?: string
          masterpiece_index: number
          points: Json
          width?: number
        }
        Update: {
          addition_index?: number
          artist_id?: string
          color?: string
          created_at?: string
          game_id?: string
          id?: string
          masterpiece_index?: number
          points?: Json
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvas_strokes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "canvas_games"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quiz_questions: {
        Row: {
          acceptable_answers: Json | null
          artist_name: string | null
          audio_preview_url: string | null
          blur_levels: Json | null
          category: string | null
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          highbrow_input_type: string | null
          id: string
          image_url: string | null
          lowbrow_input_type: string | null
          lowbrow_options: Json | null
          lowbrow_question: string | null
          options: Json | null
          question: string
          quiz_id: string
          sort_order: number
          spotify_embed_url: string | null
          time_limit_seconds: number
          track_name: string | null
          type: string
        }
        Insert: {
          acceptable_answers?: Json | null
          artist_name?: string | null
          audio_preview_url?: string | null
          blur_levels?: Json | null
          category?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          highbrow_input_type?: string | null
          id?: string
          image_url?: string | null
          lowbrow_input_type?: string | null
          lowbrow_options?: Json | null
          lowbrow_question?: string | null
          options?: Json | null
          question: string
          quiz_id: string
          sort_order?: number
          spotify_embed_url?: string | null
          time_limit_seconds?: number
          track_name?: string | null
          type?: string
        }
        Update: {
          acceptable_answers?: Json | null
          artist_name?: string | null
          audio_preview_url?: string | null
          blur_levels?: Json | null
          category?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          highbrow_input_type?: string | null
          id?: string
          image_url?: string | null
          lowbrow_input_type?: string | null
          lowbrow_options?: Json | null
          lowbrow_question?: string | null
          options?: Json | null
          question?: string
          quiz_id?: string
          sort_order?: number
          spotify_embed_url?: string | null
          time_limit_seconds?: number
          track_name?: string | null
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
          canvas_score: number
          color: string
          created_at: string
          draw_count: number
          id: string
          name: string
          score: number
          session_id: string
        }
        Insert: {
          canvas_score?: number
          color?: string
          created_at?: string
          draw_count?: number
          id?: string
          name: string
          score?: number
          session_id: string
        }
        Update: {
          canvas_score?: number
          color?: string
          created_at?: string
          draw_count?: number
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
          game_mode: string
          id: string
          join_code: string
          question_started_at: string | null
          quiz_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_question?: number
          game_mode?: string
          id?: string
          join_code: string
          question_started_at?: string | null
          quiz_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_question?: number
          game_mode?: string
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
      get_canvas_prompt_for_artist: {
        Args: { _game_id: string; _player_id: string }
        Returns: {
          answer: string
          prompt: string
        }[]
      }
      get_canvas_prompt_for_host: {
        Args: { _game_id: string; _host_token: string }
        Returns: {
          alternates: Json
          answer: string
          prompt: string
        }[]
      }
      set_canvas_prompt: {
        Args: {
          _alternates: Json
          _answer: string
          _game_id: string
          _host_token: string
          _prompt: string
        }
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
    Enums: {},
  },
} as const
