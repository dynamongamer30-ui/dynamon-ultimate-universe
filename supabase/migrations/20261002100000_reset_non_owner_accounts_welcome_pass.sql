-- Confirmed administrative reset:
--   * preserve the database-marked owner account, permissions, configuration,
--     owner-authored content, and owner profile;
--   * remove every non-owner auth account and associated user data;
--   * reset owner progression/reward state without changing owner permissions;
--   * grant exactly one immediately-active Phoenix Pass to each future new user.

ALTER TABLE public.phoenix_passes
  ADD COLUMN IF NOT EXISTS grant_kind text NOT NULL DEFAULT 'giveaway';

CREATE UNIQUE INDEX IF NOT EXISTS phoenix_passes_one_welcome_per_user
  ON public.phoenix_passes (user_id)
  WHERE grant_kind = 'welcome';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner_row boolean;
  display_name_value text;
BEGIN
  is_owner_row := (lower(coalesce(new.email, '')) = public.dg_owner_email());
  display_name_value := left(coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'trainer'
  ), 40);

  INSERT INTO public.profiles (id, display_name, avatar_url, is_owner)
  VALUES (new.id, display_name_value, new.raw_user_meta_data->>'avatar_url', is_owner_row)
  ON CONFLICT (id) DO UPDATE
    SET is_owner = public.profiles.is_owner OR excluded.is_owner;

  IF NOT is_owner_row THEN
    INSERT INTO public.phoenix_passes
      (user_id, expires_at, used, claimed, claimed_at, claim_deadline, grant_kind)
    SELECT new.id, now() + interval '30 days', false, true, now(), now(), 'welcome'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.phoenix_passes
      WHERE user_id = new.id AND grant_kind = 'welcome'
    );

    INSERT INTO public.notifications (title, body, target_user_id)
    SELECT
      'Welcome — your Phoenix Pass is ready',
      'You received one Phoenix Pass for joining Dynamon Gamer Space. Spend it once on any mod within 30 days.',
      new.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE target_user_id = new.id
        AND title = 'Welcome — your Phoenix Pass is ready'
    );
  END IF;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT p.id INTO owner_id
  FROM public.profiles p
  WHERE p.is_owner = true
  ORDER BY p.created_at
  LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Reset aborted: no database-marked owner account found';
  END IF;

  -- Clear transient operational/session data first so it cannot block cleanup.
  DELETE FROM public.access_key_logs;
  DELETE FROM public.gate_tokens;
  DELETE FROM public.generation_logs;
  DELETE FROM public.honeypot_log;
  DELETE FROM public.rate_limits;
  DELETE FROM public.secure_sessions;
  DELETE FROM public.suspicious_activity;
  DELETE FROM public.worker_init_rate;

  -- Remove user-linked rows explicitly before deleting auth.users. Owner rows
  -- are preserved in every content/profile/permission table.
  DELETE FROM public.reports WHERE reporter_id <> owner_id;
  DELETE FROM public.reports
   WHERE target_type = 'comment'
     AND target_id IN (SELECT id::text FROM public.comments WHERE user_id <> owner_id);
  DELETE FROM public.moderation_log WHERE actor_id <> owner_id;
  DELETE FROM public.broadcasts WHERE author_id <> owner_id;
  DELETE FROM public.access_keys WHERE created_by <> owner_id;
  DELETE FROM public.notifications WHERE target_user_id IS NOT NULL AND target_user_id <> owner_id;
  DELETE FROM public.notification_reads WHERE user_id <> owner_id;
  DELETE FROM public.notification_prefs WHERE user_id <> owner_id;
  DELETE FROM public.comment_likes WHERE user_id <> owner_id;
  DELETE FROM public.comment_reactions WHERE user_id <> owner_id;
  DELETE FROM public.mod_likes WHERE user_id <> owner_id;
  DELETE FROM public.mod_ratings WHERE user_id <> owner_id;
  DELETE FROM public.mod_subscribers WHERE user_id <> owner_id;
  DELETE FROM public.favorites WHERE user_id <> owner_id;
  DELETE FROM public.phoenix_pass_winners WHERE user_id <> owner_id;
  DELETE FROM public.phoenix_passes WHERE user_id <> owner_id;
  DELETE FROM public.user_achievements WHERE user_id <> owner_id;
  DELETE FROM public.user_engagement_events WHERE user_id <> owner_id;
  DELETE FROM public.user_preferences WHERE user_id <> owner_id;
  DELETE FROM public.user_roles WHERE user_id <> owner_id;
  DELETE FROM public.user_streaks WHERE user_id <> owner_id;
  DELETE FROM public.user_trainer_progress WHERE user_id <> owner_id;
  DELETE FROM public.user_unlocks WHERE user_id <> owner_id;
  DELETE FROM public.user_xp WHERE user_id <> owner_id;
  DELETE FROM public.vip_giveaway_winners WHERE user_id <> owner_id;

  -- Detach owner replies before non-owner comment cleanup so owner-authored
  -- content survives even when its original parent belonged to a deleted user.
  UPDATE public.comments
     SET parent_id = NULL
   WHERE user_id = owner_id
     AND parent_id IN (SELECT id FROM public.comments WHERE user_id <> owner_id);

  -- Comments cascade through remaining replies; preserve owner-authored comments.
  DELETE FROM public.comments WHERE user_id <> owner_id;

  -- Reset owner progression and rewards, but preserve owner profile, roles,
  -- permissions, settings, configuration, and owner-authored content.
  DELETE FROM public.user_achievements WHERE user_id = owner_id;
  DELETE FROM public.user_engagement_events WHERE user_id = owner_id;
  DELETE FROM public.user_streaks WHERE user_id = owner_id;
  DELETE FROM public.user_trainer_progress WHERE user_id = owner_id;
  DELETE FROM public.user_xp WHERE user_id = owner_id;
  DELETE FROM public.phoenix_pass_winners WHERE user_id = owner_id;
  DELETE FROM public.phoenix_passes WHERE user_id = owner_id;
  DELETE FROM public.user_unlocks WHERE user_id = owner_id;

  -- Finally remove all non-owner auth accounts. Profile/user-linked foreign
  -- keys cascade where configured; owner_id is never included in this set.
  DELETE FROM auth.users WHERE id <> owner_id;
END;
$$;
