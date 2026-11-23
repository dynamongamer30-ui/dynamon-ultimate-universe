alter table public.dgbot_posts drop constraint if exists dgbot_posts_state_check;
alter table public.dgbot_posts add constraint dgbot_posts_state_check
  check (state = any (array['draft'::text,'publishing'::text,'published'::text,'removed'::text]));