import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = await readFile(new URL("../src/lib/reactionCounts.ts", import.meta.url), "utf8");
const { parseReactionCounts, setOwnReaction } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
const row = { comment_id: "root", reaction: "fire", total: 1205, mine: true };

test("reaction counts accept bounded aggregates without voter identities", () => {
  assert.deepEqual(parseReactionCounts([], ["root"]), []);
  assert.deepEqual(parseReactionCounts([row], ["root"]), [
    { comment_id: "root", reaction: "fire", count: 1205, mine: true },
  ]);
  const ids = Array.from({ length: 10 }, (_, i) => String(i));
  const groups = ids.flatMap((comment_id) =>
    ["fire", "water", "thunder", "leaf", "spirit"].map((reaction) => ({
      ...row,
      comment_id,
      reaction,
    })),
  );
  assert.equal(parseReactionCounts(groups, ids).length, 50);
});

test("malformed, duplicate and unrequested reaction counts fail closed", () => {
  for (const value of [
    null,
    {},
    [null],
    [row, row],
    [{ ...row, comment_id: "other" }],
    [{ ...row, reaction: "unknown" }],
    [{ ...row, mine: 1 }],
    ...[0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, "1"].map((total) => [{ ...row, total }]),
  ]) {
    assert.throws(() => parseReactionCounts(value, ["root"]));
  }
});

test("optimistic settlement and rollback change only the caller contribution", () => {
  const original = [
    { reaction: "fire", count: 1205, mine: false },
    { reaction: "water", count: 9, mine: true },
  ];
  const added = setOwnReaction(original, "fire", true);
  assert.equal(added.find((r) => r.reaction === "fire").count, 1206);
  assert.deepEqual(setOwnReaction(added, "fire", true), added);
  assert.deepEqual(
    setOwnReaction(added, "fire", false).sort((a, b) => a.reaction.localeCompare(b.reaction)),
    original,
  );
  const newer = [{ reaction: "fire", count: 1300, mine: true }];
  assert.deepEqual(setOwnReaction(newer, "fire", false), [
    { reaction: "fire", count: 1299, mine: false },
  ]);
  assert.deepEqual(setOwnReaction([{ reaction: "fire", count: 1, mine: true }], "fire", false), []);
  assert.deepEqual(setOwnReaction([], "fire", true), [{ reaction: "fire", count: 1, mine: true }]);
});
