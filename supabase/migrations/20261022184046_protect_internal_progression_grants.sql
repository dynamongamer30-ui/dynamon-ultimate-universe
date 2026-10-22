-- Approved grant-only remediation. Preserve records, RLS, service access and server awards.
begin;

revoke execute on function public.award_xp_internal(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.grant_achievement_internal(uuid, text)
  from public, anon, authenticated;
revoke insert, update, delete, truncate
  on public.user_xp, public.user_achievements
  from anon, authenticated;

commit;
