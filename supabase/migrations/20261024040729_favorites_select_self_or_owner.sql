begin;
alter policy favorites_public_read on public.favorites
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'owner'::public.app_role)
  );
commit;
