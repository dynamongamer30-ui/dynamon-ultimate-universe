import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { createCampaignHandler } from "../supabase/functions/website-campaign/handler.js";
const origin = "https://dynamongamer.com",
  secret = "s".repeat(40);
const env = {
  SITE_ORIGIN: origin,
  SUPABASE_URL: "https://database.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-test",
  CAMPAIGN_PROXY_SECRET: "proxy-secret",
  TURNSTILE_SECRET_KEY: "turnstile",
};
function setup() {
  const calls = [],
    state = { verified: true, challenge: true, ready: true, action: "phoenix_claim" };
  const handler = createCampaignHandler(env, async (url, opts = {}) => {
    const body = opts.body instanceof URLSearchParams ? {} : JSON.parse(opts.body || "{}");
    calls.push({ url, body });
    if (url.endsWith("/auth/v1/user"))
      return Response.json({ id: "member-a", email_confirmed_at: state.verified ? "date" : null });
    if (url.includes("siteverify"))
      return Response.json({
        success: state.challenge,
        hostname: "dynamongamer.com",
        action: state.action,
      });
    if (url.endsWith("/website_campaign_rate")) return Response.json(true);
    if (url.endsWith("/website_campaign_status")) return Response.json({ slug: "bonus" });
    if (url.endsWith("/website_telegram_claim")) {
      if (body.p_action === "config")
        return Response.json({
          ready: state.ready,
          username: "example_bot",
          secret_hash: createHash("sha256").update(secret).digest("hex"),
        });
      return Response.json({ ok: true, awarded: body.p_action === "redeem" });
    }
    throw Error("Unexpected request");
  });
  const post = async (body, extra = {}) => {
    const text = JSON.stringify(body),
      stamp = String(Date.now()),
      ip = "192.0.2.1";
    const proof = createHmac("sha256", env.CAMPAIGN_PROXY_SECRET)
      .update(["proxy", stamp, "bonus", ip, text].join("\n"))
      .digest("hex");
    return handler(
      new Request("https://edge.test?campaign=bonus", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          authorization: "Bearer user-token",
          "x-dg-proxy-ip": ip,
          "x-dg-proxy-time": stamp,
          "x-dg-proxy-proof": proof,
          ...extra,
        },
        body: text,
      }),
    );
  };
  return { handler, calls, state, post };
}
test("claims require signed proxy, website sign-in and server Turnstile verification", async () => {
  const f = setup();
  assert.equal(
    (await f.post({ action: "claim", token: "test" }, { "x-dg-proxy-proof": "forged" })).status,
    403,
  );
  f.state.verified = false;
  assert.equal((await f.post({ action: "claim", token: "test" })).status, 403);
  f.state.verified = true;
  f.state.challenge = false;
  assert.equal((await f.post({ action: "claim", token: "test" })).status, 403);
  assert.equal(
    f.calls.some((c) => c.body.p_action === "create"),
    false,
  );
  f.state.challenge = true;
  const r = await (await f.post({ action: "claim", token: "test" })).json();
  assert.match(r.telegram_url, /^https:\/\/t.me\/example_bot\?start=pass_[a-f0-9]{48}$/);
  const created = f.calls.find((c) => c.body.p_action === "create").body;
  assert.equal(created.p_user, "member-a");
  assert.match(created.p_hash, /^[a-f0-9]{64}$/);
  assert.equal(
    f.calls.some((c) => c.url.endsWith("/website_claim_campaign")),
    false,
  );
});
test("offline bot and wrong challenge action cannot issue handoffs", async () => {
  const f = setup();
  f.state.ready = false;
  assert.equal((await f.post({ action: "claim", token: "test" })).status, 503);
  f.state.ready = true;
  f.state.action = "other";
  assert.equal((await f.post({ action: "claim", token: "test" })).status, 403);
});
test("bot endpoint rejects unknown credentials and unverified membership redemption", async () => {
  const f = setup(),
    body = { action: "redeem", hash: "a".repeat(64), telegram: 123 };
  assert.equal((await f.post(body, { "x-claim-bot-secret": "x".repeat(40) })).status, 401);
  assert.equal((await f.post(body, { "x-claim-bot-secret": secret })).status, 403);
  const r = await f.post({ ...body, memberships_verified: true }, { "x-claim-bot-secret": secret });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).awarded, true);
});
