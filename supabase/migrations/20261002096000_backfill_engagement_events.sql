-- Existing actions must not become newly rewardable after the ledger was added.
INSERT INTO public.user_engagement_events (user_id, event_key, target_key)
SELECT user_id, 'rating', mod_slug FROM public.mod_ratings
ON CONFLICT (user_id, event_key, target_key) DO NOTHING;
INSERT INTO public.user_engagement_events (user_id, event_key, target_key)
SELECT user_id, 'mod_like', mod_slug FROM public.mod_likes
ON CONFLICT (user_id, event_key, target_key) DO NOTHING;
INSERT INTO public.user_engagement_events (user_id, event_key, target_key)
SELECT user_id, 'favorite', mod_slug FROM public.favorites
ON CONFLICT (user_id, event_key, target_key) DO NOTHING;
