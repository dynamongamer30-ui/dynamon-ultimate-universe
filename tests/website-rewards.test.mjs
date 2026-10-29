import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const migration = readFileSync(
  new URL("../supabase/migrations/20261028185258_website_reward_experience.sql", import.meta.url),
  "utf8",
);
const owner = "00000000-0000-4000-8000-000000000001",
  member = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
 create function public.dg_is_owner() returns boolean language sql stable as $$ select auth.uid()='${owner}'::uuid $$;
 grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid(),public.dg_is_owner() to anon,authenticated,service_role;
 insert into auth.users values('${owner}','owner@example.test',now()),('${member}','member@example.test',now()),('${other}','other@example.test',now());
 create table valid_keys(id text primary key,data jsonb,updated_at timestamptz default now());
 create table notifications(id uuid primary key default gen_random_uuid(),title text,body text,target_user_id uuid,created_at timestamptz default now(),reward_kind text,reward_ref text,burn_after_read boolean not null default false);
 create table notification_reads(notification_id uuid references notifications(id) on delete cascade,user_id uuid,read_at timestamptz default now(),primary key(notification_id,user_id));
 create table phoenix_passes(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),created_at timestamptz not null default now(),expires_at timestamptz,used boolean not null default false,used_at timestamptz,used_slug text,claimed boolean not null default false,claimed_at timestamptz,claim_deadline timestamptz,grant_kind text);
 create table vip_giveaway_winners(id uuid primary key default gen_random_uuid(),user_id uuid,key text,awarded_at timestamptz default now(),claimed boolean default false,claimed_at timestamptz);
 create table claim_campaigns(slug text primary key,title text,max_claims int,claimed_count int not null default 0,active boolean,created_at timestamptz default now());
 create table claim_campaign_claims(id uuid primary key default gen_random_uuid(),campaign_slug text references claim_campaigns(slug),user_id uuid,pass_id uuid references phoenix_passes(id),claimed_at timestamptz default now(),unique(campaign_slug,user_id));
 create function claim_campaign_pass(text) returns jsonb language sql as $$ select '{}'::jsonb $$;
 grant all on all tables in schema public,auth to service_role;
 insert into valid_keys values('DG-TRAIN1',jsonb_build_object('expiry',extract(epoch from now()+interval '1 day')::bigint,'status','active'),now());
 insert into notifications(title,target_user_id,reward_kind,reward_ref) values('Trainer key','${member}','trainer_dg_key','DG-TRAIN1');`);
  await db.exec(migration);
  await db.exec("revoke all on auth.users from service_role;");
  const as = async (role, uid, sql, args = []) => {
    await db.exec(
      `reset role; select set_config('test.uid','${uid || ""}',false); set role ${role};`,
    );
    return db.query(sql, args);
  };
  return { db, as };
}
test("reward migration preserves rewards when acknowledging automated notices and isolates accounts", async () => {
  const { db, as } = await setup();
  try {
    const n = (await db.query(`select id from notifications where reward_ref='DG-TRAIN1'`)).rows[0]
      .id;
    await as("authenticated", other, `select website_acknowledge_notification(array[$1::uuid])`, [
      n,
    ]);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from notifications")).rows[0].n, 1);
    const before = (await as("authenticated", member, "select website_reward_history() h")).rows[0]
      .h;
    assert.equal(before.items.length, 1);
    assert.equal(before.items[0].key_code, "DG-TRAIN1");
    await as("authenticated", member, "select website_acknowledge_notification(array[$1::uuid])", [
      n,
    ]);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from notifications")).rows[0].n, 0);
    assert.equal(
      (await as("authenticated", member, "select website_reward_history() h")).rows[0].h.items
        .length,
      1,
    );
    assert.equal(
      (await as("authenticated", other, "select website_reward_history() h")).rows[0].h.items
        .length,
      0,
    );
    await db.exec(
      `reset role;insert into notifications(title) values('Manual announcement');insert into notifications(title,burn_after_read) values('Shared automated notice',true);`,
    );
    const ids = (await db.query("select id from notifications")).rows.map((r) => r.id);
    await as("authenticated", member, "select website_acknowledge_notification($1::uuid[])", [ids]);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from notifications")).rows[0].n, 2);
    assert.equal(
      (await db.query("select count(*)::int n from notification_reads where user_id=$1", [other]))
        .rows[0].n,
      0,
    );
    await assert.rejects(as("anon", "", "select website_reward_history()"), /permission denied/);
  } finally {
    await db.close();
  }
});
test("owner grants are idempotent, member access is denied, used rewards disappear, cleanup preserves manual notices", async () => {
  const { db, as } = await setup();
  try {
    await assert.rejects(
      as(
        "authenticated",
        member,
        `select website_grant_pass('other@example.test',gen_random_uuid())`,
      ),
      /Owner access required/,
    );
    const request = "00000000-0000-4000-8000-000000000099";
    const grant = (
      await as(
        "authenticated",
        owner,
        `select website_grant_pass('member@example.test',$1::uuid) g`,
        [request],
      )
    ).rows[0].g;
    const replay = (
      await as(
        "authenticated",
        owner,
        `select website_grant_pass('member@example.test',$1::uuid) g`,
        [request],
      )
    ).rows[0].g;
    assert.equal(replay.pass_id, grant.pass_id);
    assert.equal(replay.replayed, true);
    await db.exec(
      `reset role;update phoenix_passes set used=true;insert into notifications(title,created_at) values('Keep manual',now()-interval '3 days');insert into notifications(title,burn_after_read,created_at) values('Old automation',true,now()-interval '3 days');`,
    );
    await as("service_role", "", "select website_cleanup_notifications()");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select count(*)::int n from notifications where title='Keep manual'"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select count(*)::int n from notifications where title='Old automation'"))
        .rows[0].n,
      0,
    );
    assert.equal((await db.query("select count(*)::int n from phoenix_passes")).rows[0].n, 1);
    assert.equal(
      (await as("authenticated", member, "select website_reward_history() h")).rows[0].h.items.some(
        (r) => r.kind === "phoenix_pass",
      ),
      false,
    );
    await db.exec("reset role; delete from phoenix_passes;");
    assert.equal((await db.query("select pass_id from website_pass_grants")).rows[0].pass_id, null);
  } finally {
    await db.close();
  }
});
test("campaign account/browser quotas, server permission, verified email and cap are enforced atomically", async () => {
  const { db, as } = await setup();
  try {
    await as(
      "authenticated",
      owner,
      `select website_manage_campaign('save','limited','Phoenix',1,true)`,
    );
    await assert.rejects(
      as(
        "authenticated",
        member,
        `select website_claim_campaign('${member}','limited',repeat('a',64))`,
      ),
      /permission denied/,
    );
    const first = (
      await as(
        "service_role",
        "",
        `select website_claim_campaign('${member}','limited',repeat('a',64)) r`,
      )
    ).rows[0].r;
    assert.equal(first.ok, true);
    const same = (
      await as(
        "service_role",
        "",
        `select website_claim_campaign('${member}','limited',repeat('b',64)) r`,
      )
    ).rows[0].r;
    assert.equal(same.already_claimed, true);
    const browser = (
      await as(
        "service_role",
        "",
        `select website_claim_campaign('${other}','limited',repeat('a',64)) r`,
      )
    ).rows[0].r;
    assert.equal(browser.error, "browser_already_claimed");
    const cap = (
      await as(
        "service_role",
        "",
        `select website_claim_campaign('${other}','limited',repeat('b',64)) r`,
      )
    ).rows[0].r;
    assert.equal(cap.error, "sold_out");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select claimed_count from claim_campaigns")).rows[0].claimed_count,
      1,
    );
    await assert.rejects(
      as(
        "authenticated",
        owner,
        `select website_manage_campaign('save','limited','Phoenix',0,true)`,
      ),
      /Check campaign|Limit cannot/,
    );
    await db.exec(`reset role;update auth.users set email_confirmed_at=null where id='${other}'`);
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select website_claim_campaign('${other}','limited',repeat('c',64)) r`,
        )
      ).rows[0].r.error,
      "verified_account_required",
    );
    await db.exec(
      `reset role;delete from claim_campaign_claims where user_id='${member}';delete from phoenix_passes where user_id='${member}';delete from auth.users where id='${member}';`,
    );
    const retained = (
      await db.query("select user_id,browser_hash from website_campaign_browser_claims")
    ).rows;
    assert.equal(retained.length, 1);
    assert.equal(retained[0].user_id, null);
    assert.equal(retained[0].browser_hash, "a".repeat(64));
  } finally {
    await db.close();
  }
});
test("saved search quotas and ownership and timestamp-tied reward pagination", async () => {
  const { db, as } = await setup();
  try {
    for (let n = 0; n < 10; n++)
      await as(
        "authenticated",
        member,
        `select website_saved_searches('save',null,$1,'{"q":"fire"}')`,
        ["Search " + n],
      );
    await assert.rejects(
      as("authenticated", member, `select website_saved_searches('save',null,'Extra','{}')`),
      /ten saved/,
    );
    assert.equal(
      (await as("authenticated", other, "select website_saved_searches() s")).rows[0].s.length,
      0,
    );
    await db.exec(
      `reset role;insert into phoenix_passes(user_id,claimed,expires_at,created_at) select '${member}',true,now()+interval '1 day','2026-10-20'::timestamptz from generate_series(1,25);`,
    );
    const first = (
      await as("authenticated", member, "select website_reward_history(null,20,null) h")
    ).rows[0].h;
    const last = first.items.at(-1);
    const second = (
      await as("authenticated", member, "select website_reward_history($1,20,$2) h", [
        last.awarded_at,
        last.id,
      ])
    ).rows[0].h;
    assert.equal(new Set([...first.items, ...second.items].map((r) => r.id)).size, 26);
  } finally {
    await db.close();
  }
});

test("rate limits cover changing IPs and scheduled cleanup reports observed runs without deleting rewards", async () => {
  const { db, as } = await setup();
  try {
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await as("service_role", "", `select website_campaign_rate($1,repeat('a',64),$2) ok`, [
            member,
            "ip-" + i,
          ])
        ).rows[0].ok,
        true,
      );
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select website_campaign_rate($1,repeat('b',64),'new-ip') ok`,
          [member],
        )
      ).rows[0].ok,
      false,
    );
    await db.exec(`reset role;
      create schema cron;
      create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean default true);
      create table cron.job_run_details(jobid bigint,status text,start_time timestamptz);
      create function cron.schedule(p_name text,p_schedule text,p_command text) returns bigint language plpgsql as $$declare result bigint;begin insert into cron.job(jobname,schedule,command) values(p_name,p_schedule,p_command) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid into result;return result;end $$;`);
    const schedule = readFileSync(
      new URL(
        "../supabase/migrations/20261028234540_website_notification_cleanup_schedule.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(schedule);
    await db.exec(schedule);
    assert.equal((await db.query("select count(*)::int n from cron.job")).rows[0].n, 1);
    const job = (await db.query("select * from cron.job")).rows[0];
    assert.equal(job.schedule, "*/15 * * * *");
    assert.equal(job.command, "select public.website_cleanup_notifications();");
    let health = (await as("authenticated", owner, "select website_owner_automation() h")).rows[0]
      .h;
    assert.equal(health.cleanup_enabled, true);
    assert.equal(health.cleanup_last_status, "No run recorded");
    await db.exec(
      `reset role; insert into cron.job_run_details select jobid,'succeeded',now() from cron.job;`,
    );
    health = (await as("authenticated", owner, "select website_owner_automation() h")).rows[0].h;
    assert.equal(health.cleanup_last_status, "succeeded");
    await assert.rejects(
      as("authenticated", member, "select website_owner_automation()"),
      /Owner access required/,
    );
  } finally {
    await db.close();
  }
});
