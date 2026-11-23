alter table public.bot_users add column if not exists last_seen_at timestamptz;
update public.bot_users set last_seen_at = updated_at where last_seen_at is null;
create index if not exists bot_users_last_seen_at_idx on public.bot_users(last_seen_at desc);
