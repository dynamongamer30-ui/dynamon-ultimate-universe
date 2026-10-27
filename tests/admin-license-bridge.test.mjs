import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { ownerKeyAction } from "../workers/license-v2/src/owner-keys.js";
import licenseWorker from "../workers/license-v2/src/index.js";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const hash = "a".repeat(64),
  secondHash = "b".repeat(64);
async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
    CREATE TABLE profiles(id uuid PRIMARY KEY,is_owner boolean);
    INSERT INTO profiles VALUES('${owner}',true),('${other}',false);
    CREATE TABLE valid_keys(id text PRIMARY KEY,data jsonb NOT NULL);
    CREATE SCHEMA rv_v2;
    CREATE TABLE rv_v2.licenses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),key_hmac text UNIQUE NOT NULL,status text NOT NULL,duration_seconds integer,activated_at timestamptz,expires_at timestamptz,source text,session_version integer DEFAULT 1,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE rv_v2.license_devices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),license_id uuid REFERENCES rv_v2.licenses(id) ON DELETE RESTRICT,device_thumbprint text,public_key_spki text,revoked_at timestamptz);
    CREATE TABLE rv_v2.device_bans(device_thumbprint text PRIMARY KEY,unbanned_at timestamptz);
    CREATE TABLE rv_v2.admin_audit(id bigint GENERATED ALWAYS AS IDENTITY,actor_id text,action text,license_id uuid REFERENCES rv_v2.licenses(id),detail jsonb);`);
  await db.exec(
    readFileSync(new URL("../supabase/admin_license_bridge.sql", import.meta.url), "utf8"),
  );
  const action = async (
    action,
    key = "DG-ABC234",
    keyHash = hash,
    hours = null,
    expected = null,
    actor = owner,
    id = requestId,
  ) => {
    return (
      await db.query("SELECT * FROM public.rv2_admin_key_action($1,$2,$3,$4,$5,$6,$7)", [
        action,
        key,
        keyHash,
        hours,
        expected,
        actor,
        id,
      ])
    ).rows[0];
  };
  return {
    db,
    action,
    record: async (key = "DG-ABC234") =>
      (await db.query("SELECT data FROM valid_keys WHERE id=$1", [key])).rows[0]?.data,
  };
}

test("manual DG/VIP creation provisions both stores, starts on activation and preserves lifetime", async () => {
  const { db, action, record } = await setup();
  try {
    const created = await action("create", undefined, undefined, 24);
    assert.equal(created.key_id, "DG-ABC234");
    assert.ok(created.license_id);
    assert.equal((await record()).expiry, 0);
    assert.equal((await record()).activated, false);
    let rows = (await db.query("SELECT * FROM rv_v2.licenses")).rows;
    assert.equal(rows[0].duration_seconds, 86400);
    assert.equal(rows[0].expires_at, null);
    await action("create", undefined, undefined, 24); // Same request is safe to reconcile.
    assert.equal((await db.query("SELECT count(*)::int AS n FROM valid_keys")).rows[0].n, 1);
    await assert.rejects(
      action("create", undefined, undefined, 24, null, owner, other),
      /collision/,
    );
    await action("create", "VIP-ABC234", secondHash, 0);
    rows = (await db.query("SELECT * FROM rv_v2.licenses WHERE key_hmac=$1", [secondHash])).rows;
    assert.equal(rows[0].duration_seconds, null);
    assert.equal(rows[0].expires_at, null);
    assert.equal((await record("VIP-ABC234")).durationHours, 0);
    for (const role of ["anon", "authenticated", "service_role"])
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege($1,'public.rv2_admin_key_action(text,text,text,integer,jsonb,uuid,uuid)','EXECUTE') AS allowed",
            [role],
          )
        ).rows[0].allowed,
        role === "service_role",
      );
  } finally {
    await db.close();
  }
});

test("owner changes synchronize status/duration, reject stale snapshots and retain device history", async () => {
  const { db, action, record } = await setup();
  try {
    const { license_id: id } = await action("create", undefined, undefined, 24);
    const initial = await record();
    await action("extend", undefined, undefined, 24, initial);
    assert.equal((await record()).durationHours, 48);
    assert.equal(
      (await db.query("SELECT duration_seconds FROM rv_v2.licenses")).rows[0].duration_seconds,
      172800,
    );
    await assert.rejects(action("revoke", undefined, undefined, null, initial), /changed/);
    await action("revoke", undefined, undefined, null, await record());
    assert.equal((await db.query("SELECT status FROM rv_v2.licenses")).rows[0].status, "revoked");
    await action("unrevoke", undefined, undefined, null, await record());
    assert.equal((await record()).status, "active");
    await db.query(
      "INSERT INTO rv_v2.license_devices(license_id,device_thumbprint,public_key_spki) VALUES($1,$2,$3)",
      [id, "c".repeat(64), "D".repeat(100)],
    );
    await db.exec("INSERT INTO rv_v2.device_bans VALUES('banned-device',null)");
    await action("delete", undefined, undefined, null, await record());
    assert.equal(await record(), undefined);
    assert.equal((await db.query("SELECT status FROM rv_v2.licenses")).rows[0].status, "revoked");
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM rv_v2.license_devices")).rows[0].n,
      1,
    );
    assert.equal((await db.query("SELECT count(*)::int AS n FROM rv_v2.device_bans")).rows[0].n, 1);
  } finally {
    await db.close();
  }
});

test("non-owner calls, malformed keys, lifetime extension and partial writes cannot change records", async () => {
  const { db, action, record } = await setup();
  try {
    await assert.rejects(action("create", undefined, undefined, 24, null, other), /Owner access/);
    await assert.rejects(action("create", "DG-TOOLONG1234567890", hash, 24), /Invalid/);
    await action("create", "VIP-ABC234", secondHash, 0);
    await assert.rejects(
      action("extend", "VIP-ABC234", secondHash, 24, await record("VIP-ABC234")),
      /Lifetime/,
    );
    await db.exec(
      "CREATE FUNCTION deny_license_insert() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Local failure';END$$; CREATE TRIGGER deny_license BEFORE INSERT ON rv_v2.licenses FOR EACH ROW EXECUTE FUNCTION deny_license_insert()",
    );
    await assert.rejects(action("create", undefined, undefined, 24), /Local failure/);
    assert.equal(await record(), undefined, "legacy insert rolls back when V2 registration fails");
  } finally {
    await db.close();
  }
});

test("owner Worker never accepts browser issuer secrets and rejects unauthenticated/non-owner requests", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const env = {
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_KEY: "LOCAL-SERVER-KEY",
    LICENSE_HMAC_PEPPER: "LOCAL-PEPPER-ONLY",
  };
  try {
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ id: other });
    };
    const req = (headers = {}) =>
      new Request("https://local.test/v2/admin/keys", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ action: "create", key: "DG-ABC234", hours: 24, requestId }),
      });
    assert.equal((await ownerKeyAction(req(), env)).status, 401);
    assert.equal(calls, 0);
    assert.equal(
      (
        await ownerKeyAction(
          req({ origin: "https://untrusted.test", authorization: "Bearer " + "A".repeat(40) }),
          env,
        )
      ).status,
      403,
    );
    assert.equal(calls, 0);
    globalThis.fetch = async (input) => {
      calls++;
      return String(input).includes("/auth/") ? Response.json({ id: other }) : Response.json(false);
    };
    assert.equal(
      (await ownerKeyAction(req({ authorization: "Bearer " + "A".repeat(40) }), env)).status,
      403,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("admin DG/VIP keys pass the existing signed V2 activation path and reject a second device", async () => {
  const { db } = await setup();
  const original = globalThis.fetch;
  try {
    // Existing deployed claim procedure, reproduced against isolated fixture tables.
    await db.exec(`CREATE FUNCTION public.rv2_claim_device(p_key_hmac text,p_thumbprint text,p_public_key_spki text)
    RETURNS TABLE(license_id uuid,lease_version integer,license_expiry timestamptz) LANGUAGE plpgsql SET search_path='' AS $$
    DECLARE l rv_v2.licenses%ROWTYPE;d rv_v2.license_devices%ROWTYPE;
    BEGIN
      SELECT * INTO l FROM rv_v2.licenses x WHERE x.key_hmac=p_key_hmac FOR UPDATE;
      IF NOT FOUND OR l.status<>'active' OR (l.expires_at IS NOT NULL AND l.expires_at<=now()) THEN RETURN; END IF;
      IF EXISTS(SELECT 1 FROM rv_v2.device_bans b WHERE b.device_thumbprint=p_thumbprint AND b.unbanned_at IS NULL) THEN RETURN; END IF;
      SELECT * INTO d FROM rv_v2.license_devices x WHERE x.license_id=l.id AND x.revoked_at IS NULL;
      IF FOUND THEN IF d.device_thumbprint<>p_thumbprint OR d.public_key_spki<>p_public_key_spki THEN RETURN; END IF;
      ELSE
        INSERT INTO rv_v2.license_devices(license_id,device_thumbprint,public_key_spki) VALUES(l.id,p_thumbprint,p_public_key_spki);
        UPDATE rv_v2.licenses x SET activated_at=coalesce(x.activated_at,now()),expires_at=CASE WHEN x.expires_at IS NOT NULL THEN x.expires_at WHEN x.duration_seconds IS NOT NULL THEN now()+x.duration_seconds*interval '1 second' ELSE NULL END WHERE x.id=l.id RETURNING * INTO l;
      END IF;
      RETURN QUERY SELECT l.id,l.session_version,l.expires_at;
    END;$$;`);
    const env = {
      SUPABASE_URL: "https://fixture.supabase.co",
      SUPABASE_SERVICE_KEY: "LOCAL-SERVICE-KEY-ONLY",
      LICENSE_HMAC_PEPPER: "LOCAL-LICENSE-PEPPER-ONLY",
      SESSION_SIGNING_SECRET: "LOCAL-SESSION-SECRET-ONLY",
    };
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      if (path === "/auth/v1/user") return Response.json({ id: owner });
      if (path.endsWith("/dg_is_owner")) return Response.json(true);
      if (path.endsWith("/app_config")) return Response.json([]);
      const payload = JSON.parse(options.body);
      const name = path.split("/").at(-1);
      const parameters =
        name === "rv2_admin_key_action"
          ? ["p_action", "p_key", "p_key_hmac", "p_hours", "p_expected", "p_actor", "p_request_id"]
          : name === "rv2_claim_device"
            ? ["p_key_hmac", "p_thumbprint", "p_public_key_spki"]
            : null;
      assert.ok(parameters, "only expected fixture RPCs may run");
      const rows = (
        await db.query(
          `SELECT * FROM public.${name}(${parameters.map((_, i) => "$" + (i + 1)).join(",")})`,
          parameters.map((key) => payload[key]),
        )
      ).rows;
      return Response.json(rows);
    };
    const activate = async (key, pair) => {
      const challenge = await (
        await licenseWorker.fetch(new Request("https://local.test/v2/challenge"), env)
      ).json();
      const spki = Buffer.from(await crypto.subtle.exportKey("spki", pair.publicKey)).toString(
        "base64url",
      );
      const signature = Buffer.from(
        await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          pair.privateKey,
          new TextEncoder().encode("RV2-ACTIVATE\n" + challenge.challenge + "\n" + key),
        ),
      ).toString("base64url");
      return licenseWorker.fetch(
        new Request("https://local.test/v2/activate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            license_key: key,
            challenge: challenge.challenge,
            public_key_spki: spki,
            signature,
          }),
        }),
        env,
      );
    };
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    for (const [key, hours] of [
      ["DG-ABC234", 24],
      ["VIP-ABC234", 0],
    ]) {
      const response = await licenseWorker.fetch(
        new Request("https://local.test/v2/admin/keys", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + "A".repeat(40),
          },
          body: JSON.stringify({ action: "create", key, hours, requestId }),
        }),
        env,
      );
      assert.equal(response.status, 200);
      const activated = await activate(key, pair);
      assert.equal(activated.status, 200);
      const lease = await activated.json();
      assert.equal(typeof lease.lease, "string");
      assert.ok(lease.expires_at > Math.floor(Date.now() / 1000));
      const different = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      assert.equal((await activate(key, different)).status, 401);
    }
  } finally {
    globalThis.fetch = original;
    await db.close();
  }
});
