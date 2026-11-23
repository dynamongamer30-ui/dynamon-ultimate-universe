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
      access_tokens: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
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
      activated_users: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatar_pool: {
        Row: {
          active: boolean
          created_at: string
          gender: string
          id: string
          label: string | null
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          gender: string
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          gender?: string
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      banned_devices: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_account_links: {
        Row: {
          id: string
          linked_at: string
          telegram_id: number
          unlink_eligible_at: string
          unlinked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          telegram_id: number
          unlink_eligible_at?: string
          unlinked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          telegram_id?: number
          unlink_eligible_at?: string
          unlinked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_guides: {
        Row: {
          data: Json
          deleted: boolean
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          data?: Json
          deleted?: boolean
          id: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          data?: Json
          deleted?: boolean
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_link_requests: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          telegram_id: number
          token_hash: string
          user_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          telegram_id: number
          token_hash: string
          user_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          telegram_id?: number
          token_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bot_support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          internal_note: boolean
          sender_telegram_id: number | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_telegram_id?: number | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          internal_note?: boolean
          sender_telegram_id?: number | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "bot_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          created_at: string
          language: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          language?: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          language?: string
          telegram_id?: number
          updated_at?: string
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
      device_presence: {
        Row: {
          data: Json
          id: string
        }
        Insert: {
          data: Json
          id: string
        }
        Update: {
          data?: Json
          id?: string
        }
        Relationships: []
      }
      device_xp_once: {
        Row: {
          created_at: string
          data: Json | null
          id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
        }
        Relationships: []
      }
      dgbot_alerts: {
        Row: {
          alert_key: string
          count: number
          last_sent_at: string
        }
        Insert: {
          alert_key: string
          count?: number
          last_sent_at: string
        }
        Update: {
          alert_key?: string
          count?: number
          last_sent_at?: string
        }
        Relationships: []
      }
      dgbot_allowlist: {
        Row: {
          account: string | null
          created_at: string
          deleted_at: string | null
          host: string
          id: number
          include_subdomains: boolean
        }
        Insert: {
          account?: string | null
          created_at?: string
          deleted_at?: string | null
          host: string
          id?: never
          include_subdomains?: boolean
        }
        Update: {
          account?: string | null
          created_at?: string
          deleted_at?: string | null
          host?: string
          id?: never
          include_subdomains?: boolean
        }
        Relationships: []
      }
      dgbot_audit_log: {
        Row: {
          action: string
          actor_id: number
          created_at: string
          id: number
          reason: string
          target_id: number | null
        }
        Insert: {
          action: string
          actor_id: number
          created_at?: string
          id?: never
          reason: string
          target_id?: number | null
        }
        Update: {
          action?: string
          actor_id?: number
          created_at?: string
          id?: never
          reason?: string
          target_id?: number | null
        }
        Relationships: []
      }
      dgbot_backup_runs: {
        Row: {
          bytes: number | null
          created_at: string
          error_code: string | null
          finished_at: string | null
          id: number
          parts: number | null
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: never
          parts?: number | null
          started_at: string
          status: string
          trigger: string
        }
        Update: {
          bytes?: number | null
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: never
          parts?: number | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      dgbot_bans: {
        Row: {
          created_at: string
          deleted_at: string | null
          reason: string
          telegram_id: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          reason?: string
          telegram_id: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          reason?: string
          telegram_id?: number
        }
        Relationships: []
      }
      dgbot_group_help_handoffs: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          group_chat_id: number
          guide_id: string
          nonce: string
          prompt_message_id: number | null
          source_message_id: number
          user_id: number
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          group_chat_id: number
          guide_id: string
          nonce: string
          prompt_message_id?: number | null
          source_message_id: number
          user_id: number
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          group_chat_id?: number
          guide_id?: string
          nonce?: string
          prompt_message_id?: number | null
          source_message_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dgbot_group_help_handoffs_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "dgbot_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      dgbot_guide_keywords: {
        Row: {
          confidence: number
          created_at: string
          deleted_at: string | null
          guide_id: string
          id: number
          language: string
          source: string
          term: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          guide_id: string
          id?: never
          language: string
          source?: string
          term: string
        }
        Update: {
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          guide_id?: string
          id?: never
          language?: string
          source?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "dgbot_guide_keywords_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "dgbot_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      dgbot_guides: {
        Row: {
          buttons: Json
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          keywords: Json
          link: string
          media: Json | null
          published: boolean
          steps: Json
          title: Json
          updated_at: string
        }
        Insert: {
          buttons?: Json
          category: string
          created_at?: string
          deleted_at?: string | null
          id: string
          keywords?: Json
          link: string
          media?: Json | null
          published?: boolean
          steps?: Json
          title?: Json
          updated_at?: string
        }
        Update: {
          buttons?: Json
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          keywords?: Json
          link?: string
          media?: Json | null
          published?: boolean
          steps?: Json
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dgbot_moderation_rules: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          kind: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: never
          kind: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: never
          kind?: string
          value?: string
        }
        Relationships: []
      }
      dgbot_pending_claims: {
        Row: {
          created_at: string
          expires_at: string
          nonce: string
          telegram_id: number
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          nonce: string
          telegram_id: number
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          nonce?: string
          telegram_id?: number
          token_hash?: string
        }
        Relationships: []
      }
      dgbot_posts: {
        Row: {
          body: string
          buttons: Json
          channel_message_id: number | null
          created_at: string
          deleted_at: string | null
          id: string
          media: Json | null
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          buttons?: Json
          channel_message_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media?: Json | null
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          buttons?: Json
          channel_message_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media?: Json | null
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dgbot_review_queue: {
        Row: {
          candidate_guide_id: string | null
          confidence: number
          created_at: string
          deleted_at: string | null
          id: number
          phrase: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          candidate_guide_id?: string | null
          confidence: number
          created_at?: string
          deleted_at?: string | null
          id?: never
          phrase: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          candidate_guide_id?: string | null
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          id?: never
          phrase?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      dgbot_user_state: {
        Row: {
          expires_at: string
          state: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          expires_at: string
          state: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          expires_at?: string
          state?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
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
      gate_tokens: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generation_logs: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      honeypot_log: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
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
          follow_enc: string | null
          hidden: boolean
          likes_absolute: number | null
          likes_boost: number
          mega_enc: string | null
          name: string | null
          rating: number | null
          rating_count: number | null
          real_downloads: number
          seed_rating_count: number | null
          seed_rating_points: number | null
          seed_review_likes: number | null
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
          follow_enc?: string | null
          hidden?: boolean
          likes_absolute?: number | null
          likes_boost?: number
          mega_enc?: string | null
          name?: string | null
          rating?: number | null
          rating_count?: number | null
          real_downloads?: number
          seed_rating_count?: number | null
          seed_rating_points?: number | null
          seed_review_likes?: number | null
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
          follow_enc?: string | null
          hidden?: boolean
          likes_absolute?: number | null
          likes_boost?: number
          mega_enc?: string | null
          name?: string | null
          rating?: number | null
          rating_count?: number | null
          real_downloads?: number
          seed_rating_count?: number | null
          seed_rating_points?: number | null
          seed_review_likes?: number | null
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
      mod_ratings: {
        Row: {
          created_at: string
          id: string
          mod_slug: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mod_slug: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mod_slug?: string
          rating?: number
          updated_at?: string
          user_id?: string
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
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          burn_after_read: boolean
          created_at: string
          id: string
          reward_kind: string | null
          reward_ref: string | null
          source_kind: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          body: string
          burn_after_read?: boolean
          created_at?: string
          id?: string
          reward_kind?: string | null
          reward_ref?: string | null
          source_kind?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          burn_after_read?: boolean
          created_at?: string
          id?: string
          reward_kind?: string | null
          reward_ref?: string | null
          source_kind?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      phoenix_pass_winners: {
        Row: {
          awarded_at: string
          id: string
          pass_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          pass_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          pass_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phoenix_pass_winners_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "phoenix_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      phoenix_passes: {
        Row: {
          claim_deadline: string | null
          claimed: boolean
          claimed_at: string | null
          created_at: string
          expires_at: string
          grant_kind: string
          id: string
          revoked_at: string | null
          used: boolean
          used_at: string | null
          used_slug: string | null
          user_id: string
        }
        Insert: {
          claim_deadline?: string | null
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          expires_at: string
          grant_kind?: string
          id?: string
          revoked_at?: string | null
          used?: boolean
          used_at?: string | null
          used_slug?: string | null
          user_id: string
        }
        Update: {
          claim_deadline?: string | null
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          grant_kind?: string
          id?: string
          revoked_at?: string | null
          used?: boolean
          used_at?: string | null
          used_slug?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_avatar_url: string | null
          display_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_owner: boolean
          last_active: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_avatar_url?: string | null
          display_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_owner?: boolean
          last_active?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_avatar_url?: string | null
          display_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_owner?: boolean
          last_active?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
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
      secure_sessions: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
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
      suspicious_activity: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainer_levels: {
        Row: {
          days_required: number
          level: number
          reward_kind: string
          reward_qty: number
        }
        Insert: {
          days_required: number
          level: number
          reward_kind: string
          reward_qty?: number
        }
        Update: {
          days_required?: number
          level?: number
          reward_kind?: string
          reward_qty?: number
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
      user_engagement_events: {
        Row: {
          created_at: string
          event_key: string
          target_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          target_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          target_key?: string
          user_id?: string
        }
        Relationships: []
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
      user_trainer_progress: {
        Row: {
          current_level: number
          level_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_level?: number
          level_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_level?: number
          level_started_at?: string
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
      valid_keys: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vip_giveaway_winners: {
        Row: {
          awarded_at: string
          claimed: boolean
          claimed_at: string | null
          id: string
          key: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          claimed?: boolean
          claimed_at?: string | null
          id?: string
          key: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          claimed?: boolean
          claimed_at?: string | null
          id?: string
          key?: string
          user_id?: string
        }
        Relationships: []
      }
      website_pass_grants: {
        Row: {
          created_at: string
          owner_id: string | null
          pass_id: string | null
          request_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          owner_id?: string | null
          pass_id?: string | null
          request_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          owner_id?: string | null
          pass_id?: string | null
          request_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_pass_grants_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "phoenix_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      website_reward_keys: {
        Row: {
          awarded_at: string
          key_code: string
          source: string
          user_id: string
        }
        Insert: {
          awarded_at: string
          key_code: string
          source: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          key_code?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      website_saved_searches: {
        Row: {
          id: string
          name: string
          preset: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          preset: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          preset?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_init_rate: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          custom_avatar_url: string | null
          display_name: string | null
          id: string | null
          is_owner: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          custom_avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          custom_avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_account_stats: {
        Args: never
        Returns: {
          inactive_30d: number
          total_users: number
        }[]
      }
      admin_grant_phoenix_pass: { Args: { p_email: string }; Returns: Json }
      approve_bot_link: { Args: { p_token: string }; Returns: Json }
      award_xp: {
        Args: { _amount: number }
        Returns: {
          level: number
          leveled_up: boolean
          xp: number
        }[]
      }
      award_xp_internal: {
        Args: { _amount: number; _uid: string }
        Returns: {
          level: number
          leveled_up: boolean
          xp: number
        }[]
      }
      claim_daily_key: { Args: { p_id: string }; Returns: Json }
      claim_phoenix_pass: { Args: { p_id: string }; Returns: Json }
      claim_trainer_level: { Args: never; Returns: Json }
      cleanup_stale_device_records: { Args: never; Returns: number }
      cleanup_valid_keys: { Args: never; Returns: undefined }
      create_secure_session: {
        Args: { p_fingerprint: string; p_slug: string }
        Returns: Json
      }
      delete_inactive_accounts: { Args: never; Returns: undefined }
      dg_is_owner: { Args: never; Returns: boolean }
      dg_owner_email: { Args: never; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          custom_avatar_url: string
          display_name: string
          gender: string
          id: string
          is_owner: boolean
          username: string
        }[]
      }
      get_public_mod_stats: {
        Args: { p_slugs: string[] }
        Returns: {
          like_count: number
          mod_slug: string
          rating_count: number
          rating_sum: number
        }[]
      }
      get_review_page: {
        Args: { p_page?: number; p_slug: string }
        Returns: Json
      }
      get_review_reaction_counts: {
        Args: { p_comment_ids: string[] }
        Returns: {
          comment_id: string
          mine: boolean
          reaction: string
          total: number
        }[]
      }
      get_review_replies: {
        Args: { p_after_id?: string; p_after_time?: string; p_parent: string }
        Returns: Json
      }
      grant_achievement: { Args: { _key: string }; Returns: boolean }
      grant_achievement_internal: {
        Args: { _key: string; _uid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dark_eclipse_passless_active: { Args: never; Returns: boolean }
      is_owner_user: { Args: { _uid: string }; Returns: boolean }
      my_active_phoenix_pass: {
        Args: never
        Returns: {
          expires_at: string
          id: string
        }[]
      }
      my_daily_key: {
        Args: never
        Returns: {
          awarded_at: string
          claimed: boolean
          expires_at: string
          id: string
          key: string
        }[]
      }
      my_trainer_progress: {
        Args: never
        Returns: {
          claimable: boolean
          current_level: number
          days_elapsed: number
          days_required: number
          next_level: number
          reward_kind: string
          reward_qty: number
        }[]
      }
      my_unclaimed_phoenix_pass: {
        Args: never
        Returns: {
          claim_deadline: string
          id: string
        }[]
      }
      record_engagement: {
        Args: { _event_key: string; _target_key: string }
        Returns: {
          awarded: boolean
          level: number
          leveled_up: boolean
          xp: number
        }[]
      }
      redeem_access_key: {
        Args: { _code: string; _device_id: string }
        Returns: {
          expires_at: string
          message: string
          status: string
        }[]
      }
      redeem_phoenix_pass: {
        Args: { p_pass_id: string; p_slug: string }
        Returns: Json
      }
      redeem_secure_session: {
        Args: { p_fingerprint: string; p_token: string; p_version?: string }
        Returns: Json
      }
      run_phoenix_pass_giveaway: { Args: never; Returns: undefined }
      run_vip_daily_giveaway: { Args: never; Returns: undefined }
      rv2_admin_key_action: {
        Args: {
          p_action: string
          p_actor: string
          p_expected: Json
          p_hours: number
          p_key: string
          p_key_hmac: string
          p_request_id: string
        }
        Returns: {
          key_id: string
          license_id: string
        }[]
      }
      rv2_check_lease: {
        Args: { p_license_id: string; p_thumbprint: string }
        Returns: {
          lease_version: number
          license_expiry: string
        }[]
      }
      rv2_claim_device: {
        Args: {
          p_key_hmac: string
          p_public_key_spki: string
          p_thumbprint: string
        }
        Returns: {
          lease_version: number
          license_expiry: string
          license_id: string
        }[]
      }
      rv2_claim_existing_key: {
        Args: {
          p_key: string
          p_key_hmac: string
          p_public_key_spki: string
          p_thumbprint: string
        }
        Returns: {
          lease_version: number
          license_expiry: string
          license_id: string
        }[]
      }
      rv2_issue_key: {
        Args: {
          p_duration_seconds: number
          p_expiry_epoch: number
          p_key_hmac: string
        }
        Returns: {
          license_id: string
          newly_created: boolean
        }[]
      }
      touch_last_active: { Args: never; Returns: undefined }
      touch_streak: {
        Args: never
        Returns: {
          current_streak: number
          incremented: boolean
          longest_streak: number
        }[]
      }
      upsert_daily_giveaway_broadcast: { Args: never; Returns: undefined }
      username_available: { Args: { _username: string }; Returns: boolean }
      website_acknowledge_notification: {
        Args: { p_ids: string[] }
        Returns: Json
      }
      website_cleanup_notifications: { Args: never; Returns: number }
      website_find_account: { Args: { p_email: string }; Returns: Json }
      website_grant_pass: {
        Args: { p_email: string; p_request_id: string }
        Returns: Json
      }
      website_is_demo_owner: {
        Args: { p_telegram?: number; p_user: string }
        Returns: boolean
      }
      website_key_expiry: { Args: { p_data: Json }; Returns: string }
      website_owner_automation: { Args: never; Returns: Json }
      website_reward_history: {
        Args: { p_before?: string; p_before_id?: string; p_limit?: number }
        Returns: Json
      }
      website_saved_searches: {
        Args: {
          p_action?: string
          p_id?: string
          p_name?: string
          p_preset?: Json
        }
        Returns: Json
      }
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
      app_role: ["owner", "moderator", "user"],
      gender: ["male", "female", "other"],
    },
  },
} as const
