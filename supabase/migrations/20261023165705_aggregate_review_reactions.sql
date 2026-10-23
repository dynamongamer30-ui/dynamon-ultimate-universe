-- Bounded read model; existing reaction rows, table grants and RLS are unchanged.
create function public.get_review_reaction_counts(p_comment_ids uuid[])
returns table(comment_id uuid, reaction text, total bigint, mine boolean)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_comment_ids is null or cardinality(p_comment_ids) > 10
    or exists(select 1 from unnest(p_comment_ids) id where id is null) then
    raise exception 'Invalid review selection' using errcode = '22023';
  end if;
  return query
    select r.comment_id, r.reaction, count(*),
      coalesce(bool_or(r.user_id = (select auth.uid())), false)
    from public.comment_reactions r
    where r.comment_id = any(p_comment_ids)
      and r.reaction in ('fire', 'water', 'thunder', 'leaf', 'spirit')
    group by r.comment_id, r.reaction
    order by r.comment_id, r.reaction;
end;
$$;
revoke execute on function public.get_review_reaction_counts(uuid[]) from public;
grant execute on function public.get_review_reaction_counts(uuid[]) to anon, authenticated, service_role;
