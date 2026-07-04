
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings owner write" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_owner_user(auth.uid())) WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TABLE public.mod_overrides (
  slug TEXT PRIMARY KEY,
  hidden BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  tagline TEXT,
  description TEXT,
  version TEXT,
  size TEXT,
  updated_date TEXT,
  youtube_id TEXT,
  features JSONB,
  changelog JSONB,
  downloads_boost INTEGER NOT NULL DEFAULT 0,
  likes_boost INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC,
  download_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mod_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mod_overrides TO authenticated;
GRANT ALL ON public.mod_overrides TO service_role;
ALTER TABLE public.mod_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod_overrides public read" ON public.mod_overrides FOR SELECT USING (true);
CREATE POLICY "mod_overrides owner write" ON public.mod_overrides FOR ALL TO authenticated
  USING (public.is_owner_user(auth.uid())) WITH CHECK (public.is_owner_user(auth.uid()));

CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mod_overrides_updated BEFORE UPDATE ON public.mod_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
