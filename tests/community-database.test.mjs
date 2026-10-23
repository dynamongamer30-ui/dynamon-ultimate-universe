import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role; create role unrelated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create table public.profiles(id uuid primary key, username text, display_name text, avatar_url text, custom_avatar_url text, is_owner boolean, private_email text);
create view public.public_profiles with (security_invoker=true) as select id,username,display_name,avatar_url,custom_avatar_url,is_owner from public.profiles;
create table public.comments(id uuid primary key, mod_slug text, user_id uuid, body text, created_at timestamptz, parent_id uuid references public.comments(id) on delete cascade);
create index comments_mod_idx on public.comments(mod_slug,created_at desc);
create index comments_parent_idx on public.comments(parent_id);
create table public.comment_likes(comment_id uuid references public.comments(id) on delete cascade,user_id uuid, primary key(comment_id,user_id));
create table public.mod_ratings(id uuid primary key, mod_slug text,user_id uuid,rating integer,created_at timestamptz);
create index mod_ratings_mod_idx on public.mod_ratings(mod_slug,created_at desc);
create table public.mod_likes(mod_slug text,user_id uuid,primary key(mod_slug,user_id));
grant select on public.profiles,public.public_profiles,public.comments,public.comment_likes,public.mod_ratings,public.mod_likes to anon,authenticated,service_role;
alter table public.comments enable row level security;
create policy anon_read on public.comments for select to anon using (body <> 'hidden from anon');
create policy authenticated_read on public.comments for select to authenticated using (true);
`);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261023152754_paginate_public_community_reads.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.query(
  "insert into public.profiles values ($1,'owner','Owner',null,null,true,'private@example.test'),($2,'trainer','Trainer',null,null,false,'private2@example.test')",
  [uuid(900), uuid(901)],
);
for (let i = 1; i <= 23; i++)
  await db.query("insert into public.comments values ($1,'arena',$2,$3,$4,null)", [
    uuid(i),
    uuid(i === 23 ? 900 : 901),
    `Review ${i}`,
    new Date(Date.UTC(2026, 9, 24 - i)).toISOString(),
  ]);
for (let i = 101; i <= 113; i++)
  await db.query("insert into public.comments values ($1,'arena',$2,'Reply',$3,$4)", [
    uuid(i),
    uuid(901),
    "2026-10-23T10:00:00Z",
    uuid(23),
  ]);
await db.query(
  "insert into public.comments values ($1,'other',$2,'Wrong mod reply',now(),$3),($4,'arena',$2,'hidden from anon',now(),null)",
  [uuid(114), uuid(901), uuid(23), uuid(115)],
);
await db.query(
  "insert into public.comment_likes select $1::uuid,('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1000,1599)i",
  [uuid(22)],
);
await db.exec(
  "insert into public.mod_ratings select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'arena',null,4,now() from generate_series(1,2001)i; insert into public.mod_likes select 'arena',('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,1201)i;",
);
const page = async (n = 0) =>
  (await db.query("select public.get_review_page('arena',$1) as data", [n])).rows[0].data;
await db.exec("set role anon");

test("database review pages preserve global ranking and bound threads/replies", async () => {
  const first = await page();
  assert.equal(first.totalThreads, 23);
  assert.equal(first.page, 0);
  assert.equal(first.threads.length, 10);
  assert.equal(first.threads[0].id, uuid(23));
  assert.equal(first.threads[1].id, uuid(22));
  assert.equal(first.threads[0].replyCount, 13);
  assert.equal(first.threads[0].replies.length, 5);
  assert.equal(first.reviewLikeCount, 600);
  assert.equal(first.ratingCount, 2001);
  assert.equal(first.ratingSum, 8004);
  assert.equal(first.threads[1].likeCount, 600);
  assert.equal(first.threads[1].likedByMe, false);
  assert.equal(JSON.stringify(first).includes("private_email"), false);
  assert.equal(JSON.stringify(first).includes("private@example"), false);
  const second = await page(1),
    last = await page(2),
    clamped = await page(999999);
  assert.equal(second.threads.length, 10);
  assert.equal(last.threads.length, 3);
  assert.equal(clamped.page, 2);
  assert.equal(
    new Set([...first.threads, ...second.threads, ...last.threads].map((t) => t.id)).size,
    23,
  );
  const empty = (await db.query("select public.get_review_page('empty',5) as data")).rows[0].data;
  assert.equal(empty.page, 0);
  assert.deepEqual(empty.threads, []);
  assert.equal(empty.ratingCount, 0);
});

test("reply cursors handle tied timestamps and stop at the exact last page", async () => {
  let cursor = { time: null, id: null };
  const ids = [];
  let more = true;
  while (more) {
    const r = (
      await db.query("select public.get_review_replies($1,$2,$3) as data", [
        uuid(23),
        cursor.time,
        cursor.id,
      ])
    ).rows[0].data;
    assert.equal(r.total, 13);
    assert(r.replies.length <= 5);
    ids.push(...r.replies.map((x) => x.id));
    more = r.hasMore;
    const last = r.replies.at(-1);
    cursor = { time: last.created_at, id: last.id };
  }
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13);
  assert.equal(ids.includes(uuid(114)), false);
});

test("public statistics aggregate beyond REST row limits without exposing voters", async () => {
  const rows = (
    await db.query("select * from public.get_public_mod_stats(array['arena','arena','empty'])")
  ).rows;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    mod_slug: "arena",
    like_count: 1201,
    rating_count: 2001,
    rating_sum: 8004,
  });
  assert.deepEqual((await db.query("select * from public.get_public_mod_stats('{}')")).rows, []);
});

test("caller identity and RLS remain effective inside invoker functions", async () => {
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uuid(1000)]);
  const signed = await page();
  assert.equal(signed.totalThreads, 24);
  assert.equal(signed.threads[1].likedByMe, true);
  await db.exec("reset role; revoke select on public.comments from anon; set role anon");
  await assert.rejects(page(), (e) => e.code === "42501");
  await db.exec("reset role; grant select on public.comments to anon; set role unrelated");
  await assert.rejects(page(), (e) => e.code === "42501");
  await db.exec("reset role; set role anon");
});

test("review counts and final pages exceed the REST default row ceiling", async () => {
  await db.exec("reset role");
  await db.query(
    `insert into public.comments select ('00000000-0000-4000-8000-'||lpad((20000+i)::text,12,'0'))::uuid,
    'large', $1::uuid, 'Large community review', '2026-10-23T10:00:00Z'::timestamptz, null from generate_series(1,1005)i`,
    [uuid(901)],
  );
  await db.exec("set role anon");
  const first = (await db.query("select public.get_review_page('large',0) as data")).rows[0].data;
  const last = (await db.query("select public.get_review_page('large',1000) as data")).rows[0].data;
  assert.equal(first.totalThreads, 1005);
  assert.equal(first.threads.length, 10);
  assert.equal(first.threads[0].id, uuid(21005));
  assert.equal(last.page, 100);
  assert.equal(last.threads.length, 5);
  assert.equal(last.threads[4].id, uuid(20001));
});

test("database endpoints reject invalid or oversized requests", async () => {
  for (const [query, args] of [
    ["select public.get_review_page($1,0)", [""]],
    ["select public.get_review_page('arena',-1)", []],
    ["select public.get_review_page('arena',null)", []],
    ["select public.get_review_replies($1,now(),null)", [uuid(23)]],
    ["select * from public.get_public_mod_stats(array_fill('arena'::text,array[101]))", []],
  ])
    await assert.rejects(db.query(query, args), (e) => e.code === "22023");
});

test.after(async () => {
  await db.close();
});
