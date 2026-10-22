# Royal Void evolution: verified baseline

Audit date: 22 October 2026 (Asia/Kolkata). Source baseline: `fe983a93cd7e3274f4faf6ef13b3cc989d013676`, existing `main`.

## Connection matrix

| Capability | Verified result |
| --- | --- |
| GitHub MCP | Website repository readable; push permission reported; main unprotected at audit |
| Filesystem / Git | Fresh single-branch main checkout; original APK resource folders untouched |
| Cloudflare MCP | Website, dg, generator, royal-void-v2 and isolated Neon test Workers accessible |
| Supabase MCP | `dfxcpxzylyycrirtnkof`, ACTIVE_HEALTHY, PostgreSQL 17; public schema and policies inspected |
| Playwright MCP | Not exposed in this session |
| Playwright Test | Added as a development dependency; real installed Chrome, headless emulation |
| Local Wrangler | Existing credentials expired; automatic Cloudflare main deployment available |
| Assets | Existing website WebP artwork available; recursive home-folder search found no directory named Dynamons |
| Skills | Architecture applied; frontend-design read for the subsequent design foundation |

## Architecture and features

React 19, TanStack Start/Router, Vite 8, Tailwind 4, TypeScript, Motion, Supabase and Nitro's Cloudflare target. Preserve the existing Lovable Vite wrapper: it already installs framework, React, Tailwind and Nitro plugins. Generated route tree must remain generated.

Root providers handle auth, global settings, gamification and confirmation; PageShell provides shared header/footer. SiteSettingsProvider merges eight built-in mod entries with public owner overrides, real likes and ratings. Public discovery includes filtering, search, cards and mod detail pages. Authenticated features include profiles, favorites, comments/replies/reactions, ratings, subscriptions, XP/streaks, trainer levels, rewards, claims and notifications. Owner routes cover reports, branding, mod overrides, native DEX settings, keys, loader and announcements.

Supabase remains the sole production database/auth authority. No Neon references were found in main's `src`, `workers` or existing docs. Cloudflare's Neon test Worker and its historical branch remain separate and untouched. Backend Workers have independent release paths; website pushes must not deploy them.

## Build and test baseline

* TypeScript: PASS before changes.
* Existing Node key-admin test: PASS before changes (one suite covering timing, lifetime, conditional writes and secure creation).
* Production bundle: PASS using the existing Vite entry and compatibility date.
* Existing `build` script uses POSIX environment assignment and cannot run unchanged on Windows. A portable Node wrapper is the first repair.
* ESLint: FAIL, 15,625 errors: 15,617 formatting violations and eight explicit-any errors; 12 warnings. Formatting and live schema types require repair before commits.
* No existing browser suite was present. Reproducible public smoke coverage is added before visual work.

## Live browser baseline

21 routes visited at 390×844, 820×1180 and 1440×1000: 63 navigations, all HTTP 200, zero uncaught page errors, zero observed HTTP failures and zero document-level horizontal overflow. These are public/signed-out checks, not authenticated functional certification. A second visual sweep scrolled through content before screenshots; reveal animations otherwise leave offscreen content invisible in full-page captures. Mod detail `/mods/thunder-arena` was included in that visual sweep.

Observed requests: production site, Cloudflare Insights and the specified Supabase project. No Neon request observed. `.space` ends at `.com/`; both custom domains are attached to the website Worker. No DNS edits made.

Visual findings: desktop hero text wraps into five emphatic lines and overwhelms the composition; desktop artwork does not match the featured Thunder card; global purple styling is pervasive; website theme selection is absent; spacing and heading hierarchy need refinement. Existing card artwork is useful and already WebP. No overflow defect was reproduced at the three baseline widths. More widths, zoom, keyboard navigation and browser engines remain required.

## Themes, components and motion

33 top-level shared components plus six UI primitives. Current global CSS already defines surface, typography, spacing, safe-area, motion and stacking tokens. It provides one violet palette and some legacy light overrides. Element-specific card accents are separate from website theming.

DexThemes is the native configuration editor: exactly `dark`, `fire`, `thunder`, `water`, `earth`, `diamond`, `gold`, `spirit`, schema 1. Do not add Royal Black to that native object. Website appearance needs its own settings key and tokens.

Motion uses Motion transitions and viewport reveals, CSS glow/marquee effects, pointer tilt and a custom cursor. Root MotionConfig respects reduced motion; pointer tilt/cursor check reduced motion at mount. Cursor runs a continuous animation frame loop while enabled: an optimization candidate. HeroWebGL currently implements CSS tilt rather than WebGL. Dialog focus management already exists and should be reused.

## Data access and security

49 public tables listed; all report RLS enabled. Site settings allow public SELECT and owner-only writes; valid_keys/app_config remain owner controlled. Auth uses Supabase PKCE, Google OAuth return handling and persistent identity. Protected browser checks used no owner session and performed no write actions.

High-priority finding: live `award_xp_internal` accepts an arbitrary user ID/amount and performs SECURITY DEFINER writes without an auth guard; `grant_achievement_internal` similarly accepts an arbitrary target. Advisors report executable grants to anon/authenticated. No exploit or production mutation was attempted. In addition, own-row XP UPDATE and achievement INSERT policies allow clients to modify progression directly. These must be reviewed together with trigger/RPC dependencies before a version-controlled permission migration. This audit does not change authorization policies.

Advisors: 27 anonymous and 30 authenticated SECURITY DEFINER findings (some intentionally callable/trigger-only), five rv_v2 tables with RLS and no client policies, and leaked-password protection disabled. A warning is not proof every listed function is exploitable: admin_grant_phoenix_pass has an owner guard, and trigger-returning functions cannot be invoked as ordinary RPCs.

Performance advisors: 18 unindexed foreign keys, 75 auth-RLS initplan findings, five unused indexes and 103 multiple-policy findings. Do not blindly drop policies or indexes. Site settings fetch four collections on mount. Comments fetch comments/ratings by slug, batch authors and likes, but lack explicit pagination. Notifications have no aggressive polling, but sender/profile reads can repeat across hook consumers. Owner configuration saves need broader stale-write review.

## Assets and accessibility

Nine existing WebP artwork files total 941,942 bytes; hero is 20,074 bytes. Originals remain untouched. Existing ASSET_LICENSES.md says General Sans and Aeonik Pro provenance requires owner confirmation. No external artwork or new font redistribution added. Do not copy APK archives or native source into public assets.

Accessibility foundation includes semantic navigation, named search controls, touch targets, focus management and reduced-motion CSS. Full contrast, keyboard, text scaling, form and authenticated-dialog audits remain incomplete. PWA manifest/install prompt exists; offline/service-worker behavior requires verification.

## Risk order and roadmap

1. Repair lint/build portability and stale schema types; preserve behavior; add public smoke tests.
2. Establish website-only theme tokens, Royal Black, persistence and owner controls with compare-and-save; preserve DEX schema.
3. Refine shell, mobile navigation, typography and hero using existing artwork.
4. Modernize discovery/detail/community/account/reward/owner pages with incremental gates.
5. Fix proven query inefficiencies with bounded access; separately review progression authorization.
6. Measure network, performance, accessibility, all nine themes and the complete width/browser matrix.
7. Verify native contracts offline and on a real authorized device when available; final quota and production hardening report.

No LCP/INP/CLS field results, traffic totals, actual APK device pass, protected-flow pass or full completion claim is made by this baseline.
