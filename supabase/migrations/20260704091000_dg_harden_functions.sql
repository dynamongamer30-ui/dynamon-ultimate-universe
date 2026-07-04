-- Hardening pass for the DG backend functions (addresses Supabase security advisors).

-- Pin search_path on the two flagged helper functions.
alter function public.dg_owner_email() set search_path = public;
alter function public.dg_touch_updated_at() set search_path = public;

-- Trigger functions must NOT be callable over the REST API. They still fire
-- from their triggers (which run as the definer), so revoking EXECUTE from the
-- API roles closes the exposed /rpc/ surface without breaking the triggers.
revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.dg_mark_owner_profile() from anon, authenticated, public;
revoke all on function public.dg_touch_updated_at() from anon, authenticated, public;

-- dg_is_owner is an internal RLS helper; only the DB engine needs it during
-- policy evaluation. Remove the public/REST execute grant.
revoke all on function public.dg_is_owner() from anon, authenticated, public;
