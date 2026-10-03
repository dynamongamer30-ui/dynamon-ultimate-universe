-- One-time compensation: give exactly one active Phoenix Pass to every
-- authenticated account that has never had a Phoenix Pass record.
-- Re-running this migration is safe: accounts with any existing pass are skipped.

do $$
declare
  account_row record;
  new_pass_id uuid;
begin
  for account_row in
    select u.id
      from auth.users u
     where not exists (
       select 1
         from public.phoenix_passes p
        where p.user_id = u.id
     )
  loop
    insert into public.phoenix_passes (
      user_id,
      claimed,
      claimed_at,
      claim_deadline,
      expires_at,
      grant_kind
    ) values (
      account_row.id,
      true,
      now(),
      now(),
      now() + interval '30 days',
      'compensation_zero_pass'
    )
    returning id into new_pass_id;

    insert into public.notifications (
      title,
      body,
      target_user_id,
      reward_kind,
      reward_ref
    ) values (
      'You received a Phoenix Pass!',
      'We added one Phoenix Pass to your account as compensation. Use it on any mod download within 30 days.',
      account_row.id,
      'phoenix_pass',
      new_pass_id::text
    );
  end loop;
end;
$$;
