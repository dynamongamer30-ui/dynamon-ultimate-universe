-- =====================================================================
-- Dynamon Universe — Unified backend (replaces Firebase Realtime DB)
-- =====================================================================
-- Single source of truth shared by:
--   * Cloudflare Worker "generator" (shortlink gate + key generation)
--   * Cloudflare Worker "dg"        (license loader + device ban)
--   * This web admin panel          (owner-only, Google login)
--   * The Android app               (through the Workers only)
--
-- Storage model (MUST match the Workers' Firebase-compat shim exactly):
--   Every former Firebase node is ONE row:  (id text primary key, data jsonb)
--   Firebase path "/Table/id"  ->  table TABLE_MAP[Table], row id = id,
--   value stored in the `data` jsonb column.
--
-- Security model:
--   * Workers connect with the SERVICE ROLE key -> they BYPASS RLS entirely.
--     (Never expose the service key to the browser or the APK.)
--   * The web admin uses the signed-in owner (Google). RLS grants full access
--     ONLY to the owner (profiles.is_owner via public.is_owner_user()).
--   * The browser anon role gets NO direct access to any sensitive table.
--     The public unlock page can ONLY call redeem_secure_session() (a
--     SECURITY DEFINER RPC that validates + atomically burns the token and
--     returns the download link once). This is what makes the flow
--     un-bypassable: nothing sensitive is ever readable client-side.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Owner helper (reuse existing is_owner_user if present, else fallback)
-- ---------------------------------------------------------------------
-- Existing projects already expose public.is_owner_user(uuid). We create a
-- thin, stable wrapper so every policy below reads identically and keeps
-- working even if the underlying helper changes.
create or replace function public.dg_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_owner from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- 1. Generic (id, data) table factory — done inline for clarity
-- ---------------------------------------------------------------------
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

-- Helpful indexes for admin queries (JSONB expression indexes on hot fields).
create index if not exists valid_keys_status_idx   on public.valid_keys ((data->>'status'));
create index if not exists valid_keys_expiry_idx    on public.valid_keys (((data->>'expiry')::bigint));
create index if not exists generation_logs_time_idx on public.generation_logs (((data->>'time')::bigint));
create index if not exists gate_tokens_created_idx  on public.gate_tokens (((data->>'createdAt')::bigint));
create index if not exists secure_sessions_ts_idx   on public.secure_sessions (((data->>'timestamp')::bigint));

-- ---------------------------------------------------------------------
-- 2. keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.dg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'valid_keys','app_config','access_tokens','gate_tokens','worker_init_rate',
    'rate_limits','generation_logs','secure_sessions','banned_devices',
    'activated_users','suspicious_activity','admin_logs','honeypot_log'
  ]
  loop
    execute format('drop trigger if exists %I_touch on public.%I;', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.dg_touch_updated_at();', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Row Level Security — owner-only for the web; workers use service role
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'valid_keys','app_config','access_tokens','gate_tokens','worker_init_rate',
    'rate_limits','generation_logs','secure_sessions','banned_devices',
    'activated_users','suspicious_activity','admin_logs','honeypot_log'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);

    -- Owner (Google-authenticated site owner) gets full control.
    execute format('drop policy if exists %I_owner_all on public.%I;', t, t);
    execute format($p$
      create policy %I_owner_all on public.%I
        for all
        to authenticated
        using (public.dg_is_owner())
        with check (public.dg_is_owner());
    $p$, t, t);
  end loop;
end $$;

-- NOTE: We deliberately create NO policy for the anon role on any table.
-- With RLS forced and no anon policy, the browser anon key cannot read or
-- write these tables at all. The only public entry point is the RPC below.

-- ---------------------------------------------------------------------
-- 4. Hardened one-time download unlock (atomic burn, server-side only)
-- ---------------------------------------------------------------------
-- Replaces the old client-side flow where the browser read SecureSessions,
-- checked fingerprint/timestamp itself, decrypted the link with a bundled
-- key, and flipped `used`. All of that was trivially bypassable.
--
-- This RPC runs as SECURITY DEFINER (bypasses RLS), performs EVERY check
-- server-side, and flips `used` ATOMICALLY (UPDATE ... WHERE used=false)
-- so a token can never be redeemed twice, even under a race.
--
-- Session row shape (data jsonb), written by the Worker/app that creates it:
--   {
--     "link":        "<plaintext download url>",   -- preferred
--     "megaLink":    "<legacy encrypted url>",      -- fallback (back-compat)
--     "timestamp":   1782596095140,                 -- ms since epoch
--     "fingerprint": "<device fp>",
--     "used":        false,
--     "modVersion":  "1.12.93"                       -- optional
--   }
create or replace function public.redeem_secure_session(
  p_token       text,
  p_fingerprint text,
  p_version     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        public.secure_sessions%rowtype;
  v_data       jsonb;
  v_ts         bigint;
  v_now        bigint := (extract(epoch from now()) * 1000)::bigint;
  v_timer      int;
  v_min_timer  int;
  v_elapsed    numeric;
  v_link       text;
  v_burned     int;
begin
  -- Basic input hygiene.
  if p_token is null or length(p_token) = 0 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if p_fingerprint is null or length(p_fingerprint) = 0 or length(p_fingerprint) > 200 then
    return jsonb_build_object('ok', false, 'error', 'invalid_fingerprint');
  end if;

  select * into v_row from public.secure_sessions where id = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  v_data := v_row.data;

  if coalesce((v_data->>'used')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  -- Fingerprint must match the device that started the session.
  if coalesce(v_data->>'fingerprint', '') <> p_fingerprint then
    return jsonb_build_object('ok', false, 'error', 'fingerprint_mismatch');
  end if;

  -- Optional version pin.
  if p_version is not null and (v_data ? 'modVersion')
     and coalesce(v_data->>'modVersion','') <> p_version then
    return jsonb_build_object('ok', false, 'error', 'version_mismatch');
  end if;

  -- Timing window comes from app_config (rows "Security" -> {timer,minTimer}).
  select coalesce((data->'timer')::text::int, 900),
         coalesce((data->'minTimer')::text::int, 45)
    into v_timer, v_min_timer
    from public.app_config where id = 'Security';
  if v_timer is null then v_timer := 900; end if;
  if v_min_timer is null then v_min_timer := 45; end if;

  v_ts := coalesce((v_data->>'timestamp')::bigint, 0);
  v_elapsed := (v_now - v_ts) / 1000.0;
  if v_elapsed > v_timer then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_elapsed < v_min_timer then
    return jsonb_build_object('ok', false, 'error', 'too_fast');
  end if;

  -- ATOMIC BURN: only succeeds if still unused. Prevents replay/race.
  update public.secure_sessions
     set data = jsonb_set(data, '{used}', 'true'::jsonb)
   where id = p_token
     and coalesce((data->>'used')::boolean, false) = false;
  get diagnostics v_burned = row_count;
  if v_burned = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  -- Prefer plaintext link; fall back to legacy encrypted field for old rows.
  v_link := coalesce(nullif(v_data->>'link', ''), nullif(v_data->>'megaLink', ''));
  if v_link is null then
    return jsonb_build_object('ok', false, 'error', 'no_link');
  end if;

  return jsonb_build_object(
    'ok', true,
    'link', v_link,
    'encrypted', (v_data ? 'megaLink') and not (v_data ? 'link')
  );
end;
$$;

-- Let the public site (anon) and signed-in users call ONLY this function.
revoke all on function public.redeem_secure_session(text, text, text) from public;
grant execute on function public.redeem_secure_session(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Seed app_config from the existing Firebase export (each key = one row)
-- ---------------------------------------------------------------------
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
  ('Tutorial',         '{"title":"How to Install Mods Of Dynamons World 🌿","videoId":"pSw29_oaUMs"}'::jsonb),
  ('Api',              '{"BaseUrl":"https://earnlinks.in/api","DestBase":"https://jobustecher.letest25.co/geio.php?grey=","Token":"093c0573871a4545cfceac1deebf82b4da672d48"}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. Owner Gmail -> is_owner (profiles.id == auth.users.id; no email col)
-- ---------------------------------------------------------------------
-- The owner email is centralised here. Change it in ONE place if needed.
create or replace function public.dg_owner_email()
returns text language sql immutable as $$ select 'yugvadecha30@gmail.com'::text $$;

-- (a) Flip any EXISTING profile that belongs to the owner Gmail.
update public.profiles p
   set is_owner = true
  from auth.users u
 where u.id = p.id
   and lower(u.email) = public.dg_owner_email();

-- (b) Auto-grant on FUTURE sign-in: when the owner's profile row is created
--     (or updated) we stamp is_owner = true. This guarantees the very first
--     Google login as the owner Gmail lands in the owner console immediately.
create or replace function public.dg_mark_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from auth.users u
     where u.id = new.id
       and lower(u.email) = public.dg_owner_email()
  ) then
    new.is_owner := true;
  end if;
  return new;
end;
$$;

drop trigger if exists dg_mark_owner_on_profile on public.profiles;
create trigger dg_mark_owner_on_profile
  before insert or update on public.profiles
  for each row execute function public.dg_mark_owner_profile();
