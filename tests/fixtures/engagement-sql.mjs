import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const migration = (name) =>
  readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
export const base = await migration("20260629193148_3dc48fdd-e6dd-45b6-98c0-2be453c770a8");
export const hardened = await migration("20261002094500_harden_engagement_rewards");
export const validated = await migration("20261002095000_validate_engagement_targets");
export const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function functionSql(sql, name) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.notEqual(start, -1, `Missing canonical function ${name}`);
  const end = sql.indexOf("$$;", start);
  assert.notEqual(end, -1, `Unterminated canonical function ${name}`);
  return sql.slice(start, end + 3);
}

export async function setupEngagement(db) {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated;
  `);
  await db.exec(base.slice(0, base.indexOf("-- FAVORITES")));
  await db.exec(`
    create table public.mod_overrides(slug text primary key);
    create table public.favorites(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    create table public.mod_likes(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    create table public.mod_ratings(user_id uuid references auth.users(id),mod_slug text,primary key(user_id,mod_slug));
    insert into auth.users values ('${uuid(1)}'),('${uuid(2)}');
    insert into public.mod_overrides select 'mod-'||i from generate_series(1,6)i;
  `);
  await db.exec(hardened.slice(0, hardened.indexOf("CREATE OR REPLACE FUNCTION")));
  for (const name of ["award_xp_internal", "grant_achievement_internal"])
    await db.exec(functionSql(hardened, name));
  await db.exec(functionSql(validated, "record_engagement"));
  await db.exec(`
    revoke execute on function public.record_engagement(text,text) from public,anon;
    grant execute on function public.record_engagement(text,text) to authenticated;
  `);
  await db.exec(await migration("20261022184046_protect_internal_progression_grants"));
}
