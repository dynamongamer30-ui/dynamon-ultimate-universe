alter table public.vextro_broadcast_jobs
  add column if not exists media jsonb,
  add column if not exists buttons jsonb not null default '[]'::jsonb,
  add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.bot_support_messages
  add column if not exists attachment jsonb;
