-- VEXTRO runtime data is accessed only by the trusted bot server using service_role.
-- RLS remains enabled as defense in depth; anon/authenticated receive no direct table privileges.
-- Do not change schema-wide default privileges here because they also affect website tables.
revoke all privileges on table
  public.vextro_broadcast_jobs,
  public.vextro_broadcast_recipients,
  public.vextro_scheduled_posts,
  public.vextro_backup_artifacts,
  public.vextro_runtime_settings,
  public.vextro_moderation_events,
  public.vextro_update_approvals
from anon, authenticated;
