import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("reviewed stats execute grant keeps anonymous access denied and owner-only results", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table profiles(is_owner boolean,last_active timestamptz);
      insert into profiles values(true,now()),(false,now()),(false,now()-interval '40 days');
      create function dg_is_owner() returns boolean language sql as $$select current_setting('fixture.owner',true)='yes'$$;
      create function admin_account_stats() returns table(total_users bigint,inactive_30d bigint)
      language sql security definer set search_path=public as $$
        select (select count(*) from profiles),
          (select count(*) from profiles where is_owner=false and greatest(coalesce(last_active,'epoch'::timestamptz),'epoch'::timestamptz)<now()-interval '30 days')
        where public.dg_is_owner();$$;
      revoke execute on function admin_account_stats() from public,anon,authenticated;`);
    const before = (
      await db.query(
        "select pg_get_functiondef('public.admin_account_stats()'::regprocedure) as definition",
      )
    ).rows[0].definition;
    await db.exec("GRANT EXECUTE ON FUNCTION public.admin_account_stats() TO authenticated;");
    assert.equal(
      (
        await db.query(
          "select has_function_privilege('anon','public.admin_account_stats()','execute') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.admin_account_stats()"),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated; set fixture.owner='no'");
    assert.equal((await db.query("select * from public.admin_account_stats()")).rows.length, 0);
    await db.exec("set fixture.owner='yes'");
    const owner = (await db.query("select * from public.admin_account_stats()")).rows[0];
    assert.equal(Number(owner.total_users), 3);
    assert.equal(Number(owner.inactive_30d), 1);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select pg_get_functiondef('public.admin_account_stats()'::regprocedure) as definition",
        )
      ).rows[0].definition,
      before,
    );
    assert.equal(Number((await db.query("select count(*) from profiles")).rows[0].count), 3);
  } finally {
    await db.close();
  }
});
