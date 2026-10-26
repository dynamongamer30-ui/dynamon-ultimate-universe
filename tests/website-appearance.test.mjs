import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

let row;
let denied = false;
globalThis.__appearanceTestClient = {
  from(table) {
    assert.equal(table, "site_settings");
    let write;
    let insert = false;
    const filters = {};
    const query = {
      insert(value) {
        write = value.value;
        insert = true;
        return query;
      },
      update(value) {
        write = value.value;
        return query;
      },
      eq(key, value) {
        filters[key] = value;
        return query;
      },
      select() {
        return query;
      },
      abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal);
        return query;
      },
      retry(value) {
        assert.equal(value, false);
        return query;
      },
      maybeSingle() {
        return query;
      },
      async then(resolve, reject) {
        try {
          resolve(await query.result());
        } catch (error) {
          reject(error);
        }
      },
      async result() {
        if (denied) return { data: null, error: { message: "permission denied" } };
        if (insert && row !== undefined) return { data: null, error: { message: "duplicate key" } };
        if (
          !insert &&
          (filters.key !== "website_appearance" || filters.value !== JSON.stringify(row))
        )
          return { data: null, error: null };
        row = structuredClone(write);
        return { data: { key: "website_appearance" }, error: null };
      },
    };
    return query;
  },
};
let source = stripTypeScriptTypes(
  await readFile(new URL("../src/lib/websiteAppearance.ts", import.meta.url), "utf8"),
);
source = source
  .replace(
    /import\s*\{\s*supabase\s*\}\s*from\s*[^;]+;/,
    "const supabase=globalThis.__appearanceTestClient;",
  )
  .replace(
    /import\s*\{\s*WEBSITE_APPEARANCE_KEY\s*,?\s*\}\s*from\s*[^;]+;/,
    'const WEBSITE_APPEARANCE_KEY="website_appearance";',
  );
const { publishWebsiteAppearance } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
test("appearance publication refuses stale snapshots, duplicate creation and denied access", async () => {
  const first = {
    schema: 1,
    defaultTheme: "royal-black",
    enabledThemes: ["royal-black"],
    palettes: {},
  };
  const second = { ...first, defaultTheme: "fire", enabledThemes: ["fire"] };
  await publishWebsiteAppearance(first, undefined);
  await assert.rejects(publishWebsiteAppearance(second, undefined), /duplicate key/);
  assert.deepEqual(row, first);
  await publishWebsiteAppearance(second, first);
  await assert.rejects(publishWebsiteAppearance(first, first), /changed in another session/);
  assert.deepEqual(row, second);
  denied = true;
  await assert.rejects(publishWebsiteAppearance(first, second), /permission denied/);
  assert.deepEqual(row, second);
});
