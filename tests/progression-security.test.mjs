import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20261119073907_harden_progression_and_download_sessions.sql",
    import.meta.url,
  ),
  "utf8",
);

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("progression reads are restricted to the signed-in account", () => {
  assert.match(migration, /REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT CREATE ON SCHEMA public TO service_role/i);
  assert.equal((migration.match(/SET search_path = pg_catalog, public/gi) || []).length, 2);
  for (const table of ["user_xp", "user_streaks", "user_achievements"]) {
    assert.match(
      migration,
      new RegExp(`REVOKE SELECT ON TABLE[\\s\\S]*?${table}[\\s\\S]*?FROM PUBLIC, anon`, "i"),
    );
    assert.match(
      migration,
      new RegExp(
        `CREATE POLICY "[^\\"]+" ON public\\.${table}[\\s\\S]*?FOR SELECT TO authenticated[\\s\\S]*?user_id = \\(SELECT auth\\.uid\\(\\)\\)`,
        "i",
      ),
    );
  }
  assert.match(migration, /DROP POLICY IF EXISTS "xp_public_read"/);
  assert.match(migration, /DROP POLICY IF EXISTS "streaks_public_read"/);
  assert.match(migration, /DROP POLICY IF EXISTS "user_achievements_public_read"/);
});

test("migration preserves safe profile reads and enforces owner/version-bound sessions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      GRANT CREATE ON SCHEMA public TO PUBLIC;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

      CREATE TABLE public.user_xp (user_id uuid PRIMARY KEY, xp integer NOT NULL DEFAULT 0);
      CREATE TABLE public.user_streaks (user_id uuid PRIMARY KEY, current_streak integer NOT NULL DEFAULT 0);
      CREATE TABLE public.user_achievements (user_id uuid NOT NULL, achievement_key text NOT NULL);
      ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON public.user_xp, public.user_streaks, public.user_achievements TO anon, authenticated;
      CREATE POLICY "xp_public_read" ON public.user_xp FOR SELECT TO PUBLIC USING (true);
      CREATE POLICY "streaks_public_read" ON public.user_streaks FOR SELECT TO PUBLIC USING (true);
      CREATE POLICY "user_achievements_public_read" ON public.user_achievements FOR SELECT TO PUBLIC USING (true);

      CREATE TABLE public.profiles (id uuid PRIMARY KEY, username text, is_owner boolean);
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO PUBLIC USING (true);
      CREATE POLICY "profiles_public_safe_read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

      CREATE TABLE public.secure_sessions (id text PRIMARY KEY, data jsonb NOT NULL);
      CREATE TABLE public.mod_overrides (
        slug text PRIMARY KEY,
        mega_enc text,
        version text,
        real_downloads integer NOT NULL DEFAULT 0
      );
      CREATE TABLE public.app_config (id text PRIMARY KEY, data jsonb NOT NULL);
      CREATE FUNCTION public.create_secure_session(text, text) RETURNS jsonb
        LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION public.redeem_secure_session(text, text, text) RETURNS jsonb
        LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION public.redeem_access_key(text, text) RETURNS text
        LANGUAGE sql AS $$ SELECT 'ok'::text $$;
      GRANT EXECUTE ON FUNCTION public.redeem_access_key(text, text) TO PUBLIC;
      GRANT EXECUTE ON FUNCTION public.create_secure_session(text, text) TO PUBLIC;
      GRANT EXECUTE ON FUNCTION public.redeem_secure_session(text, text, text) TO PUBLIC;
    `);

    await db.exec(migration);

    assert.equal(
      (await db.query("SELECT has_schema_privilege('anon','public','CREATE') AS allowed")).rows[0]
        .allowed,
      false,
    );
    assert.equal(
      (await db.query("SELECT has_schema_privilege('authenticated','public','CREATE') AS allowed"))
        .rows[0].allowed,
      false,
    );
    assert.equal(
      (await db.query("SELECT has_schema_privilege('service_role','public','CREATE') AS allowed"))
        .rows[0].allowed,
      true,
    );
    assert.equal(
      (await db.query("SELECT has_table_privilege('anon','public.user_xp','SELECT') AS allowed"))
        .rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await db.query(
          "SELECT has_table_privilege('authenticated','public.user_xp','SELECT') AS allowed",
        )
      ).rows[0].allowed,
      true,
    );
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege('anon','public.create_secure_session(text,text)','EXECUTE') AS allowed",
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege('anon','public.redeem_secure_session(text,text,text)','EXECUTE') AS allowed",
        )
      ).rows[0].allowed,
      false,
    );
    const profilePolicies = (
      await db.query(
        "SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles'",
      )
    ).rows.map((row) => row.policyname);
    assert.equal(profilePolicies.includes("profiles_select_all"), false);
    assert.equal(profilePolicies.includes("profiles_public_safe_read"), true);

    await db.query("INSERT INTO public.user_xp(user_id,xp) VALUES ($1,10),($2,20)", [
      uuid(1),
      uuid(2),
    ]);
    await db.query("INSERT INTO public.user_streaks(user_id,current_streak) VALUES ($1,3),($2,7)", [
      uuid(1),
      uuid(2),
    ]);
    await db.query(
      "INSERT INTO public.user_achievements(user_id,achievement_key) VALUES ($1,'first'),($2,'master')",
      [uuid(1), uuid(2)],
    );

    const runAs = async (role, userId, sql, params = []) => {
      await db.exec(`SET ROLE ${role}`);
      try {
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId ?? ""]);
        return await db.query(sql, params);
      } finally {
        await db.exec("RESET ROLE");
        await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
      }
    };

    await assert.rejects(runAs("anon", null, "SELECT * FROM public.user_xp"), /permission denied/);
    assert.deepEqual(
      (await runAs("authenticated", uuid(1), "SELECT xp FROM public.user_xp ORDER BY xp")).rows,
      [{ xp: 10 }],
    );
    assert.deepEqual(
      (await runAs("authenticated", uuid(1), "SELECT current_streak FROM public.user_streaks"))
        .rows,
      [{ current_streak: 3 }],
    );
    assert.deepEqual(
      (
        await runAs(
          "authenticated",
          uuid(1),
          "SELECT achievement_key FROM public.user_achievements ORDER BY achievement_key",
        )
      ).rows,
      [{ achievement_key: "first" }],
    );

    await db.query(
      "INSERT INTO public.mod_overrides(slug,mega_enc,version) VALUES ('fire','encrypted-link','1.2.3')",
    );
    const unauthenticated = await runAs(
      "authenticated",
      null,
      "SELECT public.create_secure_session('fire','device-fp') AS result",
    );
    assert.equal(unauthenticated.rows[0].result.error, "authentication_required");

    const minted = await runAs(
      "authenticated",
      uuid(1),
      "SELECT public.create_secure_session('fire','device-fp') AS result",
    );
    const token = minted.rows[0].result.token;
    assert.ok(token);
    const session = (await db.query("SELECT data FROM public.secure_sessions WHERE id=$1", [token]))
      .rows[0].data;
    assert.equal(session.userId, uuid(1));
    assert.equal(session.version, "1.2.3");

    await db.query(
      "UPDATE public.secure_sessions SET data=jsonb_set(data,'{timestamp}',to_jsonb($2::bigint)) WHERE id=$1",
      [token, Date.now() - 60_000],
    );
    const redeem = (uid, version) =>
      runAs(
        "authenticated",
        uid,
        "SELECT public.redeem_secure_session($1,'device-fp',$2) AS result",
        [token, version],
      );
    assert.equal((await redeem(uuid(2), "1.2.3")).rows[0].result.error, "account_mismatch");
    assert.equal((await redeem(uuid(1), "1.2.2")).rows[0].result.error, "version_mismatch");
    const redeemed = (await redeem(uuid(1), "1.2.3")).rows[0].result;
    assert.equal(redeemed.ok, true);
    assert.equal(redeemed.link, "encrypted-link");
    assert.equal(redeemed.encrypted, true);
    assert.equal(
      (await db.query("SELECT real_downloads FROM public.mod_overrides WHERE slug='fire'")).rows[0]
        .real_downloads,
      1,
    );
    assert.equal(
      (
        await db.query(
          "SELECT (data->>'used')::boolean AS used FROM public.secure_sessions WHERE id=$1",
          [token],
        )
      ).rows[0].used,
      true,
    );
  } finally {
    await db.close();
  }
});
