import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
test("daily and formerly VIP trainer rewards issue DG keys without changing reward entitlement", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-4000-8000-000000000001'::uuid$$;
 CREATE TABLE profiles(id uuid,is_owner boolean);
 INSERT INTO profiles VALUES(auth.uid(),false);
 CREATE TABLE valid_keys(id text PRIMARY KEY,data jsonb,updated_at timestamptz DEFAULT now());
 CREATE TABLE vip_giveaway_winners(user_id uuid,key text,awarded_at timestamptz DEFAULT now());
 CREATE TABLE phoenix_pass_winners(user_id uuid,awarded_at timestamptz);
 CREATE TABLE notifications(title text,body text,target_user_id uuid,reward_kind text,reward_ref text);
 CREATE FUNCTION upsert_daily_giveaway_broadcast() RETURNS void LANGUAGE sql AS $$SELECT$$;
 CREATE TABLE user_trainer_progress(user_id uuid PRIMARY KEY,current_level integer DEFAULT 0,level_started_at timestamptz,updated_at timestamptz);
 CREATE TABLE user_streaks(user_id uuid,current_streak integer);
 INSERT INTO user_streaks VALUES(auth.uid(),999);
 CREATE TABLE trainer_levels(level integer,days_required integer,reward_kind text);
 INSERT INTO trainer_levels VALUES(1,1,'trainer_vip_key');
 CREATE TABLE app_config(id text,data jsonb);
 INSERT INTO app_config VALUES('KeyDurationHours','24');
 CREATE TABLE phoenix_passes(user_id uuid,claimed boolean,expires_at timestamptz,claim_deadline timestamptz);`);
    await db.exec(
      readFileSync(new URL("../supabase/dg_only_reward_keys.sql", import.meta.url), "utf8"),
    );
    await db.query("SELECT run_vip_daily_giveaway()");
    let keys = (await db.query("SELECT id,data FROM valid_keys")).rows;
    assert.equal(keys.length, 1);
    assert.match(keys[0].id, /^DG-[A-Z0-9]{6}$/);
    assert.equal(keys[0].data.durationHours, 24);
    const result = (await db.query("SELECT claim_trainer_level() AS result")).rows[0].result;
    assert.equal(result.ok, true);
    assert.match(result.key, /^DG-[A-Z0-9]{6}$/);
    assert.equal(result.reward_kind, "trainer_vip_key", "historical entitlement type retained");
    assert.equal(
      (await db.query("SELECT current_level FROM user_trainer_progress")).rows[0].current_level,
      1,
    );
    assert.ok(
      (await db.query("SELECT title FROM notifications")).rows.every(
        (x) => !x.title.includes("VIP"),
      ),
    );
  } finally {
    await db.close();
  }
});
