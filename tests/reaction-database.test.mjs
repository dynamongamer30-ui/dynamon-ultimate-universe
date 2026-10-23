import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
const db = new PGlite();
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
await db.exec(`create role anon;create role authenticated;create role service_role;create role unrelated;
create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated,service_role;
create table public.comment_reactions(comment_id uuid,user_id uuid,reaction text check(reaction in ('fire','water','thunder','leaf','spirit')),primary key(comment_id,user_id,reaction));
alter table public.comment_reactions enable row level security;
create policy anon_read on public.comment_reactions for select to anon using (user_id <> '00000000-0000-4000-8000-000000001001');
create policy authenticated_read on public.comment_reactions for select to authenticated using(true);
grant select on public.comment_reactions to anon,authenticated,service_role;`);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261023165705_aggregate_review_reactions.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.query(
  "insert into public.comment_reactions select $1::uuid,('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'fire' from generate_series(1000,2204)i",
  [uuid(1)],
);
await db.query("insert into public.comment_reactions values ($1,$3,'water'),($2,$3,'spirit')", [
  uuid(1),
  uuid(2),
  uuid(1000),
]);
const counts = async (ids) =>
  (await db.query("select * from public.get_review_reaction_counts($1)", [ids])).rows;
await db.exec("set role anon");
test("reaction totals exceed REST limits while excluding voters and unrelated reviews", async () => {
  const result = await counts([uuid(1), uuid(1)]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { comment_id: uuid(1), reaction: "fire", total: 1204, mine: false });
  assert.deepEqual(Object.keys(result[0]).sort(), ["comment_id", "mine", "reaction", "total"]);
  assert.deepEqual(await counts([]), []);
  assert.deepEqual(await counts([uuid(99)]), []);
});
test("reaction counts respect caller identity and RLS", async () => {
  await db.exec("reset role;set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uuid(1000)]);
  const result = await counts([uuid(1)]);
  assert.equal(result[0].total, 1205);
  assert.equal(result[0].mine, true);
  assert.equal(result[1].mine, true);
  await db.exec("reset role;revoke select on public.comment_reactions from anon;set role anon");
  await assert.rejects(counts([uuid(1)]), (e) => e.code === "42501");
  await db.exec("reset role;grant select on public.comment_reactions to anon;set role unrelated");
  await assert.rejects(counts([uuid(1)]), (e) => e.code === "42501");
  await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");
});
test("reaction API bounds requests and returns at most fifty aggregate groups", async () => {
  for (const ids of [null, Array(11).fill(uuid(1)), [null]])
    await assert.rejects(counts(ids), (e) => e.code === "22023");
  await db.exec("reset role");
  for (let n = 10; n < 20; n++)
    await db.query(
      "insert into public.comment_reactions select $1::uuid,$2::uuid,unnest(array['fire','water','thunder','leaf','spirit'])",
      [uuid(n), uuid(1000)],
    );
  await db.exec("set role anon");
  assert.equal((await counts(Array.from({ length: 10 }, (_, i) => uuid(i + 10)))).length, 50);
});
test.after(async () => {
  await db.close();
});
