alter table public.vextro_broadcast_jobs
  add column if not exists format text not null default 'plain';
alter table public.vextro_broadcast_jobs drop constraint if exists vextro_broadcast_jobs_format_check;
alter table public.vextro_broadcast_jobs add constraint vextro_broadcast_jobs_format_check
  check (format in ('plain','HTML','MarkdownV2'));
