ALTER TABLE public.mod_overrides
  ADD COLUMN IF NOT EXISTS rating_count integer,
  ADD COLUMN IF NOT EXISTS downloads_absolute integer,
  ADD COLUMN IF NOT EXISTS likes_absolute integer;