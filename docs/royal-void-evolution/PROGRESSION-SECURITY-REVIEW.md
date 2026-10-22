# Progression authorization: proposed grant-only remediation

Status: APPROVED AND APPLIED on 23 October 2026 (Asia/Kolkata). The user explicitly approved this grant-only proposal in chat. Source: `supabase/migrations/20261022184046_protect_internal_progression_grants.sql`. Supabase apply_migration returned success. No account, XP, achievement or reward row was changed to test the exposure.

## Confirmed evidence

Live advisor findings and pg_proc definitions show `public.award_xp_internal(uuid, integer)` accepts an arbitrary target and amount and writes as the function owner without a caller check. `public.grant_achievement_internal(uuid, text)` similarly awards to an arbitrary target and calls the XP helper. Both have broad execution privileges. Independently, own-row INSERT/UPDATE policies and client table grants allow direct progression writes. Table RLS alone does not ensure server-authoritative rewards.

Dependency review: the live function catalog shows record_engagement and grant_achievement_internal call these helpers; both are SECURITY DEFINER owned by postgres. Their owner can continue calling the helpers after revoking PUBLIC/anon/authenticated execution. The website's current useGamification reads user_xp/user_achievements and awards through record_engagement; no direct writes to these tables were found in current website source. Service-role grants are not revoked. APK licensing/configuration tables and all Worker contracts are outside this change. Remaining uncertainty: unknown external/legacy clients and real authenticated reward journeys have not been exercised.

## Candidate migration

Applied after the final live owner/dependency recheck confirmed both helpers and record_engagement are SECURITY DEFINER owned by postgres. Do not rerun this document automatically.

```sql
begin;
revoke execute on function public.award_xp_internal(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.grant_achievement_internal(uuid, text)
  from public, anon, authenticated;
revoke insert, update, delete, truncate
  on public.user_xp, public.user_achievements
  from anon, authenticated;
commit;
```

This preserves SELECT, all records, account identities, table definitions, RLS policies, service access and authorized SECURITY DEFINER entry points. It does not attempt to resolve every advisor finding or change default privileges globally. Own-row RLS policies remain in place, but revoked table privileges prevent using them for direct writes.

## Read-only postflight

```sql
select
  has_function_privilege('anon', 'public.award_xp_internal(uuid,integer)', 'EXECUTE') as anon_xp,
  has_function_privilege('authenticated', 'public.grant_achievement_internal(uuid,text)', 'EXECUTE') as user_achievement,
  has_table_privilege('authenticated', 'public.user_xp', 'UPDATE') as direct_xp_update,
  has_table_privilege('authenticated', 'public.user_achievements', 'INSERT') as direct_achievement,
  has_function_privilege('postgres', 'public.award_xp_internal(uuid,integer)', 'EXECUTE') as owner_xp;
```

Observed postflight: anon/authenticated execution on both helpers false; authenticated direct XP UPDATE and achievement INSERT false; anon TRUNCATE false; postgres helper execution true; authenticated record_engagement execution true; authenticated XP SELECT true; service_role XP UPDATE true. Ordinary/server access remains. Real signed-in reward/claim journeys still require an authorized account; no test rewards were created. Privilege verification is not a functional reward-journey pass.

## Emergency rollback

The following restores the broad pre-change grants, including the original exposure. Use only if needed to restore a proven legitimate dependency, then investigate urgently. It does not restore or alter data because the proposed migration does not change data.

```sql
begin;
grant execute on function public.award_xp_internal(uuid, integer)
  to public, anon, authenticated;
grant execute on function public.grant_achievement_internal(uuid, text)
  to public, anon, authenticated;
grant insert, update, delete, truncate
  on public.user_xp, public.user_achievements
  to anon, authenticated;
commit;
```

See [Supabase function security](https://supabase.com/docs/guides/database/functions) and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). The document is a reviewable proposal, not a statement that migration or authenticated testing has occurred.
