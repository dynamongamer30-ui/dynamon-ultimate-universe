# Dynamon Universe — Deployment & Migration Notes

This project was migrated **off Firebase Realtime Database** onto **Supabase** (web + data)
plus two **Cloudflare Workers** (the only components the Android app talks to). No client —
web or Android — ever touches the database directly.

## Architecture

```
Android app ──► License Worker  ──► Supabase (service role)
                Generator Worker ──► Supabase (service role)
Web (owner)  ──► Supabase (RLS, owner-only) + redeem RPC
```

- **Android app** (`android/`): talks ONLY to the Workers. All Firebase calls were removed
  and replaced with Worker endpoints in `ModNetworkManager.java`.
- **License Worker** (`workers/license/`): key verification, device binding, tamper/ban,
  config, heartbeat. Public endpoints: `/config`, `/verify-key`, `/tamper`, `/heartbeat`.
- **Generator Worker** (`workers/generator/`): key generation / shortener bypass flow.
- **Supabase**: source of truth. Owner-only RLS on all `dg_*` tables; the app never reads it.

## Database

Migrations live in `supabase/migrations/` and are already applied to the linked project:

1. `20260704080000_auth_foundation.sql` — `profiles`, `is_owner_user()`, `get_my_profile()`,
   `username_available()`, new-user trigger, owner-by-Gmail auto-grant.
2. `20260704090000_dg_unified_backend.sql` — DG key tables (`valid_keys`, `secure_sessions`,
   `banned_devices`, `activated_users`, `app_config`, …), owner-only RLS via `dg_is_owner()`,
   the hardened `redeem_secure_session()` RPC, and seeded `app_config`.
3. `20260704091000_dg_harden_functions.sql` — pins `search_path` and revokes REST execute on
   trigger / RLS-helper functions (advisor cleanup).

**Owner account:** the Gmail in `public.dg_owner_email()` (`yugvadecha30@gmail.com`) is
auto-stamped `is_owner = true` on first Google sign-in. To change the owner, update that
function in one place.

## Required environment variables

### Web (Vite) — already set via the Supabase integration
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Supabase integration)
- `VITE_GEN_WORKER_URL` — Generator Worker base URL
- `VITE_LICENSE_WORKER_URL` — License Worker base URL
- `VITE_TURNSTILE_SITE_KEY` — (optional) Cloudflare Turnstile site key

### Workers (set with `wrangler secret put`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — service role; Workers bypass RLS server-side
- Any shortener/API tokens referenced in `app_config` (already seeded).

## Deploy

```bash
# Workers
cd workers/license   && npx wrangler deploy
cd workers/generator && npx wrangler deploy

# Web (Vercel) — push to the connected repo, or:
pnpm build
```

## Android

The updated Android sources are vendored under `android/`. Point the app's two Worker base
URLs (in `ModNetworkManager.java`) at your deployed Workers, then build the APK in Android
Studio / Gradle as usual. The UI now matches the web "Ember Vault" theme (near-black base,
ember-orange primary, gold accent) with haptics and sound feedback wired through
`ModMediaUtils`.
