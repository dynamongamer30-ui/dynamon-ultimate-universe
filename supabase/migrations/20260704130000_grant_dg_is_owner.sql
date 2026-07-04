-- The frontend calls dg_is_owner() directly via RPC (owner checks, admin panels).
-- The earlier harden migration wrongly revoked it, causing
-- "permission denied for function dg_is_owner". Grant execute back.
grant execute on function public.dg_is_owner() to authenticated;
