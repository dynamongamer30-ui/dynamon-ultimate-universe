-- Ratings are votes, not comments. Keep them in their own table so a star
-- submission never creates a visible comment record.
CREATE TABLE IF NOT EXISTS public.mod_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mod_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mod_ratings_one_user_per_mod UNIQUE (user_id, mod_slug)
);

CREATE INDEX IF NOT EXISTS mod_ratings_mod_idx
  ON public.mod_ratings (mod_slug, created_at DESC);

GRANT SELECT ON public.mod_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mod_ratings TO authenticated;
GRANT ALL ON public.mod_ratings TO service_role;

ALTER TABLE public.mod_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mod_ratings_public_read" ON public.mod_ratings;
DROP POLICY IF EXISTS "mod_ratings_insert_own" ON public.mod_ratings;
DROP POLICY IF EXISTS "mod_ratings_update_own" ON public.mod_ratings;
DROP POLICY IF EXISTS "mod_ratings_delete_own" ON public.mod_ratings;
CREATE POLICY "mod_ratings_public_read" ON public.mod_ratings FOR SELECT USING (true);
CREATE POLICY "mod_ratings_insert_own" ON public.mod_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mod_ratings_update_own" ON public.mod_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mod_ratings_delete_own" ON public.mod_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Preserve existing votes, choosing the newest vote if legacy duplicate rows
-- exist. Written text remains a comment but is no longer a rating row.
INSERT INTO public.mod_ratings (mod_slug, user_id, rating, created_at, updated_at)
SELECT DISTINCT ON (user_id, mod_slug)
  mod_slug, user_id, rating, created_at, created_at
FROM public.comments
WHERE rating IS NOT NULL
ORDER BY user_id, mod_slug, created_at DESC, id DESC
ON CONFLICT (user_id, mod_slug) DO UPDATE
SET rating = EXCLUDED.rating, updated_at = EXCLUDED.updated_at;

UPDATE public.comments
SET rating = NULL
WHERE rating IS NOT NULL;

-- Empty legacy rating-only rows must not remain in the comments feed.
DELETE FROM public.comments
WHERE btrim(body) = '';

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_or_rating;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_length;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_body_length CHECK (char_length(body) BETWEEN 1 AND 2000);
DROP INDEX IF EXISTS public.comments_one_rating_per_user_mod;
