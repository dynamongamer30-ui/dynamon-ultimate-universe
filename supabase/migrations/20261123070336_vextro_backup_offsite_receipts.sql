alter table public.vextro_backup_artifacts
  add column if not exists offsite_url text,
  add column if not exists offsite_verified_at timestamptz,
  add column if not exists offsite_error text;
