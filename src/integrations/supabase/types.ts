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
      access_key_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          key_code: string | null
          meta: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          key_code?: string | null
          meta?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          key_code?: string | null
          meta?: Json | null
        }
        Relationships: []
      }
      access_keys: {
        Row: {
          activated_at: string | null
          code: string
          created_at: string
          created_by: string | null
          device_id: string | null
          duration_seconds: number
          expires_at: string | null
          id: string
          notes: string | null
          prefix: string
          revoked: boolean
          updated_at: string
          uses: number
        }
        Insert: {
          activated_at?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          duration_seconds?: number
          expires_at?: string | null
          id?: string
          notes?: string | null
          prefix?: string
          revoked?: boolean
          updated_at?: string
          uses?: number
        }
        Update: {
          activated_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          duration_seconds?: number
          expires_at?: string | null
          id?: string
          notes?: string | null
          prefix?: string
          revoked?: boolean
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          key: string
          name: string
          tier: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          key: string
          name: string
          tier?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          key?: string
          name?: string
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          mod_slug: string
          recipient_count: number
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          mod_slug: string
          recipient_count?: number
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          mod_slug?: string
          recipient_count?: number
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          reaction: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          mod_slug: string
          parent_id: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          mod_slug: string
          parent_id?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mod_slug?: string
          parent_id?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          mod_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mod_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          mod_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      mod_likes: {
        Row: {
          created_at: string
          mod_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mod_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          mod_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      mod_overrides: {
        Row: {
          changelog: Json | null
          description: string | null
          download_url: string | null
          downloads_absolute: number | null
          downloads_boost: number
          featured: boolean
          features: Json | null
          hidden: boolean
          likes_absolute: number | null
          likes_boost: number
          name: string | null
          rating: number | null
          rating_count: number | null
          size: string | null
          slug: string
          tagline: string | null
          updated_at: string
          updated_date: string | null
          version: string | null
          youtube_id: string | null
        }
        Insert: {
          changelog?: Json | null
          description?: string | null
          download_url?: string | null
          downloads_absolute?: number | null
          downloads_boost?: number
          featured?: boolean
          features?: Json | null
          hidden?: boolean
          likes_absolute?: number | null
          likes_boost?: number
          name?: string | null
          rating?: number | null
          rating_count?: number | null
          size?: string | null
          slug: string
          tagline?: string | null
          updated_at?: string
          updated_date?: string | null
          version?: string | null
          youtube_id?: string | null
        }
        Update: {
          changelog?: Json | null
          description?: string | null
          download_url?: string | null
          downloads_absolute?: number | null
          downloads_boost?: number
          featured?: boolean
          features?: Json | null
          hidden?: boolean
          likes_absolute?: number | null
          likes_boost?: number
          name?: string | null
          rating?: number | null
          rating_count?: number | null
          size?: string | null
          slug?: string
          tagline?: string | null
          updated_at?: string
          updated_date?: string | null
          version?: string | null
          youtube_id?: string | null
        }
        Relationships: []
      }
      mod_subscribers: {
        Row: {
          email: string
          subscribed_at: string
          user_id: string
        }
        Insert: {
          email: string
          subscribed_at?: string
          user_id: string
        }
        Update: {
          email?: string
          subscribed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          asked_at: string | null
          created_at: string
          email_opt_in: boolean
          push_opt_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          asked_at?: string | null
          created_at?: string
          email_opt_in?: boolean
          push_opt_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          asked_at?: string | null
          created_at?: string
          email_opt_in?: boolean
          push_opt_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_owner: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_owner?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_owner?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      site_settings: {
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
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["key"]
          },
        ]
      }
      user_preferences: {
        Row: {
          favorite_elements: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          favorite_elements?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          favorite_elements?: string[]
          updated_at?: string
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
      user_streaks: {
        Row: {
          current_streak: number
          last_login_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_login_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_login_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_unlocks: {
        Row: {
          device_id: string | null
          key_id: string | null
          unlocked_until: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id?: string | null
          key_id?: string | null
          unlocked_until: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string | null
          key_id?: string | null
          unlocked_until?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocks_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          level: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          level?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          level?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_owner: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp: {
        Args: { _amount: number }
        Returns: {
          level: number
          leveled_up: boolean
          xp: number
        }[]
      }
      generate_access_keys: {
        Args: {
          _duration_seconds: number
          _notes: string
          _prefix: string
          _qty: number
        }
        Returns: {
          activated_at: string | null
          code: string
          created_at: string
          created_by: string | null
          device_id: string | null
          duration_seconds: number
          expires_at: string | null
          id: string
          notes: string | null
          prefix: string
          revoked: boolean
          updated_at: string
          uses: number
        }[]
        SetofOptions: {
          from: "*"
          to: "access_keys"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          gender: string
          id: string
          is_owner: boolean
          username: string
        }[]
      }
      grant_achievement: { Args: { _key: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_user: { Args: { _user_id: string }; Returns: boolean }
      redeem_access_key: {
        Args: { _code: string; _device_id: string }
        Returns: {
          expires_at: string
          message: string
          status: string
        }[]
      }
      touch_streak: {
        Args: never
        Returns: {
          current_streak: number
          incremented: boolean
          longest_streak: number
        }[]
      }
      username_available: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "moderator" | "user"
      gender: "male" | "female" | "other"
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
      app_role: ["owner", "moderator", "user"],
      gender: ["male", "female", "other"],
    },
  },
} as const
