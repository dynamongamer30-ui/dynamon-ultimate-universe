import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("reviewed cleanup grant restriction preserves data, function body and server execution", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.valid_keys(id text primary key, expired boolean);
      insert into public.valid_keys values ('LOCAL-FIXTURE',false);
      create function public.cleanup_valid_keys() returns void language plpgsql security definer set search_path=public as $$begin delete from public.valid_keys where expired; end;$$;`);
    const before = (
      await db.query(
        "select pg_get_functiondef('public.cleanup_valid_keys()'::regprocedure) as definition",
      )
    ).rows[0].definition;
    await db.exec(`REVOKE EXECUTE ON FUNCTION public.cleanup_valid_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_valid_keys() TO service_role;`);
    const result = (
      await db.query(`select has_function_privilege('anon','public.cleanup_valid_keys()','execute') as anonymous,
      has_function_privilege('authenticated','public.cleanup_valid_keys()','execute') as signed_in,
      has_function_privilege('service_role','public.cleanup_valid_keys()','execute') as server,
      has_function_privilege('postgres','public.cleanup_valid_keys()','execute') as scheduler`)
    ).rows[0];
    assert.deepEqual(result, { anonymous: false, signed_in: false, server: true, scheduler: true });
    assert.equal(
      (
        await db.query(
          "select pg_get_functiondef('public.cleanup_valid_keys()'::regprocedure) as definition",
        )
      ).rows[0].definition,
      before,
    );
    assert.equal(
      (await db.query("select count(*)::int as total from public.valid_keys")).rows[0].total,
      1,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select public.cleanup_valid_keys()"), /permission denied/);
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
