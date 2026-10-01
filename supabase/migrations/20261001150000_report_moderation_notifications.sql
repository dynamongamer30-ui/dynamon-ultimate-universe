-- Phase 3: make moderation reports visible to the owner and notify the owner.
-- The report INSERT path already exists; this migration repairs the missing
-- owner read/update policies and adds the moderation notification automation.

DROP POLICY IF EXISTS "reports_select_own_or_owner" ON public.reports;
CREATE POLICY "reports_select_own_or_owner" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_owner_user(auth.uid()));

DROP POLICY IF EXISTS "reports_update_owner" ON public.reports;
CREATE POLICY "reports_update_owner" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_owner_user(auth.uid()))
  WITH CHECK (public.is_owner_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_owner_of_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_label text;
  detail_suffix text;
BEGIN
  SELECT coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'A trainer')
    INTO reporter_label
    FROM public.profiles
   WHERE id = NEW.reporter_id;

  detail_suffix := CASE
    WHEN nullif(trim(coalesce(NEW.details, '')), '') IS NULL THEN ''
    ELSE ' — ' || left(regexp_replace(trim(NEW.details), '\s+', ' ', 'g'), 240)
  END;

  INSERT INTO public.notifications (title, body, target_user_id)
  SELECT
    'New report received',
    format('%s reported a %s: %s%s', coalesce(reporter_label, 'A trainer'), NEW.target_type, NEW.reason, detail_suffix),
    p.id
  FROM public.profiles p
  WHERE p.is_owner = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_of_report ON public.reports;
CREATE TRIGGER trg_notify_owner_of_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_of_report();
