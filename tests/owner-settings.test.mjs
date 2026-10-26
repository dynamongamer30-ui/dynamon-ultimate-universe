import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { PGlite } from "@electric-sql/pglite";

test("owner snapshot writes use atomic SQL predicates and preserve concurrent changes", async () => {
  const db = new PGlite();
  const calls = [];
  try {
    await db.exec(`create table site_settings(key text primary key,value jsonb);
      create table app_config(id text primary key,data jsonb);
      create table mod_overrides(slug text primary key,name text,tagline text,description text,
        version text,size text,updated_date text,youtube_id text,features jsonb,changelog jsonb,
        downloads_absolute int,likes_absolute int,seed_rating_points numeric,seed_rating_count int,
        seed_review_likes int,download_url text,mega_enc text,follow_enc text,
        hidden boolean,featured boolean,real_downloads int default 0);`);
    const client = createClient("https://fixture.supabase.test", "public-local-fixture", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: async (input, options) => {
          const url = new URL(String(input));
          const table = url.pathname.split("/").pop();
          assert.ok(["site_settings", "app_config", "mod_overrides"].includes(table));
          const method = options.method;
          calls.push({ method, filters: [...url.searchParams] });
          const args = [];
          const bind = (value) => {
            args.push(value);
            return `$${args.length}`;
          };
          const quote = (key) => {
            assert.match(key, /^[a-z_]+$/);
            return `"${key}"`;
          };
          const body = options.body ? JSON.parse(options.body) : {};
          const fields = Object.keys(body);
          const encoded = (key) => {
            const json =
              table === "mod_overrides"
                ? ["features", "changelog"].includes(key)
                : ["value", "data"].includes(key);
            return json && body[key] !== null ? JSON.stringify(body[key]) : body[key];
          };
          let sql;
          if (method === "POST")
            sql = `insert into ${table} (${fields.map(quote)}) values (${fields.map((key) => bind(encoded(key)))})`;
          else if (method === "PATCH")
            sql = `update ${table} set ${fields.map((key) => `${quote(key)}=${bind(encoded(key))}`).join(",")}`;
          else {
            assert.equal(method, "DELETE");
            sql = `delete from ${table}`;
          }
          const predicates = [];
          for (const [key, filter] of url.searchParams) {
            if (key === "select") continue;
            if (filter === "is.null") predicates.push(`${quote(key)} is null`);
            else {
              assert.ok(filter.startsWith("eq."));
              predicates.push(`${quote(key)}=${bind(filter.slice(3))}`);
            }
          }
          if (predicates.length) sql += ` where ${predicates.join(" and ")}`;
          sql += ` returning ${quote(url.searchParams.get("select"))}`;
          try {
            const result = await db.query(sql, args);
            const single = new Headers(options.headers).get("accept")?.includes("object");
            return new Response(JSON.stringify(single ? (result.rows[0] ?? null) : result.rows), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ code: error.code, message: error.message }), {
              status: 409,
              headers: { "content-type": "application/json" },
            });
          }
        },
      },
    });
    globalThis.__ownerSnapshotClient = client;
    const source = stripTypeScriptTypes(
      await readFile(new URL("../src/lib/ownerSettings.ts", import.meta.url), "utf8"),
    ).replace(
      /import\s*\{\s*supabase\s*\}\s*from\s*[^;]+;/,
      "const supabase=globalThis.__ownerSnapshotClient;",
    );
    const { saveOwnerSetting, writeOwnerMod } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    const signal = new AbortController().signal;
    for (const table of ["site_settings", "app_config"]) {
      const first = { enabled: true, extra: "preserved" };
      const next = { enabled: false, extra: "preserved" };
      await saveOwnerSetting(table, "fixture", first, undefined, signal);
      await assert.rejects(
        saveOwnerSetting(table, "fixture", next, undefined, signal),
        /another session/,
      );
      await saveOwnerSetting(table, "fixture", next, { extra: "preserved", enabled: true }, signal);
      await assert.rejects(
        saveOwnerSetting(table, "fixture", first, first, signal),
        /another session/,
      );
      const column = table === "site_settings" ? "value" : "data";
      assert.deepEqual(
        (await db.query(`select ${column} as value from ${table}`)).rows[0].value,
        next,
      );
      await saveOwnerSetting(table, "null-fixture", null, undefined, signal);
      await saveOwnerSetting(table, "null-fixture", next, null, signal);
    }
    for (const [index, first] of ["Original title", true, 24, ["local"]].entries()) {
      const id = `scalar-${index}`;
      await saveOwnerSetting("app_config", id, first, undefined, signal);
      await saveOwnerSetting("app_config", id, "next", first, signal);
      await assert.rejects(
        saveOwnerSetting("app_config", id, "stale", first, signal),
        /another session/,
      );
    }
    await writeOwnerMod("fixture", { name: "Original", hidden: false }, undefined, signal);
    const old = (await db.query("select * from mod_overrides")).rows[0];
    await db.exec("update mod_overrides set real_downloads=99");
    await writeOwnerMod("fixture", { name: "Current", hidden: true }, old, signal);
    await assert.rejects(
      writeOwnerMod("fixture", { name: "Stale" }, old, signal),
      /another session/,
    );
    await assert.rejects(writeOwnerMod("fixture", null, old, signal), /another session/);
    const current = (await db.query("select * from mod_overrides")).rows[0];
    assert.equal(current.name, "Current");
    assert.equal(current.real_downloads, 99);
    await writeOwnerMod("fixture", null, current, signal);
    assert.equal((await db.query("select * from mod_overrides")).rows.length, 0);
    assert.ok(calls.every((call) => ["POST", "PATCH", "DELETE"].includes(call.method)));
  } finally {
    await db.close();
    delete globalThis.__ownerSnapshotClient;
  }
});
