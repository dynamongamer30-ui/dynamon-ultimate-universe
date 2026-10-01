-- Phase 4: ratings and comments are independent contributions.
-- Rating rows may carry an empty body; comment and reply rows still require text.
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_length;

DO $$
BEGIN
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_body_or_rating CHECK (
      (rating IS NOT NULL AND parent_id IS NULL)
      OR char_length(body) BETWEEN 1 AND 2000
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A trainer can revise one rating per mod; a comment is a separate row and
-- never participates in the rating aggregate because its rating is NULL.
DROP INDEX IF EXISTS public.comments_one_rating_per_user_mod;
CREATE UNIQUE INDEX comments_one_rating_per_user_mod
  ON public.comments (user_id, mod_slug)
  WHERE rating IS NOT NULL AND parent_id IS NULL;
