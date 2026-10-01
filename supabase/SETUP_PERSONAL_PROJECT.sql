-- =====================================================================
-- Dynamon Universe — FULL backend setup for YOUR personal Supabase project
-- Run this ONCE in: Personal Project -> SQL Editor -> New query -> Run
-- Safe to re-run (idempotent).
-- =====================================================================

-- ------------------------- 1. AUTH FOUNDATION -------------------------
create or replace function public.dg_owner_email()
returns text language sql immutable set search_path = public as $$ select 'yugvadecha30@gmail.com'::text $$;

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  gender       text check (gender in ('male','female','other')),
  avatar_url   text,
  is_owner     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_owner_user(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from public.profiles where id = _uid), false);
$$;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_owner_row boolean;
begin
  is_owner_row := (lower(coalesce(new.email, '')) = public.dg_owner_email());
  insert into public.profiles (id, display_name, avatar_url, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    is_owner_row
  )
  on conflict (id) do update set is_owner = public.profiles.is_owner or is_owner_row;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.dg_mark_owner_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from auth.users u where u.id = new.id and lower(u.email) = public.dg_owner_email()) then
    new.is_owner := true;
  end if;
  return new;
end;
$$;

drop trigger if exists dg_mark_owner_on_profile on public.profiles;
create trigger dg_mark_owner_on_profile before insert or update on public.profiles
  for each row execute function public.dg_mark_owner_profile();

update public.profiles p set is_owner = true from auth.users u
 where u.id = p.id and lower(u.email) = public.dg_owner_email();

create or replace function public.get_my_profile()
returns table (id uuid, username text, display_name text, gender text, avatar_url text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select id, username, display_name, gender, avatar_url, is_owner from public.profiles where id = auth.uid();
$$;

create or replace function public.username_available(_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(_username));
$$;

-- ------------------------- 2. DG KEY-SYSTEM TABLES -------------------------
create or replace function public.dg_is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_owner from public.profiles p where p.id = auth.uid()), false);
$$;

create table if not exists public.valid_keys        (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.app_config        (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.access_tokens     (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.gate_tokens       (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.worker_init_rate  (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.rate_limits       (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.generation_logs   (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.secure_sessions   (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.banned_devices    (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.activated_users   (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.suspicious_activity (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.admin_logs        (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.honeypot_log      (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());

create index if not exists valid_keys_status_idx   on public.valid_keys ((data->>'status'));
create index if not exists valid_keys_expiry_idx    on public.valid_keys (((data->>'expiry')::bigint));
create index if not exists generation_logs_time_idx on public.generation_logs (((data->>'time')::bigint));
create index if not exists gate_tokens_created_idx  on public.gate_tokens (((data->>'createdAt')::bigint));
create index if not exists secure_sessions_ts_idx   on public.secure_sessions (((data->>'timestamp')::bigint));

create or replace function public.dg_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['valid_keys','app_config','access_tokens','gate_tokens','worker_init_rate','rate_limits','generation_logs','secure_sessions','banned_devices','activated_users','suspicious_activity','admin_logs','honeypot_log']
  loop
    execute format('drop trigger if exists %I_touch on public.%I;', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.dg_touch_updated_at();', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['valid_keys','app_config','access_tokens','gate_tokens','worker_init_rate','rate_limits','generation_logs','secure_sessions','banned_devices','activated_users','suspicious_activity','admin_logs','honeypot_log']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('drop policy if exists %I_owner_all on public.%I;', t, t);
    execute format('create policy %I_owner_all on public.%I for all to authenticated using (public.dg_is_owner()) with check (public.dg_is_owner());', t, t);
  end loop;
end $$;

-- ------------------------- 3. SECURE REDEEM RPC -------------------------
create or replace function public.redeem_secure_session(p_token text, p_fingerprint text, p_version text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row public.secure_sessions%rowtype;
  v_data jsonb;
  v_ts bigint;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_timer int;
  v_min_timer int;
  v_elapsed numeric;
  v_link text;
  v_burned int;
begin
  if p_token is null or length(p_token) = 0 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if p_fingerprint is null or length(p_fingerprint) = 0 or length(p_fingerprint) > 200 then
    return jsonb_build_object('ok', false, 'error', 'invalid_fingerprint');
  end if;
  select * into v_row from public.secure_sessions where id = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  v_data := v_row.data;
  if coalesce((v_data->>'used')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;
  if coalesce(v_data->>'fingerprint', '') <> p_fingerprint then
    return jsonb_build_object('ok', false, 'error', 'fingerprint_mismatch');
  end if;
  if p_version is not null and (v_data ? 'modVersion') and coalesce(v_data->>'modVersion','') <> p_version then
    return jsonb_build_object('ok', false, 'error', 'version_mismatch');
  end if;
  select coalesce((data->'timer')::text::int, 900), coalesce((data->'minTimer')::text::int, 45)
    into v_timer, v_min_timer from public.app_config where id = 'Security';
  if v_timer is null then v_timer := 900; end if;
  if v_min_timer is null then v_min_timer := 45; end if;
  v_ts := coalesce((v_data->>'timestamp')::bigint, 0);
  v_elapsed := (v_now - v_ts) / 1000.0;
  if v_elapsed > v_timer then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if v_elapsed < v_min_timer then return jsonb_build_object('ok', false, 'error', 'too_fast'); end if;
  update public.secure_sessions set data = jsonb_set(data, '{used}', 'true'::jsonb)
   where id = p_token and coalesce((data->>'used')::boolean, false) = false;
  get diagnostics v_burned = row_count;
  if v_burned = 0 then return jsonb_build_object('ok', false, 'error', 'already_used'); end if;
  v_link := coalesce(nullif(v_data->>'link', ''), nullif(v_data->>'megaLink', ''));
  if v_link is null then return jsonb_build_object('ok', false, 'error', 'no_link'); end if;
  return jsonb_build_object('ok', true, 'link', v_link, 'encrypted', (v_data ? 'megaLink') and not (v_data ? 'link'));
end; $$;

-- ------------------------- 4. GRANTS + HARDENING -------------------------
grant execute on function public.is_owner_user(uuid) to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.redeem_secure_session(text, text, text) from public;
grant execute on function public.redeem_secure_session(text, text, text) to anon, authenticated;

revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.dg_mark_owner_profile() from anon, authenticated, public;
revoke all on function public.dg_touch_updated_at() from anon, authenticated, public;
revoke all on function public.dg_is_owner() from anon, authenticated, public;

-- ------------------------- 5. SEED APP CONFIG -------------------------
insert into public.app_config (id, data) values
  ('Title',            '"Dynamon Gamer"'::jsonb),
  ('Subtitle',         '"Device Verification"'::jsonb),
  ('Maintenance',      'false'::jsonb),
  ('AppVersion',       '1'::jsonb),
  ('KeyDurationHours', '24'::jsonb),
  ('RateLimit',        '{"enabled": false}'::jsonb),
  ('IPWhitelist',      '["152.59.32.24"]'::jsonb),
  ('FeatureLocks',     '{"noTrophyLoss": true, "winTrophy": true}'::jsonb),
  ('Security',         '{"timer": 1200, "minTimer": 45}'::jsonb),
  ('Texts',            '{"BtnAdmin":"ADMIN SUPPORT","BtnKey":"GET KEY","BtnLogin":"ACTIVATE SYSTEM","BtnTutorial":"Watch Tutorial","Hint":"ENTER ACCESS KEY"}'::jsonb),
  ('Links',            '{"Admin":"http://t.me/ASTAMODS07","BypassUrl":"https://jobustecher.letest25.co/geio.php?grey=","GetKey":"https://generator.dynamongamer30.workers.dev/init","Info":"https://youtu.be/piqKkWfRLNQ","InfoText":"More Info","Instagram":"https://www.instagram.com/stoicist_zayen","ShortenerApi":"https://earnlinks.in/api","ShortenerToken":"093c0573871a4545cfceac1deebf82b4da672d48","Telegram":"https://t.me/dynamonsworld07","Whatsapp":"https://whatsapp.com/channel/0029VbBdAcZ05MUmgk8cQP05","Youtube":"https://youtube.com/@dynamongamer07"}'::jsonb),
  ('Update',           '{"BtnText":"UPDATE","Enabled":true,"Subtitle":"V 1.12.93 • Critical Patch","Title":"Update Available","UpdateUrl":"https://dynamongamer.space/download?id=mod_mqpf4nyq","VersionCode":11293,"VersionName":"1.12.93","WhatsNew":"• Upgrading Game Shops\n• Smooth Gameplay \n• One Hit Kill\n• Unlimited Arena Items\n• Trophy Pushing\n• Always Win \n• Cheater Check Removed\n• Dialog By Dynamon Gamer "}'::jsonb),
  ('Tutorial',         '{"title":"How to Install Mods Of Dynamons World","videoId":"pSw29_oaUMs"}'::jsonb),
  ('Api',              '{"BaseUrl":"https://earnlinks.in/api","DestBase":"https://jobustecher.letest25.co/geio.php?grey=","Token":"093c0573871a4545cfceac1deebf82b4da672d48"}'::jsonb)
on conflict (id) do nothing;

-- Done. Verify with:  select count(*) from public.app_config;   -- expect 14
