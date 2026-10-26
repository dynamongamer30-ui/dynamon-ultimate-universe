import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source =
  readFileSync(new URL("../src/lib/versionSort.ts", import.meta.url), "utf8") +
  readFileSync(new URL("../src/lib/botCatalog.ts", import.meta.url), "utf8").replace(
    'import { compareVersions } from "./versionSort";',
    "",
  );
const { buildBotCatalog } = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const base = [
  {
    slug: "old",
    name: "Old",
    version: "1.13.42",
    updated: "2026-10-24",
    size: "10 MB",
    changelog: [],
  },
  {
    slug: "new",
    name: "New",
    version: "1.13.42",
    updated: "2026-10-25",
    size: "11 MB",
    changelog: [],
  },
  {
    slug: "hidden",
    name: "Hidden",
    version: "9.0",
    updated: "2026-10-26",
    size: "10 MB",
    changelog: [],
  },
];
test("published overrides drive version/changelog/navigation without leaking protected downloads", () => {
  const rows = [
    {
      slug: "new",
      version: "1.13.43",
      changelog: [{ version: "1.13.43", date: "2026-10-26", notes: ["Updated"] }],
      mega_enc: "PRIVATE-CIPHERTEXT",
      download_url: "https://private.example/file",
      follow_enc: "PRIVATE-GATE",
    },
    { slug: "hidden", hidden: true },
  ];
  const result = buildBotCatalog(base, rows);
  assert.equal(result.latestSlug, "new");
  assert.equal(result.releases.length, 2);
  assert.equal(result.releases[0].version, "1.13.43");
  assert.equal(result.releases[0].downloadUrl, "https://dynamongamer.com/mods/new#download");
  assert.equal(result.releases[0].keyUrl, "https://dynamongamer.com/links/get-key");
  assert.deepEqual(result.releases[0].changelog[0].notes, ["Updated"]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|private\.example|mega_enc|follow_enc/);
  assert.equal(base[1].version, "1.13.42");
});
test("empty public catalog and malformed changelog are handled without invented releases", () => {
  assert.deepEqual(buildBotCatalog([], []), { schema: 1, releases: [], latestSlug: null });
  assert.deepEqual(
    buildBotCatalog(
      [base[0]],
      [{ slug: "old", changelog: [null, { version: "x", notes: ["safe", 123] }] }],
    ).releases[0].changelog[0].notes,
    ["safe"],
  );
});

test("latest version follows website numeric version ordering even when another edition was edited later", () => {
  const result = buildBotCatalog(
    [base[0], base[1]],
    [
      { slug: "old", version: "v1.13.43", updated_date: "2026-10-01" },
      { slug: "new", version: "1.13.42", updated_date: "2026-10-26" },
    ],
  );
  assert.equal(result.latestSlug, "old");
});
