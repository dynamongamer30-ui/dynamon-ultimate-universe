import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("scheduled device retention deletes only stale information and protects internal execution", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE public.valid_keys(id text PRIMARY KEY, data jsonb);
      CREATE TABLE public.activated_users(id text PRIMARY KEY, data jsonb);
      CREATE TABLE public.banned_devices(id text PRIMARY KEY, data jsonb);
      CREATE SCHEMA cron;
      CREATE TABLE cron.jobs(name text PRIMARY KEY, schedule text, command text);
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$
        INSERT INTO cron.jobs VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET schedule=$2, command=$3 RETURNING 1::bigint
      $$;`);
    const sql = readFileSync(
      new URL("../supabase/device_record_retention.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql); // named scheduling remains idempotent
    const now = Number(
      (await db.query("SELECT floor(extract(epoch from now()))::bigint AS n")).rows[0].n,
    );
    const keys = [
      ["A", { device: "live", expiry: now + 86400 }],
      ["B", { device: "life", expiry: 0 }],
      ["C", { device: "expired", expiry: now - 1 }],
      ["D", { device: "boundary", expiry: now }],
      ["E", { device: "revoked", expiry: now + 86400, status: "revoked" }],
      ["F", { device: null, expiry: 0 }],
      ["OLD", { device: "renewed", expiry: 1 }],
      ["NEW", { device: "renewed", expiry: now + 86400 }],
      ["BAD", { device: "uncertain", expiry: "invalid" }],
      ["NEG", { device: "negative", expiry: -1 }],
      ["LEGACY", { device: "legacy" }],
    ];
    const devices = [
      "live",
      "life",
      "expired",
      "boundary",
      "revoked",
      "orphan",
      "renewed",
      "uncertain",
      "negative",
      "legacy",
    ];
    for (const [id, data] of keys)
      await db.query("INSERT INTO valid_keys VALUES ($1,$2)", [id, data]);
    for (const id of devices)
      await db.query("INSERT INTO activated_users VALUES ($1,$2)", [id, { Key: "OLD" }]);
    await db.exec("INSERT INTO banned_devices VALUES ('expired', '{}'), ('live', '{}')");
    const before = (
      await db.query("SELECT jsonb_agg(valid_keys ORDER BY id) AS data FROM valid_keys")
    ).rows[0].data;
    assert.equal(
      (await db.query("SELECT public.cleanup_stale_device_records() AS removed")).rows[0].removed,
      4,
    );
    assert.deepEqual(
      (await db.query("SELECT id FROM activated_users ORDER BY id")).rows.map((r) => r.id),
      ["legacy", "life", "live", "negative", "renewed", "uncertain"],
    );
    assert.equal(
      (await db.query("SELECT public.cleanup_stale_device_records() AS removed")).rows[0].removed,
      0,
    );
    assert.deepEqual(
      (await db.query("SELECT jsonb_agg(valid_keys ORDER BY id) AS data FROM valid_keys")).rows[0]
        .data,
      before,
    );
    assert.equal((await db.query("SELECT count(*)::int AS n FROM banned_devices")).rows[0].n, 2);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM cron.jobs")).rows[0].n, 1);
    for (const role of ["anon", "authenticated", "service_role"]) {
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege($1, 'public.cleanup_stale_device_records()', 'EXECUTE') AS allowed",
            [role],
          )
        ).rows[0].allowed,
        role === "service_role",
      );
    }
    assert.equal(
      (
        await db.query(
          "SELECT prosecdef FROM pg_proc WHERE oid='public.cleanup_stale_device_records()'::regprocedure",
        )
      ).rows[0].prosecdef,
      false,
    );
  } finally {
    await db.close();
  }
});
