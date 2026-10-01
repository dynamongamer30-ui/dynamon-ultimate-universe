-- Backfill recent open reports created before the report notification trigger.
INSERT INTO public.notifications (title, body, target_user_id)
SELECT
  'New report received',
  format(
    '%s reported a %s: %s%s',
    coalesce(nullif(trim(reporter.display_name), ''), nullif(trim(reporter.username), ''), 'A trainer'),
    r.target_type,
    r.reason,
    CASE
      WHEN nullif(trim(coalesce(r.details, '')), '') IS NULL THEN ''
      ELSE ' — ' || left(regexp_replace(trim(r.details), '\s+', ' ', 'g'), 240)
    END
  ),
  owner.id
FROM public.reports r
LEFT JOIN public.profiles reporter ON reporter.id = r.reporter_id
JOIN public.profiles owner ON owner.is_owner = true
WHERE r.status = 'open'
  AND r.created_at >= now() - interval '24 hours';
