import { expect, test } from "@playwright/test";

test("community writes recover from denial and replies cannot be posted twice", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic identity and community writes are confined to intercepted localhost traffic.",
  );
  test.setTimeout(90_000);
  const id = "00000000-0000-4000-8000-000000000001";
  const commentId = "00000000-0000-4000-8000-000000000002";
  const otherId = "00000000-0000-4000-8000-000000000004";
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id,
    email: "fixture@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "local-fixture-only",
          expires_at: expires,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
    },
    { user, token, expires },
  );
  let comments = [
    {
      id: commentId,
      mod_slug: "thunder-arena",
      user_id: id,
      body: "Fixture review one",
      parent_id: null as string | null,
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      mod_slug: "thunder-arena",
      user_id: otherId,
      body: "Fixture review two",
      parent_id: null as string | null,
      created_at: "2026-10-01T09:00:00Z",
    },
  ];
  let likes: { comment_id: string; user_id: string }[] = [];
  let reactions = [{ user_id: otherId, reaction: "fire" }];
  let denyLike = true,
    denyReaction = true,
    denyReactionRead = true,
    denyReply = true;
  let deleteMode: "deny" | "empty" | "allow" = "deny";
  let emptyLikeDelete = false,
    emptyReactionDelete = false;
  let replies = 0;
  let releaseReply: (() => void) | undefined;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let data: unknown = [],
      status = 200;
    const denied = () => {
      status = 403;
      data = { message: "Isolated fixture denial" };
    };
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile"))
      data = [
        {
          id,
          username: "fixture",
          display_name: "Fixture Trainer",
          is_owner: false,
          avatar_url: null,
          custom_avatar_url: null,
        },
      ];
    else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    else if (url.pathname.endsWith("/public_profiles"))
      data = url.searchParams.has("is_owner")
        ? { display_name: "Fixture Sender", avatar_url: null, custom_avatar_url: null }
        : [
            {
              id,
              username: "fixture",
              display_name: "Fixture Trainer",
              is_owner: false,
              avatar_url: null,
              custom_avatar_url: null,
            },
            {
              id: otherId,
              username: "other",
              display_name: "Other Trainer",
              is_owner: false,
              avatar_url: null,
              custom_avatar_url: null,
            },
          ];
    else if (url.pathname.endsWith("/comments")) {
      if (method === "GET") data = comments;
      else if (method === "POST") {
        replies++;
        if (denyReply) {
          await new Promise<void>((resolve) => {
            releaseReply = resolve;
          });
          denied();
        } else {
          const body = request.postDataJSON();
          comments = [
            ...comments,
            {
              ...body,
              id: "00000000-0000-4000-8000-000000000005",
              created_at: "2026-10-01T11:00:00Z",
            },
          ];
          status = 201;
        }
      } else if (method === "DELETE") {
        if (deleteMode === "deny") denied();
        else if (deleteMode === "allow") {
          comments = comments.filter((row) => row.id !== commentId && row.parent_id !== commentId);
          data = [{ id: commentId }];
        }
      }
    } else if (url.pathname.endsWith("/comment_likes")) {
      if (method === "GET") data = likes;
      else if (denyLike) denied();
      else if (method === "POST") {
        likes = [{ comment_id: commentId, user_id: id }];
        status = 201;
      } else if (!emptyLikeDelete) {
        data = likes;
        likes = [];
      }
    } else if (url.pathname.endsWith("/comment_reactions")) {
      if (method === "GET") {
        if (url.searchParams.get("comment_id") === `eq.${commentId}`) {
          if (denyReactionRead) denied();
          else data = reactions;
        }
      } else if (denyReaction) denied();
      else if (method === "POST") {
        reactions = [...reactions, { user_id: id, reaction: "fire" }];
        status = 201;
      } else if (!emptyReactionDelete) {
        data = reactions.filter((row) => row.user_id === id);
        reactions = reactions.filter((row) => row.user_id !== id);
      }
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/mods/thunder-arena", { waitUntil: "networkidle" });
  const review = page.locator(`[data-comment-id="${commentId}"]`);
  await expect(review).toBeVisible();
  const like = review.getByRole("button", { name: "Like review by Fixture Trainer", exact: true });
  await like.click();
  await expect(
    page.getByText("Could not update review like. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  denyLike = false;
  await like.click();
  await expect(
    review.getByRole("button", { name: "Unlike review by Fixture Trainer", exact: true }),
  ).toHaveText("1");
  const unlike = review.getByRole("button", {
    name: "Unlike review by Fixture Trainer",
    exact: true,
  });
  denyLike = true;
  await unlike.click();
  await expect(
    page.getByText("Could not update review like. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(unlike).toHaveAttribute("aria-pressed", "true");
  denyLike = false;
  emptyLikeDelete = true;
  await unlike.click();
  await expect(unlike).toBeEnabled();
  await expect(unlike).toHaveText("1");
  emptyLikeDelete = false;
  await unlike.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  const reactionGroup = review.getByRole("group", { name: "Elemental reactions" });
  await expect(
    reactionGroup.getByRole("button", { name: "Add fire reaction", exact: true }),
  ).toBeDisabled();
  denyReactionRead = false;
  await reactionGroup.getByRole("button", { name: "Retry reactions" }).click();
  const fire = reactionGroup.getByRole("button", { name: "Add fire reaction", exact: true });
  await expect(fire).toBeEnabled();
  await fire.click();
  await expect(
    page.getByText("Could not update reaction. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(fire).toHaveAttribute("aria-pressed", "false");
  await expect(fire).toContainText("1");
  denyReaction = false;
  await fire.click();
  await expect(
    reactionGroup.getByRole("button", { name: "Remove fire reaction", exact: true }),
  ).toContainText("2");
  const removeFire = reactionGroup.getByRole("button", {
    name: "Remove fire reaction",
    exact: true,
  });
  denyReaction = true;
  await removeFire.click();
  await expect(
    page.getByText("Could not update reaction. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(removeFire).toHaveAttribute("aria-pressed", "true");
  denyReaction = false;
  emptyReactionDelete = true;
  await removeFire.click();
  await expect(removeFire).toBeEnabled();
  await expect(removeFire).toContainText("2");
  emptyReactionDelete = false;
  await removeFire.click();
  await expect(fire).toHaveAttribute("aria-pressed", "false");
  await expect(fire).toContainText("1");
  await review.getByRole("button", { name: "Reply", exact: true }).click();
  const draft = review.getByRole("textbox", { name: "Reply to Fixture Trainer", exact: true });
  await draft.fill("A preserved fixture reply");
  await review.getByRole("button", { name: "Post reply", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => replies).toBe(1);
  await expect(draft).toBeDisabled();
  await expect(review.getByRole("button", { name: "Posting…", exact: true })).toBeDisabled();
  releaseReply!();
  await expect(
    page.getByText("Could not post reply. Your draft is still here.", { exact: true }),
  ).toBeVisible();
  await expect(draft).toHaveValue("A preserved fixture reply");
  denyReply = false;
  await review.getByRole("button", { name: "Post reply", exact: true }).click();
  await expect(review.getByText("A preserved fixture reply", { exact: true })).toBeVisible();
  expect(replies).toBe(2);
  for (const mode of ["deny", "empty", "allow"] as const) {
    deleteMode = mode;
    await review.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    if (mode !== "allow") {
      await expect(
        page.getByText("Could not delete review. It is still visible; refresh and try again.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(review).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`community-delete-${mode}.png`) });
    }
  }
  await expect(review).toHaveCount(0);
  await expect(page.getByText("Fixture review two", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
