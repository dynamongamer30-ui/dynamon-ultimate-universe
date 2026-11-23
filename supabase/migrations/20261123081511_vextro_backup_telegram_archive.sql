-- Record the encrypted backup copy delivered to the Owner's private Telegram chat.
-- Supabase Storage remains the secondary recovery copy and 30-day managed retention store.
alter table public.vextro_backup_artifacts
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_message_id bigint,
  add column if not exists telegram_file_id text,
  add column if not exists telegram_file_unique_id text,
  add column if not exists telegram_verified_at timestamptz,
  add column if not exists telegram_error text;

comment on column public.vextro_backup_artifacts.telegram_file_id
  is 'Telegram Bot API file_id for the encrypted backup sent to the Owner private chat';
comment on column public.vextro_backup_artifacts.telegram_message_id
  is 'Telegram message ID of the encrypted backup archive in the Owner private chat';
