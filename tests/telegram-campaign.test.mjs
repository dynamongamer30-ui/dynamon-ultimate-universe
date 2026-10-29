import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const migration = await readFile(
  new URL("../supabase/migrations/20261029073347_telegram_campaign_claims.sql", import.meta.url),
  "utf8",
);
const user = "00000000-0000-0000-0000-000000000001",
  other = "00000000-0000-0000-0000-000000000002";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create table profiles(id uuid primary key,display_name text,username text);
 create table phoenix_passes(id uuid primary key default gen_random_uuid(),user_id uuid,claimed bool,claimed_at timestamptz,claim_deadline timestamptz,expires_at timestamptz,grant_kind text);
 create table claim_campaigns(slug text primary key,title text,max_claims int,claimed_count int default 0,active bool,starts_at timestamptz,ends_at timestamptz,created_at timestamptz default now());
 create table claim_campaign_claims(campaign_slug text,user_id uuid,pass_id uuid,unique(campaign_slug,user_id));
 create table notifications(title text,body text,target_user_id uuid,reward_kind text,reward_ref text);
 create function dg_is_owner() returns boolean language sql as $$select coalesce(current_setting('test.owner',true),'true')='true'$$;
 create function claim_campaign_pass(text) returns jsonb language sql as $$select '{}'::jsonb$$;
 create function website_claim_campaign(uuid,text,text) returns jsonb language sql as $$select '{}'::jsonb$$;
 insert into auth.users values('${user}',now()),('${other}',now());
 insert into profiles values('${user}','Account A','a'),('${other}','Account B','b');
 insert into claim_campaigns(slug,title,max_claims,active)values('bonus','Diwali Pass',1,true);
 create table saved_tutorials(language text,body text,video text);
 insert into saved_tutorials values('en','English content','video-a'),('hi','हिंदी सामग्री','video-b'),('hing','Hinglish content','video-c'),('vi','Nội dung','video-d');`);
  await db.exec(migration);
  return db;
}
async function rpc(db, action, hash = "a".repeat(64), who = user, tg = 123) {
  return (
    await db.query("select website_telegram_claim($1,$2,$3,$4,$5) as r", [
      action,
      hash,
      who,
      "bonus",
      tg,
    ])
  ).rows[0].r;
}
test("single-use, account-bound claims preserve tutorials and enforce capacity and Telegram uniqueness", async () => {
  const db = await setup();
  try {
    const before = (await db.query("select * from saved_tutorials")).rows;
    assert.equal((await rpc(db, "create")).ok, true);
    assert.equal((await rpc(db, "inspect")).account, "Account A");
    assert.equal((await rpc(db, "redeem")).error, "confirmation_required");
    await rpc(db, "confirm");
    assert.equal((await rpc(db, "inspect", "a".repeat(64), user, 999)).error, "account_mismatch");
    assert.equal((await rpc(db, "redeem")).awarded, true);
    assert.equal((await rpc(db, "redeem")).awarded, true);
    assert.equal((await db.query("select count(*)::int as n from phoenix_passes")).rows[0].n, 1);
    assert.equal((await rpc(db, "create", "b".repeat(64), other)).error, "sold_out");
    await db.exec("update claim_campaigns set max_claims=2");
    await rpc(db, "create", "b".repeat(64), other);
    await rpc(db, "confirm", "b".repeat(64), other);
    assert.equal((await rpc(db, "redeem", "b".repeat(64), other)).error, "already_claimed");
    assert.deepEqual((await db.query("select * from saved_tutorials")).rows, before);
    assert.equal(
      (
        await db.query(
          "select has_function_privilege('authenticated','claim_campaign_pass(text)','execute') as ok",
        )
      ).rows[0].ok,
      false,
    );
  } finally {
    await db.close();
  }
});
test("pause, delete, expiry, rename and owner authorization preserve reward history", async () => {
  const db = await setup();
  try {
    await rpc(db, "create");
    await rpc(db, "confirm");
    await db.query("select website_manage_campaign('pause','bonus')");
    assert.equal((await rpc(db, "redeem")).error, "campaign_inactive");
    await db.query("select website_manage_campaign('resume','bonus')");
    await db.exec("update website_telegram_handoffs set expires_at=now()-interval '1 second'");
    assert.equal((await rpc(db, "redeem")).error, "handoff_expired");
    await db.exec("update website_telegram_handoffs set expires_at=now()+interval '1 minute'");
    await rpc(db, "redeem");
    await db.query(
      "select website_save_campaign('bonus','Festival',1,true,null,null,'festival-pass')",
    );
    assert.equal((await rpc(db, "status")).claimed, true);
    await db.query("select website_manage_campaign('delete','bonus')");
    assert.equal((await rpc(db, "inspect")).error, "not_found");
    assert.equal(
      (await db.query("select count(*)::int as n from claim_campaign_claims")).rows[0].n,
      1,
    );
    assert.equal((await db.query("select count(*)::int as n from phoenix_passes")).rows[0].n, 1);
    await db.exec("set test.owner='false'");
    await assert.rejects(db.query("select website_manage_campaign('list')"), /Owner access/);
  } finally {
    await db.close();
  }
});
