import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const source = stripTypeScriptTypes(
  (await readFile(new URL("../src/lib/brandLogoStorage.ts", import.meta.url), "utf8")).replace(
    /^import type[^;]+;/m,
    "",
  ),
);
const { removeUnusedBrandLogo } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const base = "https://fixture.test/storage/v1/object/public/avatars/";
function fixture(value) {
  const removed = [];
  const client = {
    storage: {
      from: () => ({
        getPublicUrl: (p) => ({ data: { publicUrl: base + p } }),
        remove: async (paths) => {
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { value }, error: null }) }) }),
    }),
  };
  return { client, removed };
}
test("cleanup deletes only replaced owner-managed logos and retains live favicon and preview references", async () => {
  const old = base + "branding/owner/old.webp",
    f = fixture({ logoUrl: base + "branding/owner/new.webp" });
  await removeUnusedBrandLogo(f.client, old, "owner");
  assert.deepEqual(f.removed, ["branding/owner/old.webp"]);
  for (const field of ["logoUrl", "faviconUrl", "previewImageUrl"]) {
    const f = fixture({ [field]: old });
    await removeUnusedBrandLogo(f.client, old, "owner");
    assert.deepEqual(f.removed, []);
  }
  for (const url of [
    "https://other.test/storage/v1/object/public/avatars/branding/owner/old.webp",
    base + "branding/another/old.webp",
    base + "profile/old.webp",
    "/default.png",
  ]) {
    await removeUnusedBrandLogo(f.client, url, "owner");
  }
  assert.equal(f.removed.length, 1);
});
test("cleanup refuses deletion when the saved branding state cannot be confirmed", async () => {
  const f = fixture(null);
  f.client.from = () => ({
    select: () => ({
      eq: () => ({ single: async () => ({ data: null, error: Error("offline") }) }),
    }),
  });
  await assert.rejects(removeUnusedBrandLogo(f.client, base + "branding/owner/old.webp", "owner"));
  assert.deepEqual(f.removed, []);
});
