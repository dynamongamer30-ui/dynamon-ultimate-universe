import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) =>
  readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const base = await migration("20260629193148_3dc48fdd-e6dd-45b6-98c0-2be453c770a8");
const hardened = await migration("20261002094500_harden_engagement_rewards");
const validated = await migration("20261002095000_validate_engagement_targets");
function functionSql(sql, name) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.notEqual(start, -1, `Missing canonical function ${name}`);
  const end = sql.indexOf("$$;", start);
  assert.notEqual(end, -1, `Unterminated canonical function ${name}`);
  return sql.slice(start, end + 3);
}
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const db = new PGlite();

test.before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated;
  `);
  // Canonical XP/achievement schemas, grants, policies and public badge seed.
  await db.exec(base.slice(0, base.indexOf("-- FAVORITES")));
  await db.exec(`
    create table public.mod_overrides(slug text primary key);
    create table public.favorites(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    create table public.mod_likes(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    create table public.mod_ratings(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    insert into auth.users values ('${uuid(1)}'),('${uuid(2)}');
    insert into public.mod_overrides select 'mod-'||i from generate_series(1,6)i;
  `);
  // Load the actual ledger DDL, then unchanged deployed function bodies.
  await db.exec(hardened.slice(0, hardened.indexOf("CREATE OR REPLACE FUNCTION")));
  for (const name of ["award_xp_internal", "grant_achievement_internal"])
    await db.exec(functionSql(hardened, name));
  await db.exec(functionSql(validated, "record_engagement"));
  await db.exec(`
    revoke execute on function public.record_engagement(text,text) from public,anon;
    grant execute on function public.record_engagement(text,text) to authenticated;
  `);
  await db.exec(await migration("20261022184046_protect_internal_progression_grants"));
});
test.beforeEach(async () => {
  await db.exec(`reset role;
    truncate public.user_engagement_events,public.user_xp,public.user_achievements,
      public.favorites,public.mod_likes,public.mod_ratings;
    select set_config('request.jwt.claim.sub','',false);
  `);
});
test.after(async () => db.close());

async function caller(user, sql, params = [], role = "authenticated") {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}
async function action(event, user = uuid(1), mod = "mod-1") {
  const table = { favorite: "favorites", rating: "mod_ratings", mod_like: "mod_likes" }[event];
  await db.query(`insert into public.${table}(user_id,mod_slug) values($1,$2)`, [user, mod]);
}
async function record(event, mod = "mod-1", user = uuid(1)) {
  return caller(user, "select * from public.record_engagement($1,$2)", [event, mod]);
}
const snapshot = async () => ({
  xp: (await db.query("select user_id,xp,level from public.user_xp order by user_id")).rows,
  badges: (
    await db.query("select user_id,achievement_key from public.user_achievements order by 1,2")
  ).rows,
  events: (
    await db.query(
      "select user_id,event_key,target_key from public.user_engagement_events order by 1,2,3",
    )
  ).rows,
});

test("engagement harness executes the reviewed deployed function bodies", () => {
  for (const [name, source, hash] of [
    ["award_xp_internal", hardened, "e4c8856692a46f7718ebb389aa80e033"],
    ["grant_achievement_internal", hardened, "c28b1bd8e7b0e9f0ce06793a542d9b53"],
    ["record_engagement", validated, "a292243a2cb3bc3f807e34f1b4d5ec0a"],
  ]) {
    const body = functionSql(source, name).split("$$")[1].replace(/\s/g, "");
    assert.equal(createHash("md5").update(body).digest("hex"), hash, name);
  }
});

test("lost acknowledgement replay awards a committed favorite exactly once", async () => {
  await action("favorite");
  await record("favorite"); // Commit, then deliberately discard the acknowledgement.
  const before = await snapshot();
  for (let i = 0; i < 3; i++)
    assert.deepEqual(await record("favorite"), [
      { xp: 5, level: 1, leveled_up: false, awarded: false },
    ]);
  assert.deepEqual(await snapshot(), before);
  assert.equal(before.events.length, 1);
  assert.equal(before.xp[0].xp, 5);
});

test("durable own receipt remains readable after the underlying action is removed", async () => {
  await action("favorite");
  await record("favorite");
  await db.exec("delete from public.favorites");
  await assert.rejects(record("favorite"), /Favorite action not found/);
  const sql =
    "select event_key,target_key from public.user_engagement_events where user_id=$1 and event_key=$2 and target_key=$3";
  assert.deepEqual(await caller(uuid(1), sql, [uuid(1), "favorite", "mod-1"]), [
    { event_key: "favorite", target_key: "mod-1" },
  ]);
  assert.deepEqual(await caller(uuid(2), sql, [uuid(1), "favorite", "mod-1"]), []);
  await assert.rejects(
    caller(null, sql, [uuid(1), "favorite", "mod-1"], "anon"),
    (e) => e.code === "42501",
  );
});

test("favorite off/on toggles cannot farm a second reward", async () => {
  await action("favorite");
  await record("favorite");
  await db.exec("delete from public.favorites");
  await action("favorite");
  assert.equal((await record("favorite"))[0].awarded, false);
  assert.equal((await snapshot()).xp[0].xp, 5);
});

test("different event keys and accounts have independent durable identities", async () => {
  await action("favorite");
  await action("rating");
  await action("favorite", uuid(2));
  await record("favorite");
  await record("rating");
  await record("favorite", "mod-1", uuid(2));
  const result = await snapshot();
  assert.equal(result.events.length, 3);
  // The canonical seed has no first_review badge; do not invent a bonus.
  assert.deepEqual(result.xp, [
    { user_id: uuid(1), xp: 20, level: 1 },
    { user_id: uuid(2), xp: 5, level: 1 },
  ]);
  assert.deepEqual(result.badges, []);
});

test("catalog validation, real action and caller identity precede any reward write", async () => {
  await action("favorite", uuid(2));
  for (const [event, target, error] of [
    ["favorite", "unknown", /Unknown mod target/],
    ["favorite", "mod-1", /Favorite action not found/],
    ["rating", "mod-1", /Rating action not found/],
    ["mod_like", "mod-1", /Like action not found/],
    ["download", "mod-1", /Unsupported engagement event/],
    ["favorite", " ", /Engagement target is required/],
    ["favorite", null, /Engagement target is required/],
  ])
    await assert.rejects(record(event, target), error);
  await assert.rejects(record("favorite", "mod-1", null), /Not authenticated/);
  await assert.rejects(record(null), (e) => e.code === "23502");
  assert.deepEqual(await snapshot(), { xp: [], badges: [], events: [] });
});

test("badge bonus is atomic with its event but the RPC returns pre-bonus XP", async () => {
  await action("mod_like");
  assert.deepEqual(await record("mod_like"), [
    { xp: 2, level: 1, leveled_up: false, awarded: true },
  ]);
  const result = await snapshot();
  assert.equal(result.xp[0].xp, 27);
  assert.deepEqual(result.badges, [{ user_id: uuid(1), achievement_key: "first_like" }]);
  assert.deepEqual(await record("mod_like"), [
    { xp: 27, level: 1, leveled_up: false, awarded: false },
  ]);
  await action("mod_like", uuid(1), "mod-2");
  await record("mod_like", "mod-2");
  assert.equal((await snapshot()).xp[0].xp, 29);
  assert.equal((await snapshot()).badges.length, 1);
});

test("collector bonus is granted once across five eligible favorites and replay", async () => {
  for (let i = 1; i <= 5; i++) await action("favorite", uuid(1), `mod-${i}`);
  for (let i = 1; i <= 5; i++) await record("favorite", `mod-${i}`);
  const before = await snapshot();
  assert.equal(before.xp[0].xp, 125);
  assert.equal(before.xp[0].level, 2);
  assert.deepEqual(before.badges, [{ user_id: uuid(1), achievement_key: "collector" }]);
  await record("favorite", "mod-5");
  assert.deepEqual(await snapshot(), before);
});

test("a forced badge failure rolls back event, base XP and badge in one statement", async () => {
  await action("mod_like");
  await db.exec(
    `alter table public.user_achievements add constraint fixture_reject_badge check (achievement_key <> 'first_like')`,
  );
  try {
    await assert.rejects(record("mod_like"), (e) => e.code === "23514");
    assert.deepEqual(await snapshot(), { xp: [], badges: [], events: [] });
  } finally {
    await db.exec("alter table public.user_achievements drop constraint fixture_reject_badge");
  }
  assert.equal((await record("mod_like"))[0].awarded, true);
  assert.equal((await snapshot()).xp[0].xp, 27);
});

test("outer transaction rollback also removes the engagement receipt", async () => {
  await action("favorite");
  await db.exec("begin");
  try {
    assert.equal((await record("favorite"))[0].awarded, true);
  } finally {
    await db.exec("rollback");
  }
  assert.deepEqual(await snapshot(), { xp: [], badges: [], events: [] });
  assert.equal((await record("favorite"))[0].awarded, true);
});

test("backfilled historical events prevent fresh awards without fabricating XP", async () => {
  await action("favorite");
  await db.exec(await migration("20261002096000_backfill_engagement_events"));
  assert.deepEqual(await record("favorite"), [
    { xp: 0, level: 1, leveled_up: false, awarded: false },
  ]);
  assert.deepEqual((await snapshot()).xp, []);
  assert.equal((await snapshot()).events.length, 1);
});

test("authenticated clients cannot bypass the record function to edit XP or badges", async () => {
  for (const sql of [
    `select * from public.award_xp_internal('${uuid(1)}',99999)`,
    `select public.grant_achievement_internal('${uuid(1)}','collector')`,
    `insert into public.user_xp(user_id,xp) values('${uuid(1)}',99999)`,
    `update public.user_xp set xp=99999 where user_id='${uuid(1)}'`,
    `delete from public.user_achievements where user_id='${uuid(1)}'`,
    `insert into public.user_engagement_events(user_id,event_key,target_key) values('${uuid(1)}','favorite','mod-1')`,
    "delete from public.user_engagement_events",
  ])
    await assert.rejects(caller(uuid(1), sql), (e) => e.code === "42501");
  await assert.rejects(
    caller(null, "select * from public.record_engagement('favorite','mod-1')", [], "anon"),
    (e) => e.code === "42501",
  );
  assert.deepEqual(await snapshot(), { xp: [], badges: [], events: [] });
});
