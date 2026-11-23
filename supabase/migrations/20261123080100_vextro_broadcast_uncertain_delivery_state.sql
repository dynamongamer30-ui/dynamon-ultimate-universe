alter table public.vextro_broadcast_recipients
  drop constraint if exists vextro_broadcast_recipients_status_check;
alter table public.vextro_broadcast_recipients
  add constraint vextro_broadcast_recipients_status_check
  check (status = any (array['pending','sending','sent','failed','uncertain']::text[]));
create index if not exists vextro_broadcast_recipients_job_status_idx
  on public.vextro_broadcast_recipients(job_id,status,attempts,next_attempt_at);
