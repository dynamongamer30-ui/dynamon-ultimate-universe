import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = await readFile(new URL("../src/lib/communityReads.ts", import.meta.url), "utf8");
const { readCommunityRows, readCommunityIds } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
test("community reads collect rows beyond a response boundary", async () => {
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const calls = [];
  assert.deepEqual(
    await readCommunityRows(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    }),
    rows,
  );
  assert.deepEqual(calls, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});
test("community reads reject a failed later page instead of returning partial totals", async () => {
  await assert.rejects(
    readCommunityRows(async (from) =>
      from === 0
        ? { data: Array(500).fill(1), error: null }
        : { data: null, error: new Error("Denied page") },
    ),
    /Denied page/,
  );
});
test("community ID reads deduplicate and bound filters, and skip empty filters", async () => {
  const ids = Array.from({ length: 101 }, (_, i) => String(i));
  const calls = [];
  assert.deepEqual(
    await readCommunityIds([...ids, ...ids], async (group) => {
      calls.push(group.length);
      return { data: group, error: null };
    }),
    ids,
  );
  assert.deepEqual(calls, [100, 1]);
  assert.deepEqual(
    await readCommunityIds([], () => {
      throw Error("should not read");
    }),
    [],
  );
});
