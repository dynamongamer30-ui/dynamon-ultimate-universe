# DynamonGamer.com migration checklist (2026-10-18)

**Goal:** safely migrate `https://dynamongamer.space` to `https://dynamongamer.com` without losing site content, Google sign-in, Supabase accounts, rewards, keys, or Northwest mail service.

**Status:** PREPARATION ONLY. This branch / draft PR is not live. Do not allow `.space` to expire until the new site is tested; redirects cease when the old domain expires.

## Part A — Cloudflare website domain: BLOCKED ON DASHBOARD ACTION

- [x] Both zones are active in Cloudflare, in the same account.
- [x] Existing website Worker is `dynamon-ultimate-universe`; `dynamongamer.space` is its attached custom domain.
- [ ] Cloudflare Dashboard > Workers & Pages > `dynamon-ultimate-universe` > Settings > Domains & Routes > Add Custom Domain: `dynamongamer.com`.
- [ ] Wait for SSL and verify `https://dynamongamer.com/`, `/auth`, `/generator`, `/mods`, `/admin` work.
- [ ] Set `www.dynamongamer.com` to 301 redirect to `https://dynamongamer.com` preserving paths and queries. The existing proxied `www` A record currently points to 66.223.49.89; configure the redirect correctly rather than guessing.
- [ ] Keep `.space` live until all checks pass; add 301 redirects after cutover.

**Important:** The connected Cloudflare API returned authentication error 10000 on the attempt to attach the new Worker domain. No live domain change was made.

## Part B — Website GitHub source: CODE PREPARED ON MIGRATION BRANCH

Repository: `dynamongamer30-ui/dynamon-ultimate-universe`
Branch: `migration-dynamongamer-com-20261018`
Draft pull request: `https://github.com/dynamongamer30-ui/dynamon-ultimate-universe/pull/11`

- [x] `src/lib/seo.ts`: canonical URLs to `.com`.
- [x] `src/routes/privacy.tsx`: displayed privacy/contact URLs to `.com`.
- [x] `scripts/generate-sitemap.mjs`, `public/sitemap.xml`, `public/robots.txt`: sitemap to `.com`.
- [x] `workers/generator/src/index.js`: redirect to `.com/generator`, allow `.com` and `www.com` origins, still allow `.space` while migrating.
- [x] `workers/license/src/index.js`: allow new `.com` hostnames; keep legacy `.space` until retired.
- [ ] Confirm how Cloudflare builds/deploys from repository. Merging GitHub code is NOT equivalent to deploying both Workers.
- [ ] Review draft PR, then merge/deploy website and *separately* deploy generator and `dg` (license) Workers, preserving R2/KV/Supabase secrets and service bindings.

## Part C — Google OAuth: MUST CHECK OWNER DASHBOARDS

Source audit:
- `src/routes/auth.tsx` uses Google sign-in, with `window.location.origin + '/auth'`.
- `src/integrations/lovable/index.ts` is a wrapper for `supabase.auth.signInWithOAuth`.
- `src/integrations/supabase/client.ts` enables PKCE and detectSessionInUrl.
- Existing Supabase project ref is `dfxcpxzylyycrirtnkof`.

Supabase Dashboard > Authentication > URL Configuration:
- [ ] Set **Site URL** to `https://dynamongamer.com`.
- [ ] Add **Redirect URL** `https://dynamongamer.com/auth` (and any permitted `https://dynamongamer.com/**` wildcard if needed).
- [ ] Retain `.space/auth` temporarily for old sessions until cutover.
- [ ] Confirm Authentication > Sign In / Providers > Google remains enabled.

Google Cloud Console > Google Auth Platform > Clients (existing Web OAuth Client):
- [ ] Authorized JavaScript origin: `https://dynamongamer.com` (and `https://www.dynamongamer.com` only if www serves the app, not redirects).
- [ ] Authorized redirect URI stays `https://dfxcpxzylyycrirtnkof.supabase.co/auth/v1/callback`. Do NOT substitute `.com/auth` as the Google callback.
- [ ] Branding > Authorized domains: ensure `dynamongamer.com` is listed if Google requires it; check Verification/Audience settings.
- [ ] Test Google sign-in on `.com/auth`, confirm same Supabase user/profile, and test sign-out/sign-in in a private browser.

**Never commit/share OAuth client secrets.** The OAuth console/provider settings are not exposed by connected tools; not confirmed.

## Part D — Supabase database / website state: NO DATA EXPORT NEEDED

- [x] Project `dfxcpxzylyycrirtnkof` healthy and active.
- [x] Existing user profiles, rewards, key data etc. remain in that project.
- [x] No `.space` references found in `public.site_settings` (3 rows) or `public.mod_overrides` (8 rows).
- [x] One `.space` reference found in `public.app_config` -> row `Update`, property `UpdateUrl`.
- [ ] After `.com/mods/thunder-arena` is tested, update `UpdateUrl` from `https://dynamongamer.space/mods/thunder-arena` to `https://dynamongamer.com/mods/thunder-arena`; preserve rest of JSON.
- [ ] Verify site settings, notifications, account profiles, admin controls and rewards on new domain.

## Part E — Cloudflare Workers, Turnstile, and other services

- [x] Workers present: `dynamon-ultimate-universe` (website), `generator` (key flow), `dg` (public config and payload/licensing), `royal-void-v2`.
- [x] `dg` retains KV `DG`, R2 bucket `dynamon-mods`, Supabase bindings.
- [x] Cloudflare KV namespace `DG` has no keys in current listing.
- [ ] Confirm Worker code source version matches deployment; do not blindly replace live Worker with an incomplete source bundle.
- [ ] Deploy updated `generator` and `dg` domain allowlists after website readiness; preserve all secrets/vars.
- [ ] Cloudflare Turnstile widget: add `dynamongamer.com` as approved hostname (and www if needed). Existing sitekey and server-side secret can be retained.
- [ ] Test `/generator`, gate, Turnstile, key generation, return to game, admin, and payload/config endpoints.
- [ ] Keep existing `*.dynamongamer30.workers.dev` backend URLs unless purposefully changing APIs.

## Part F — Royal Void application and website links

- [x] `RoyalVoid/V3/src/com/dynamongamer/royalvoid/PublicConfigClient.java` uses `generator.dynamongamer30.workers.dev/start` and `dg.dynamongamer30.workers.dev/config`, not a hardcoded `.space` website hostname.
- [x] `V2LicenseGate.java` uses `royal-void-v2.dynamongamer30.workers.dev` and `dg.dynamongamer30.workers.dev` for licensing.
- [ ] Check website-managed Get Key, Admin, Tutorial, social Website link and other public UI values resolve on `.com` and the login/menu display the correct domain.
- [ ] Test APK deep link `dynamongamer://verify`, verification, online licensing, login and mod game startup.
- [ ] Do not rebuild classes5.dex solely for the domain: backends remain the same.

## Part G — Northwest business email: PRESERVE

- [x] `info@dynamongamer.com` exists with Northwest.
- [x] DNS has MX `mailserver.businessidentity.llc`, SPF and DMARC TXT records.
- [ ] Do not remove/change MX, SPF, DMARC, ACME DNS TXT or mail passwords during website DNS changes.
- [ ] Test mail sent to and from Gmail/Northwest after cutover.

## Part H — Google Search, SEO, links and redirects

- [x] Source canonical URL, robots and sitemap prepared for `.com`.
- [ ] Google Search Console: verify `dynamongamer.com` via DNS TXT, preserve email TXT records.
- [ ] Submit `https://dynamongamer.com/sitemap.xml`.
- [ ] Once 301 redirects work, use Google Search Console Change of Address from `.space` to `.com`.
- [ ] Check canonical, Open Graph and legal page links, social media bios, APK update URLs, community notices, and externally shared links.
- [ ] Test URLs with paths and query parameters, not only homepage.

## Final launch checks

- [ ] HTTPS and certificate work for apex and www
- [ ] Login/signup with Google and protected admin access
- [ ] Existing user profiles/data/rewards
- [ ] Generator / Turnstile / new key / game verification
- [ ] Royal Void APK Get Key / Admin / Tutorial links
- [ ] Mods, downloads, images and update links
- [ ] Mobile performance and saved PWA behavior
- [ ] Northwest business email send/receive
- [ ] SEO sitemap, canonical, redirect correctness
- [ ] Rollback: existing `.space` route intact until validation complete

**Do not delete `.space`, Supabase project, Workers, R2 objects, or GitHub main source as part of this migration.**
