-- Keep the statement-cached owner policies created in the previous migration;
-- these older table-specific policies had the same authenticated owner-only
-- USING and WITH CHECK predicates.
DROP POLICY IF EXISTS access_tokens_owner_all ON public.access_tokens;
DROP POLICY IF EXISTS activated_users_owner_all ON public.activated_users;
DROP POLICY IF EXISTS admin_logs_owner_all ON public.admin_logs;
DROP POLICY IF EXISTS app_config_owner_all ON public.app_config;
DROP POLICY IF EXISTS banned_devices_owner_all ON public.banned_devices;
DROP POLICY IF EXISTS gate_tokens_owner_all ON public.gate_tokens;
DROP POLICY IF EXISTS generation_logs_owner_all ON public.generation_logs;
DROP POLICY IF EXISTS honeypot_log_owner_all ON public.honeypot_log;
DROP POLICY IF EXISTS worker_init_rate_owner_all ON public.worker_init_rate;

-- The owner ALL policy already includes SELECT, so the separate owner-read
-- policy on avatar_pool was redundant.
DROP POLICY IF EXISTS avatar_pool_owner_read_all ON public.avatar_pool;
