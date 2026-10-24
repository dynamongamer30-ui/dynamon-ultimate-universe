begin;
create policy subs_update_own on public.mod_subscribers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy subs_delete_own on public.mod_subscribers
  for delete to authenticated
  using ((select auth.uid()) = user_id);
commit;
