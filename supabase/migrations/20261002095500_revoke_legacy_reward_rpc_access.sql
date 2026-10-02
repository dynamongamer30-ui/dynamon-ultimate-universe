-- The legacy reward RPCs accepted client-controlled values. They are no
-- longer part of the client contract and must not be callable by end users.
REVOKE EXECUTE ON FUNCTION public.award_xp(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_achievement(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_engagement(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_engagement(text, text) TO authenticated;
