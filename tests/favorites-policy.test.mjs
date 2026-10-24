import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("reviewed favorites SELECT policy preserves self/owner reads and own writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to anon, authenticated;
      create type public.app_role as enum ('owner');
      create function public.has_role(_user_id uuid, _role public.app_role) returns boolean
        language sql stable security definer set search_path=public as $$
        select _user_id = '${uuid(9)}'::uuid and _role = 'owner'::public.app_role
      $$;
      create table public.favorites(user_id uuid not null, mod_slug text not null, primary key(user_id,mod_slug));
      grant select on public.favorites to anon, authenticated;
      grant insert,delete on public.favorites to authenticated;
      alter table public.favorites enable row level security;
      create policy favorites_public_read on public.favorites for select using (true);
      create policy favorites_insert_own on public.favorites for insert to authenticated with check (auth.uid()=user_id);
      create policy favorites_delete_own on public.favorites for delete to authenticated using (auth.uid()=user_id);
      insert into public.favorites values ('${uuid(1)}','fire'),('${uuid(2)}','water'),('${uuid(9)}','earth');
    `);
    const as = async (role, user, sql) => {
      await db.exec(`set role ${role};`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
      try {
        return (await db.query(sql)).rows;
      } finally {
        await db.exec("reset role;");
      }
    };
    const read = "select mod_slug from public.favorites order by mod_slug";
    assert.equal((await as("anon", null, read)).length, 3);
    const unchanged = (
      await db.query(
        "select policyname,cmd,roles,qual,with_check from pg_policies where tablename='favorites' and cmd <> 'SELECT' order by policyname",
      )
    ).rows;
    const before = (await db.query("select * from public.favorites order by user_id,mod_slug"))
      .rows;
    const review = await readFile(
      new URL("../docs/royal-void-evolution/FAVORITES-SECURITY-REVIEW.md", import.meta.url),
      "utf8",
    );
    const approvedSql = review.match(/```sql\s+([\s\S]*?)```/)[1];
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20261024040729_favorites_select_self_or_owner.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.equal(migration.replaceAll("\r\n", "\n").trim(), approvedSql.trim());
    await db.exec(migration);
    assert.deepEqual(
      (await db.query("select * from public.favorites order by user_id,mod_slug")).rows,
      before,
    );
    assert.deepEqual(
      (
        await db.query(
          "select policyname,cmd,roles,qual,with_check from pg_policies where tablename='favorites' and cmd <> 'SELECT' order by policyname",
        )
      ).rows,
      unchanged,
    );
    assert.deepEqual(await as("anon", null, read), []);
    assert.deepEqual(await as("authenticated", null, read), []);
    assert.deepEqual(await as("authenticated", uuid(1), read), [{ mod_slug: "fire" }]);
    assert.deepEqual(await as("authenticated", uuid(2), read), [{ mod_slug: "water" }]);
    assert.equal((await as("authenticated", uuid(9), read)).length, 3);
    assert.deepEqual(
      await as(
        "authenticated",
        uuid(1),
        `insert into public.favorites values ('${uuid(1)}','spirit') returning mod_slug`,
      ),
      [{ mod_slug: "spirit" }],
    );
    await assert.rejects(
      as("authenticated", uuid(1), `insert into public.favorites values ('${uuid(2)}','spirit')`),
      /row-level security/,
    );
    assert.deepEqual(
      await as(
        "authenticated",
        uuid(1),
        `delete from public.favorites where user_id='${uuid(2)}' returning mod_slug`,
      ),
      [],
    );
    assert.deepEqual(
      await as(
        "authenticated",
        uuid(1),
        "delete from public.favorites where mod_slug='spirit' returning mod_slug",
      ),
      [{ mod_slug: "spirit" }],
    );
    assert.equal((await as("authenticated", uuid(9), read)).length, 3);
    // Owner read visibility does not grant cross-user writes.
    assert.deepEqual(
      await as(
        "authenticated",
        uuid(9),
        `delete from public.favorites where user_id='${uuid(1)}' returning mod_slug`,
      ),
      [],
    );
  } finally {
    await db.close();
  }
});
