-- Owner private Telegram chat is the primary archive destination for encrypted backups.
-- Supabase Storage remains a secondary restore copy when available.
alter table public.vextro_backup_artifacts
  alter column storage_path drop not null,
  add column if not exists storage_error text;
