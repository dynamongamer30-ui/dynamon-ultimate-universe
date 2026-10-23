-- Read-only website APIs. Existing table grants, RLS, records and award paths
-- remain unchanged. Each function runs as its caller, never as its creator.
create function public.get_review_page(p_slug text, p_page integer default 0)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_slug is null or char_length(p_slug) not between 1 and 200 or p_page is null or p_page < 0 then
    raise exception 'Invalid review page' using errcode = '22023';
  end if;
  return (
    with mod_comments as materialized (
      select c.id, c.parent_id from public.comments c where c.mod_slug = p_slug
    ), like_counts as materialized (
      select l.comment_id, count(*) as total,
        bool_or(l.user_id = (select auth.uid())) as mine
      from public.comment_likes l join mod_comments c on c.id = l.comment_id
      group by l.comment_id
    ), roots as materialized (
      select c.id, c.created_at, coalesce(p.is_owner, false) as owner,
        coalesce(l.total, 0) as likes
      from public.comments c
      left join public.public_profiles p on p.id = c.user_id
      left join like_counts l on l.comment_id = c.id
      where c.mod_slug = p_slug and c.parent_id is null and btrim(c.body) <> ''
    ), meta as (
      select count(*) as total,
        least(p_page::bigint, greatest((count(*) - 1) / 10, 0)) as page from roots
    ), selected as materialized (
      select r.*, row_number() over (
        order by r.owner desc, case when r.owner then 0 else r.likes end desc,
          r.created_at desc, r.id desc
      ) as position
      from roots r
      order by r.owner desc, case when r.owner then 0 else r.likes end desc,
        r.created_at desc, r.id desc
      limit 10 offset (select page * 10 from meta)
    ), previews as materialized (
      select child.id from selected s cross join lateral (
        select c.id from public.comments c
        where c.parent_id = s.id and c.mod_slug = p_slug
        order by c.created_at, c.id limit 5
      ) child
    ), decorated as materialized (
      select c.id, c.mod_slug, c.user_id, c.body, c.created_at, c.parent_id,
        case when p.id is null then null else jsonb_build_object(
          'id', p.id, 'username', p.username, 'display_name', p.display_name,
          'avatar_url', p.avatar_url, 'custom_avatar_url', p.custom_avatar_url,
          'is_owner', p.is_owner
        ) end as author,
        coalesce(l.total, 0) as "likeCount", coalesce(l.mine, false) as "likedByMe"
      from public.comments c
      left join public.public_profiles p on p.id = c.user_id
      left join like_counts l on l.comment_id = c.id
      where c.id in (select id from selected union all select id from previews)
    )
    select jsonb_build_object(
      'page', (select page from meta), 'totalThreads', (select total from meta),
      'reviewLikeCount', (select coalesce(sum(total), 0) from like_counts),
      'ratingCount', (select count(*) from public.mod_ratings r where r.mod_slug = p_slug),
      'ratingSum', (select coalesce(sum(r.rating), 0) from public.mod_ratings r where r.mod_slug = p_slug),
      'threads', coalesce((
        select jsonb_agg(to_jsonb(d) || jsonb_build_object(
          'replyCount', (select count(*) from public.comments c where c.parent_id = s.id and c.mod_slug = p_slug),
          'replies', coalesce((select jsonb_agg(to_jsonb(reply) order by reply.created_at, reply.id)
            from decorated reply where reply.parent_id = s.id), '[]'::jsonb)
        ) order by s.position)
        from selected s join decorated d on d.id = s.id
      ), '[]'::jsonb)
    )
  );
end;
$$;

create function public.get_review_replies(
  p_parent uuid, p_after_time timestamptz default null, p_after_id uuid default null
)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_parent is null or (p_after_time is null) <> (p_after_id is null) then
    raise exception 'Invalid reply cursor' using errcode = '22023';
  end if;
  return (
    with root as (
      select c.id, c.mod_slug from public.comments c where c.id = p_parent and c.parent_id is null
    ), replies as materialized (
      select c.id, c.mod_slug, c.user_id, c.body, c.created_at, c.parent_id
      from public.comments c join root r on c.parent_id = r.id and c.mod_slug = r.mod_slug
    ), selected as materialized (
      select * from replies c
      where p_after_time is null or (c.created_at, c.id) > (p_after_time, p_after_id)
      order by c.created_at, c.id limit 5
    ), decorated as (
      select c.id, c.mod_slug, c.user_id, c.body, c.created_at, c.parent_id,
        case when p.id is null then null else jsonb_build_object(
          'id', p.id, 'username', p.username, 'display_name', p.display_name,
          'avatar_url', p.avatar_url, 'custom_avatar_url', p.custom_avatar_url,
          'is_owner', p.is_owner
        ) end as author,
        (select count(*) from public.comment_likes l where l.comment_id = c.id) as "likeCount",
        exists(select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = (select auth.uid())) as "likedByMe"
      from selected c left join public.public_profiles p on p.id = c.user_id
    )
    select jsonb_build_object(
      'total', (select count(*) from replies),
      'replies', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at, d.id) from decorated d), '[]'::jsonb),
      'hasMore', exists(select 1 from replies c where (c.created_at, c.id) >
        (select s.created_at, s.id from selected s order by s.created_at desc, s.id desc limit 1))
    )
  );
end;
$$;

create function public.get_public_mod_stats(p_slugs text[])
returns table(mod_slug text, like_count bigint, rating_count bigint, rating_sum bigint)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_slugs is null or cardinality(p_slugs) > 100 or exists(
    select 1 from unnest(p_slugs) s where s is null or char_length(s) not between 1 and 200
  ) then
    raise exception 'Invalid mod selection' using errcode = '22023';
  end if;
  return query
    select s.slug,
      (select count(*) from public.mod_likes l where l.mod_slug = s.slug),
      (select count(*) from public.mod_ratings r where r.mod_slug = s.slug),
      (select coalesce(sum(r.rating), 0) from public.mod_ratings r where r.mod_slug = s.slug)
    from (select distinct unnest(p_slugs) as slug) s order by s.slug;
end;
$$;

-- Narrow only these new function endpoints; do not alter any existing grants.
revoke execute on function public.get_review_page(text, integer) from public;
revoke execute on function public.get_review_replies(uuid, timestamptz, uuid) from public;
revoke execute on function public.get_public_mod_stats(text[]) from public;
grant execute on function public.get_review_page(text, integer) to anon, authenticated, service_role;
grant execute on function public.get_review_replies(uuid, timestamptz, uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_mod_stats(text[]) to anon, authenticated, service_role;
