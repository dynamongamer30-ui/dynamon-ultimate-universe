alter table public.vextro_update_approvals drop constraint if exists vextro_update_approvals_status_check;
alter table public.vextro_update_approvals add constraint vextro_update_approvals_status_check
check (status in ('approved','deploy_requested','validated','validation_failed','rollback_requested'));
