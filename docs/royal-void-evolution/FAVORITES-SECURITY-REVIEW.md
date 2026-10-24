# Favorites SELECT policy review — 24 October 2026

Status: PREPARED, NOT APPLIED. Production authorization requires explicit approval under master request section 33: “do not autonomously perform destructive or irreversible actions involving production data, secrets, authorization policies”. This request is for the one favorites SELECT definition below. The approved subscription policies and progression grants are separate completed actions.

## Verified production state

Project dfxcpxzylyycrirtnkof. Read-only catalog queries confirm favorites has RLS enabled, anon/authenticated SELECT grants, authenticated INSERT/DELETE grants, own-user INSERT/DELETE policies and favorites_public_read FOR SELECT TO public USING (true). Thus the database presently allows raw favorite rows to be read across users, including by anon. A client user_id filter does not restrict a separately constructed request. No favorite record was read or changed during this review.

The existing stable SECURITY DEFINER has_role(_user_id uuid, _role app_role) is executable by authenticated. Existing mod_subscribers SELECT uses the same self-or-owner pattern. The owner dashboard at src/routes/admin.tsx reads an all-user favorites count, so owner visibility must be retained. Current personal consumers filter user_id; the shared collection, recommendations and engagement helpers remain compatible with the proposed visibility. mod_likes and every other table/function/grant are outside this approval.

## Exact proposed SQL

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

## Verification and application plan

A local PGlite fixture executes this exact first SQL block against a synthetic copy of the original policy state. It proves original anonymous visibility, anonymous/other-user denial after alteration, own-row and owner visibility, own insert/delete with returned rows, cross-user insert/delete denial, unchanged non-SELECT policies and unchanged stored rows immediately after policy alteration. This is local policy-semantics evidence, not a production authenticated mutation test. Results follow below.

After approval: refresh policy/grant/function metadata, use the official CLI migration-new command to create the migration file, apply the exact approved SQL with Supabase apply_migration, align the uncommitted filename with actual server migration history if needed, verify catalogs/advisors, publish the migration record to main and run live public checks. Do not create/delete real favorites for QA.

Emergency rollback requires a separate deliberate decision because it restores public visibility:

```sql
begin;
alter policy favorites_public_read on public.favorites to public using (true);
commit;
```

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [returned modified rows](https://supabase.com/docs/reference/javascript/using-modifiers-select), [request deadlines](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal), [automatic retries](https://supabase.com/docs/guides/api/automatic-retries-in-supabase-js). Current docs checked 24 October 2026. The changelog was reviewed earlier in this conversation on the same date; no new schema/API feature is introduced here.

Local verification: all 31 Node tests pass, including the new PGlite policy fixture. Production catalogs were read only; the proposed ALTER POLICY has not run on production.

Read-only security-advisor baseline is unchanged from the prior release: five [RLS/no-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), 25 [anonymous-callable definer findings](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), 28 [authenticated-callable definer findings](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and one [password-protection finding](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These do not certify the favorites access model, and this proposed approval changes none of those unrelated definitions.
