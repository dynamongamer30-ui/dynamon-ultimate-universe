import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = await readFile(new URL("../src/lib/communityPage.ts", import.meta.url), "utf8");
const { parseReviewPage, parseReplyPage } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
const root = {
  id: "root",
  mod_slug: "arena",
  user_id: "trainer",
  body: "Review",
  created_at: "2026-10-23T10:00:00Z",
  parent_id: null,
  author: null,
  likeCount: 3,
  likedByMe: false,
  replyCount: 0,
  replies: [],
};
const page = {
  page: 0,
  totalThreads: 1,
  reviewLikeCount: 13,
  ratingCount: 4,
  ratingSum: 16,
  threads: [root],
};
test("community page contracts retain totals separately from visible rows", () => {
  const result = parseReviewPage(page, "arena");
  assert.equal(result.reviewLikeCount, 13);
  assert.equal(result.threads[0].likeCount, 3);
  assert.equal(result.threads[0].author, undefined);
  assert.equal(result.ratingCount, 4);
});
test("malformed, wrong-mod and unbounded responses fail instead of showing partial totals", () => {
  for (const malformed of [
    null,
    [],
    { ...page, totalThreads: 2 },
    { ...page, page: 1 },
    { ...page, ratingSum: 99 },
    { ...page, threads: [{ ...root, mod_slug: "other" }] },
    { ...page, threads: [{ ...root, likeCount: -1 }] },
    { ...page, threads: [{ ...root, created_at: "not-a-date" }] },
    { ...page, totalThreads: 11, threads: Array(11).fill(root) },
  ])
    assert.throws(() => parseReviewPage(malformed, "arena"), /incomplete/);
});
test("reply contracts enforce parent identity, response limits and valid totals", () => {
  const reply = { ...root, id: "reply", parent_id: "root" };
  assert.equal(
    parseReplyPage({ replies: [reply], total: 6, hasMore: true }, "root", "arena").replies.length,
    1,
  );
  for (const malformed of [
    { replies: [reply], total: 0, hasMore: false },
    { replies: [{ ...reply, parent_id: "wrong" }], total: 1, hasMore: false },
    { replies: Array(6).fill(reply), total: 6, hasMore: false },
  ])
    assert.throws(() => parseReplyPage(malformed, "root", "arena"), /incomplete/);
});

test("incomplete public profiles preserve names and safe username fallbacks", () => {
  const data = {
    ...page,
    threads: [
      {
        ...root,
        author: {
          id: "trainer",
          username: null,
          display_name: "Existing trainer",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: null,
        },
      },
    ],
  };
  const author = parseReviewPage(data, "arena").threads[0].author;
  assert.equal(author.username, null);
  assert.equal(author.display_name, "Existing trainer");
  assert.equal(author.is_owner, false);
});
