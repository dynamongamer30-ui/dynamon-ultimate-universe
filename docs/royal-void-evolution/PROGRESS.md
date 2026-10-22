# Phase ledger

This is an incremental engineering ledger, not a completion certificate. All checks must be distinguished from work still pending. Evidence paths refer to the originating local workspace; screenshots can contain public owner-configured announcements but no private production records.

## Phase 00 — connected tool verification

Initial state: website source absent from selected workspace. GitHub, Cloudflare, Supabase and filesystem verified. Playwright MCP unavailable; installed Playwright Test plus installed Chrome provides equivalent browser checks. Local Wrangler expired; automatic main trigger verified. No production mutations. PASS for available startup capabilities, with authenticated session/device/browser-engine limitations recorded in BASELINE.md.

## Phases 01–03 — repository, live baseline and integration inventory

Architecture, routes, components, themes, data patterns, deployment and asset inventory recorded. Public baseline: 63 route navigations across three widths, no page errors/HTTP failures/overflow. Additional scrolled screenshots taken for home, library, Thunder detail and generator. R21 release verified; backend endpoints mapped from source and service bindings. Protected real APK and owner-flow validation unavailable. Overall PARTIAL: complete protocol fixture parity, every width/browser and authenticated interaction coverage remain pending. No implementation commits yet at baseline.

## Phase 04 — baseline repair

Initial defects: lint fails (15,625 errors); POSIX-only build script; stale generated types conceal invalid broadcast insert property `recipients` (live column is `recipient_count`). Changes: repository formatter normalization, live schema type regeneration, typed calls, correct column, portable Node build wrapper, check/test scripts, Playwright public smoke suite, LF normalization. Formatting-only changes to backend sources do not deploy them. No migrations, settings writes or native changes.

Pre-commit verification: TypeScript PASS; lint PASS (zero errors, 11 existing Fast Refresh warnings); key-admin tests PASS; portable production build PASS; 22-route local smoke PASS at three widths; navigation/search interaction PASS at three widths. Initial interaction tests were corrected to await hydration before clicking. Canonical formatter comparison confirms 70 existing source/script files have formatting-only changes; only schema types, notification accessors, achievement accessors and the admin broadcast column have non-formatting changes. No credential literals added; `.env` remains ignored. Routes preserved; no Worker protocol/schema/native behavior change. Supabase quota impact: no added recurring requests. Cloudflare build/deployment/live status must still be appended after the main push. Final status: BLOCKED pending actual production rollout, not a local-check failure.

## Baseline deployment recovery

Release attempt: main commit `e62f05b2ab001d1058bf941e728274e3c91d81fa` published with GitHub MCP after terminal Git credentials failed. Cloudflare automatic enqueue was delayed; the existing main build trigger was also invoked explicitly. Subsequent delayed builds confirmed automatic main deployment works. Build `2e5f3a11-3ff2-4cdb-93a2-0db0f4ff54fe` failed at dependency installation: pnpm 9.10.0 requires a `packages` list in pnpm-workspace.yaml, unlike the local pnpm 11 generator. No production deployment occurred. Add explicit root package selection and verify with production pnpm before retrying. This failure is not a website runtime regression.

Recovery: commit `a64521ad24ea1158954d78c80b5fcd23d184eebe` adds the root package list. Verified pnpm 9.10.0 frozen-lockfile resolution in an isolated directory, TypeScript, lint, key tests and build. Cloudflare build `7635c804-9732-43ed-850d-c4a2c4d0efc1` succeeded. Deployment `78da3d51-ea44-47f1-974e-b9a4add73700`, version `3ec806a2-d719-4fc9-8d8b-2add6a68fc44` activated at 100%. Six production browser tests passed across phone/tablet/desktop. Phase 04 final status: PASS for repaired tooling and public/signed-out validation. Authenticated broadcast submission was not performed in production.

## Website foundation increment — phases 05, 06, 07, portions of 08, 09, 13 and 23

Implemented 23 October 2026: independent nine-theme website schema and complete surface tokens; Royal Black default; browser-local persistence and cross-tab synchronization; no-flash startup selection; picker in desktop header/mobile navigation; owner appearance tab with enabled/default themes, previews, hex validation, contrast fallback, reset and explicit publication. Reuses existing site_settings read and owner RLS. Compare-and-save rejects stale snapshots; inserts reject duplicate concurrent creation. Native DexThemes, Workers, key timing and APK binaries are unchanged.

Homepage heading now has a controlled two-part hierarchy and featured artwork follows the actual featured mod. Existing owner data/counters and destinations are preserved. Keyboard Escape closes navigation/search/account panels and restores focus. Skip-to-content link added.

Validation before release: all nine themes on phone/tablet/desktop, persistence across reload and navigation, distinct backgrounds, muted text/card contrast ≥4.5:1, zero extra Supabase requests while switching. Actual screenshots reviewed as desktop/mobile contact sheets. Home/library checked at 320, 360, 375, 390, 430, 600, 768, 820, 1024, 1280, 1440 and 1920px; no page overflow or clipped header controls. Public route and interaction smoke suite passes. Unit tests cover invalid config/colors, contrast, native-ID separation, stale updates, concurrent creation and denied writes. These are emulated Chrome tests; no physical-device claim.

Phase limits: production owner publication, all-route nine-theme contrast, Firefox/WebKit, browser zoom/text scaling, complete user journeys and real APK validation remain BLOCKED or PENDING. The increment is not certification of complete phases 08–36. No DB migration or live settings write. Theme choice produces zero server writes; one intentional owner publication writes one existing settings row and refreshes the existing settings bundle. Cloudflare GraphQL usage query returned rate-limiter budget depleted; no usage figures inferred from that error.

Theme rollout: main commit `f42ee71362b748b7f4b626a3ff24d4cd0fbe09b2`. Cloudflare build `f88c789f-91f5-47af-be72-e419689ff814` succeeded; deployment `17da08c4-42c5-422b-9d55-01bb3b5c0efe`, version `fa1a7869-30dc-433e-919d-c1c783d6afed`, 100%. All 12 production browser tests passed (3.6 minutes). Production screenshots for all nine themes were captured and reviewed. Theme foundations/public switching: PASS. Protected owner-save journey remains unverified; mocked concurrency/permission tests pass.

Approved security increment: the user explicitly approved the grant-only proposal. Supabase migration `protect_internal_progression_grants` applied successfully. Read-only postflight confirms both helpers inaccessible to anon/authenticated, direct progression writes blocked, reads/record_engagement/service-role access retained. Advisors no longer flag the two helpers: anonymous definer findings 27→25 and authenticated 30→28. No reward rows were created and no data removed; RLS and native contracts preserved. Real authenticated award journey remains unverified. See PROGRESSION-SECURITY-REVIEW.md for the exact SQL, evidence and emergency rollback. Other advisor findings are not marked resolved.

Quota follow-up: bounded Cloudflare analytics retry succeeded. The measured window reports 1,939 invocations, zero invocation errors and elevated p99 CPU in website/dg. See QUOTA.md. This supersedes the earlier temporary analytics blocker; complete storage/database/peak-capacity certification remains pending.

Security rollout: main commit `7ae65e0fc2cac39529f75a38f8c3617201b40dd1`; Cloudflare build `6425b135-5786-4b92-9c32-7cac9077bf41` succeeded, as did delayed automatic build `af15be81-d49d-4dd7-bee8-4191f09a86d2`. Latest verified deployment `ad40f535-fb5c-4733-9f22-59756981e89a`, version `afbdd0f9-0063-4e0a-bdd5-46a0648210a8`, serves 100%. Post-deployment desktop public-route and navigation checks passed.

## Browser reliability increment — portions of phases 12, 15, 17, 19, 28 and 31

The contact form previously displayed a success toast and discarded the message without delivering anything. It now prepares an encoded email draft for the existing project support address, explains the email-client step and retains the entered message. Browser tests intercept the draft URL; no email is sent. No new backend route, table or request is introduced.

Decorative cursor animation now runs only while a pointer spring is moving. It stops while idle, hidden, on coarse pointers, narrow screens and when reduced motion changes. Baseline idle measurement was 91 cursor animation callbacks in 1.5 seconds; the updated local test records zero idle callbacks. Optional feedback and install-prompt storage failures no longer crash rendering. Feedback initializes consistently during SSR, then reads browser preferences after hydration. PWA prompt timers and installation listeners are cleaned up, and withdrawn install eligibility is handled. Manifest colors match Royal Black; no offline capability is claimed.

WebKit uncovered locale-dependent release date text: server `22 Jun 2026` versus browser `Jun 22, 2026`. Mod details and changelog now share a deterministic UTC calendar formatter. The WebKit 22-route sweep and navigation test pass after the fix; a separate attempt failed with transient Supabase access-control network errors and is retained as a failed run, followed by a passing rerun. Firefox could not launch because the Windows executable reports an invalid side-by-side configuration; Firefox coverage is BLOCKED, not passed. No system runtime installation was performed.

Authenticated inspection using the owner's existing browser session: owner role/menu, profile form, rewards read state, achievements and rank ladder render. The new website appearance tab exposes nine themes, enabled/default controls, palette fields and explicit publish. Temporary Water preview applied, had no horizontal overflow, and End preview restored Royal Black. No appearance was published and no claim, key creation or profile save was submitted. Permission and stale-save behavior remain unit-tested, not certified by a production write.

Pre-release verification: TypeScript PASS, lint zero errors (12 Fast Refresh warnings), nine Node tests PASS, production build PASS. All 12 reliability tests pass across Chrome phone/tablet/desktop and WebKit iPhone emulation. Worker fixtures verify heartbeat remains stateless, invalid input is rejected without backend work, admin auth is enforced, tamper telemetry does not auto-ban and both canonical origins retain generator CORS. These offline checks do not replace an APK/device test.

Quota impact: no added recurring network or database operations. Cursor optimization reduces browser animation work; it does not establish a Worker CPU improvement. Protected inspection uses ordinary existing page reads. Full-route contrast, authenticated mutation journeys, physical-device/native tests, font provenance, database/storage usage, field performance and complete phases 08–36 remain PARTIAL or BLOCKED as applicable.

## Current safety boundary

The approved grant-only progression fix is applied; remaining authorization changes require their own dependency review and authorization. Do not exploit production weaknesses to test them. No real APK/device test is available in this session. No fake production accounts, comments, rewards or keys were created.
