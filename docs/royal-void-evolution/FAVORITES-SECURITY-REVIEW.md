# Favorites SELECT policy review — 24 October 2026

Status: APPROVED AND APPLIED as migration 20261024040729. Production authorization requires explicit approval under master request section 33: “do not autonomously perform destructive or irreversible actions involving production data, secrets, authorization policies”. The explicit approval covers the one favorites SELECT definition below. The approved subscription policies and progression grants are separate completed actions.

## Verified pre-application production state

Project dfxcpxzylyycrirtnkof. Pre-application read-only catalog queries confirmed favorites had RLS enabled, anon/authenticated SELECT grants, authenticated INSERT/DELETE grants, own-user INSERT/DELETE policies and favorites_public_read FOR SELECT TO public USING (true). That pre-application state allowed raw favorite rows to be read across users, including by anon. A client user_id filter does not restrict a separately constructed request. No favorite record was read or changed during this review.

The existing stable SECURITY DEFINER has_role(_user_id uuid, _role app_role) is executable by authenticated. Existing mod_subscribers SELECT uses the same self-or-owner pattern. The owner dashboard at src/routes/admin.tsx reads an all-user favorites count, so owner visibility must be retained. Current personal consumers filter user_id; the shared collection, recommendations and engagement helpers remain compatible with the proposed visibility. mod_likes and every other table/function/grant are outside this approval.

## Exact approved and applied SQL

```sql
begin;
alter policy favorites_public_read on public.favorites
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'owner'::public.app_role)
  );
commit;
```

This alters the verified existing SELECT policy in place. Its legacy name remains to avoid a second authorization operation. Signed-out callers receive no rows through this policy; signed-in users retain their own favorites; verified owners retain all-row visibility for dashboard totals. The existing INSERT/DELETE ownership rules, grants, RLS, stored rows and server reward functions are unchanged. Service-role bypass behavior is unchanged. No new function, role or credential is introduced.

## Verification and application procedure

A local PGlite fixture executes this exact first SQL block against a synthetic copy of the original policy state. It proves original anonymous visibility, anonymous/other-user denial after alteration, own-row and owner visibility, own insert/delete with returned rows, cross-user insert/delete denial, unchanged non-SELECT policies and unchanged stored rows immediately after policy alteration. This is local policy-semantics evidence, not a production authenticated mutation test. The local test passes.

The approved execution follows that procedure: fresh metadata, official CLI migration creation, exact SQL application, alignment to actual server migration history, catalog/advisor verification and main publication/public checks. No real favorites are created/deleted for QA.

Emergency rollback requires a separate deliberate decision because it restores public visibility:

```sql
begin;
alter policy favorites_public_read on public.favorites to public using (true);
commit;
```

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [returned modified rows](https://supabase.com/docs/reference/javascript/using-modifiers-select), [request deadlines](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal), [automatic retries](https://supabase.com/docs/guides/api/automatic-retries-in-supabase-js). Current docs checked 24 October 2026. The changelog was reviewed earlier in this conversation on the same date; no new schema/API feature is introduced here.

Local verification: all 31 Node tests pass, including the new PGlite policy fixture. The pre-approval catalog review was read only; the approved ALTER POLICY was subsequently applied as recorded below.

Read-only security-advisor baseline is unchanged from the prior release: five [RLS/no-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), 25 [anonymous-callable definer findings](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), 28 [authenticated-callable definer findings](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and one [password-protection finding](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These do not certify the favorites access model, and this approved application changes none of those unrelated definitions.


## Approved favorites SELECT application — 24 October 2026

The user explicitly approved the exact reviewed favorites SELECT policy in reply to async question call_c4103e4718d04aed8e3e58e993d707a2. A fresh preflight matched all three reviewed favorites policy definitions, RLS/grants and the existing stable, authenticated-callable has_role signature. Official cached CLI 2.122.0 (version and migration-new help checked) created 20261024040709_favorites_select_self_or_owner.sql. Its body was copied from the review's first SQL block. Supabase apply_migration succeeded with the exact approved SQL and recorded actual server-history version 20261024040729. The uncommitted local filename was aligned to that server version; no timestamp was invented and no prior migration was edited.

The approved action is COMPLETE. Post-apply catalogs confirm favorites_public_read now targets only authenticated, with auth.uid() = user_id OR has_role(auth.uid(), owner). The two original own-user INSERT/DELETE definitions, SELECT/INSERT/DELETE grants and enabled RLS are unchanged. The legacy policy name remains as reviewed. A production transaction SET LOCAL ROLE anon and asserted that no favorites row was visible, then rolled back; the assertion completed without returning record contents or writing rows. The owner/self role matrix and returned-row writes are proven with synthetic local PGlite data, not real-user mutations.

Security advisors match the pre-change baseline exactly after excluding observed_at timestamps: counts 5/25/28/1 in the previously documented groups. No unrelated security-definer function, table policy, Auth setting or like-visibility rule was changed. The existing authorized browser session was reloaded after application; its own filtered favorites read finishes normally, shows no error alert and captures zero console errors. No favorite insert/delete, reward award or notification permission was used as a production test. The local policy fixture now also asserts that the migration file exactly matches the approved review SQL before executing it.

Earlier pending-approval statements above are historical and superseded by this application record. No approval remains pending for this SELECT definition. Migration publication and final live rollout checks follow; broader Phase 18 recommendation-query, real mutation, fresh OAuth and device work remain.


### Approved migration record and final public verification

Migration/documentation/test commit f9e2277b198f0d929c32884ffacd901fa4b702d2, tree 8fa045ee3be2d33fd93ce5f2be89bb122213a80b, is on main. Automatic Cloudflare build 61187da5-7dbf-4b41-bcf4-06ee0478a062 succeeded. Deployment 8c36240c-f879-402a-a291-8256b6ea762e, version a8274cb4-4a00-4e67-9c3e-2118baf8107a, serves 100%. All four fresh post-policy public favorites/bookmark-navigation checks pass in 31.5 seconds, with no private favorites/likes/profile/preferences reads, no Supabase writes and no runtime errors. The 31 Node tests pass after the fixture was changed to execute the actual migration and compare it to the exact approved SQL; final lint remains zero errors/12 existing warnings. The 40 intercepted browser checks remain the client mutation evidence and were not misrepresented as production policy tests.

The approved favorites privacy action is fully applied and verified; no approval remains pending for it. Broader Phase 18, real production favorite mutations, recommendation query/account-state review, fresh OAuth and actual device/APK checks remain outside this completed increment. Current live logs and public screenshots are retained as favorites-policy-live-public in the external audit directory.
