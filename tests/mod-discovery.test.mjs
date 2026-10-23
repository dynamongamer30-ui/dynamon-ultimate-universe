import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = await readFile(new URL("../src/lib/modDiscovery.ts", import.meta.url), "utf8");
const { normalizeDiscoverySearch: normalize, DISCOVERY_BADGES } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
const empty = {
  q: undefined,
  sort: undefined,
  elements: undefined,
  rating: undefined,
  version: undefined,
};

test("discovery URLs retain combined settings and normalize repeated elements", () => {
  assert.deepEqual(
    normalize({
      q: "Fire Phoenix ",
      sort: "likes",
      elements: "fire,water,fire,bogus",
      rating: "4.5",
      version: "1.13.37",
    }),
    {
      q: "Fire Phoenix ",
      sort: "likes",
      elements: "fire,water",
      rating: 4.5,
      version: "1.13.37",
    },
  );
  assert.deepEqual(
    normalize({ q: "", sort: "latest", elements: "", rating: 0, version: "all" }),
    empty,
  );
});

test("malformed query values cannot break discovery or select unsupported filters", () => {
  assert.deepEqual(
    normalize({
      q: {},
      sort: "__proto__",
      elements: ["fire"],
      rating: true,
      version: "bad\nversion",
      extra: "ignored",
    }),
    empty,
  );
  assert.equal(normalize({ q: "x".repeat(500) }).q.length, 200);
  assert.deepEqual(
    normalize({ rating: Infinity, version: "x".repeat(81), sort: "constructor" }),
    empty,
  );
  assert.equal(DISCOVERY_BADGES.downloads, "Most downloaded");
  assert.equal(DISCOVERY_BADGES.likes, "Most liked");
  assert.equal(DISCOVERY_BADGES.newest, "Recently updated");
});
