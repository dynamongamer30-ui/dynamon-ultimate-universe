import { expect, test } from "@playwright/test";
import { fixtureReviewPage } from "./fixtures/community";

test("review pages keep global ranking and batch only visible reactions", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic community data is confined to intercepted localhost traffic.",
  );
  test.setTimeout(90000);
  const comments = Array.from({ length: 23 }, (_, i) => ({
    id: `review-${i}`,
    mod_slug: "thunder-arena",
    user_id: i === 22 ? "owner" : "trainer",
    body: `Pagination review ${i}`,
    parent_id: null as string | null,
    created_at: new Date(Date.UTC(2026, 9, 23 - i)).toISOString(),
  }));
  comments.push({
    ...comments[0],
    id: "reply",
    parent_id: "review-22",
    body: "Reply stays with owner",
  });
  for (let index = 1; index < 13; index++)
    comments.push({
      ...comments[0],
      id: "reply-" + String(index).padStart(2, "0"),
      parent_id: "review-22",
      body: "Paged reply " + index,
    });
  const authors = [
    { id: "owner", username: "owner", display_name: "Fixture owner", is_owner: true },
    {
      id: "trainer",
      username: "trainer",
      display_name: "Fixture trainer with a deliberately long display name",
      is_owner: false,
    },
  ];
  const likes = [{ comment_id: "review-21", user_id: "voter" }];
  const pages: number[] = [];
  let replyReads = 0,
    denyReplies = true,
    denyPage = false;
  const batches: string[][] = [];
  let snapshots = 0;
  let deny = false;
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    let status = 200;
    if (url.pathname.endsWith("/rpc/get_review_page")) {
      const number = Number(url.searchParams.get("p_page") ?? 0);
      pages.push(number);
      if (denyPage && number === 1) {
        status = 403;
        data = { message: "Fixture page denied" };
      } else data = fixtureReviewPage(comments, authors, likes, "thunder-arena", number);
    } else if (url.pathname.endsWith("/rpc/get_review_replies")) {
      replyReads++;
      if (denyReplies) {
        status = 403;
        data = { message: "Fixture replies denied" };
      } else {
        const all = comments
          .filter((c) => c.parent_id === "review-22")
          .sort((a, b) => a.id.localeCompare(b.id));
        const after = url.searchParams.get("p_after_id");
        const at = all.findIndex((c) => c.id === after) + 1;
        const enriched = fixtureReviewPage(comments, authors, likes, "thunder-arena").threads[0];
        data = {
          total: all.length,
          hasMore: at + 5 < all.length,
          replies: all
            .slice(at, at + 5)
            .map((c) => ({ ...c, author: enriched.author, likeCount: 0, likedByMe: false })),
        };
      }
    } else if (url.pathname.endsWith("/comments")) {
      snapshots++;
      data = comments;
    } else if (url.pathname.endsWith("/public_profiles"))
      data = url.searchParams.has("is_owner")
        ? null
        : [
            { id: "owner", username: "owner", display_name: "Fixture owner", is_owner: true },
            {
              id: "trainer",
              username: "trainer",
              display_name: "Fixture trainer with a deliberately long display name",
              is_owner: false,
            },
          ];
    else if (url.pathname.endsWith("/comment_likes"))
      data = [{ comment_id: "review-21", user_id: "voter" }];
    else if (url.pathname.endsWith("/rpc/get_review_reaction_counts")) {
      const filter = url.searchParams.get("p_comment_ids") ?? "";
      const ids = filter.slice(1, -1).split(",");
      batches.push(ids);
      if (deny) {
        status = 403;
        data = { message: "Fixture read denied" };
      } else
        data = ids.map((comment_id) => ({ comment_id, total: 1, mine: false, reaction: "fire" }));
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/mods/thunder-arena", { waitUntil: "networkidle" });
  const roots = page.locator('[data-review-thread="true"]');
  await expect(roots).toHaveCount(10);
  await expect(
    page
      .locator("#comments")
      .getByText("Reviews", { exact: true })
      .locator("..")
      .getByText("23", { exact: true }),
  ).toBeVisible();
  await expect(roots.nth(0)).toHaveAttribute("data-comment-id", "review-22");
  await expect(roots.nth(1)).toHaveAttribute("data-comment-id", "review-21");
  await expect(page.getByText("Reply stays with owner", { exact: true })).toBeVisible();
  await expect(page.getByText("Reviews 1–10 of 23", { exact: true })).toBeVisible();
  await expect.poll(() => batches.length).toBe(1);
  expect(batches[0]).toHaveLength(10);
  const first = batches[0];
  const snapshotReads = snapshots;
  const owner = roots.first();
  await expect(owner.locator("[data-comment-id]")).toHaveCount(5);
  await owner.getByRole("button", { name: /Load more replies/ }).click();
  await expect(owner.getByRole("button", { name: /Retry more replies/ })).toBeVisible();
  await expect(owner.locator("[data-comment-id]")).toHaveCount(5);
  denyReplies = false;
  await owner.getByRole("button", { name: /Retry more replies/ }).click();
  await expect(owner.locator("[data-comment-id]")).toHaveCount(10);
  await owner.getByRole("button", { name: /Load more replies/ }).click();
  await expect(owner.locator("[data-comment-id]")).toHaveCount(13);
  await expect(owner.getByRole("button", { name: /Load more replies/ })).toHaveCount(0);
  expect(replyReads).toBe(3);
  denyPage = true;
  deny = true;
  await page.getByRole("button", { name: "Next reviews", exact: true }).click();
  await expect(
    page.getByText("Community activity could not be loaded.", { exact: true }),
  ).toBeVisible();
  denyPage = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Reviews 11–20 of 23", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry reactions" })).toBeVisible();
  await expect(roots).toHaveCount(10);
  expect(batches[1].every((id) => !first.includes(id))).toBe(true);
  deny = false;
  await page.getByRole("button", { name: "Retry reactions" }).click();
  await expect(page.getByRole("button", { name: "Retry reactions" })).toHaveCount(0);
  await page.getByRole("button", { name: "Next reviews", exact: true }).click();
  await expect(roots).toHaveCount(3);
  await expect(page.getByText("Reviews 21–23 of 23", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next reviews", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous reviews", exact: true }).click();
  await page.getByRole("button", { name: "Previous reviews", exact: true }).click();
  await expect(roots.first()).toHaveAttribute("data-comment-id", "review-22");
  await expect(page.getByText("Reply stays with owner", { exact: true })).toBeVisible();
  expect(snapshots).toBe(snapshotReads);
  expect(snapshots).toBe(0);
  expect(pages).toEqual([0, 1, 1, 2, 1, 0]);
  expect(batches.every((ids) => ids.length <= 10 && !ids.includes("reply"))).toBe(true);
  expect(
    await page.locator("#comments").evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return [...root.querySelectorAll(".glass, [data-review-thread]")].every((node) => {
        const box = node.getBoundingClientRect();
        return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
      });
    }),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole("heading", { name: "What trainers are saying" })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("community-pagination.png"), fullPage: false });
  await page
    .getByRole("navigation", { name: "Review pages", exact: true })
    .screenshot({ path: testInfo.outputPath("community-pagination-controls.png") });
});
