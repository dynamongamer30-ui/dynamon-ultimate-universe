import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createCampaignHandler } from "../supabase/functions/website-campaign/handler.js";
const origin = "https://dynamongamer.com";
const env = {
  SITE_ORIGIN: origin,
  SUPABASE_URL: "https://database.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-test-key",
  CAMPAIGN_COOKIE_SECRET: "test-cookie-secret",
  CAMPAIGN_PROXY_SECRET: "test-proxy-secret",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
};
function fixture() {
  const calls = [];
  const state = {
    user: "member-a",
    verified: true,
    rate: true,
    challenge: true,
    hostname: "dynamongamer.com",
    action: "phoenix_claim",
    fail: false,
  };
  const handler = createCampaignHandler(env, async (url, options = {}) => {
    calls.push({ url, body: options.body });
    if (state.fail) throw Error("offline");
    if (url.endsWith("/auth/v1/user"))
      return Response.json({
        id: state.user,
        email_confirmed_at: state.verified ? "2026-10-01" : null,
      });
    if (url.includes("siteverify"))
      return Response.json({
        success: state.challenge,
        hostname: state.hostname,
        action: state.action,
      });
    if (url.endsWith("/website_campaign_rate")) return Response.json(state.rate);
    if (url.endsWith("/website_claim_campaign"))
      return Response.json({ ok: true, pass_id: "pass-id" });
    if (url.endsWith("/website_campaign_status"))
      return Response.json({ slug: "test", remaining: 1 });
    throw Error("Unexpected fetch");
  });
  const post = async (body, extra = {}) => {
    const text = JSON.stringify(body),
      stamp = String(Date.now()),
      ip = "192.0.2.2";
    const proof = createHmac("sha256", env.CAMPAIGN_PROXY_SECRET)
      .update(["proxy", stamp, "test", ip, text].join("\n"))
      .digest("hex");
    return handler(
      new Request("https://edge.example.test?campaign=test", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          Authorization: "Bearer test-user-token",
          "x-dg-proxy-time": stamp,
          "x-dg-proxy-proof": proof,
          "x-dg-proxy-ip": ip,
          "x-forwarded-for": "gateway-rewritten-address",
          ...extra,
        },
        body: text,
      }),
    );
  };
  return { handler, post, state, calls };
}
test("campaign requires trusted proxy, same origin and verified account", async () => {
  const f = fixture();
  assert.equal((await f.post({ action: "prepare" }, { "x-dg-proxy-proof": "forged" })).status, 403);
  assert.equal(
    (await f.post({ action: "prepare" }, { origin: "https://evil.example" })).status,
    403,
  );
  assert.equal(f.calls.length, 0);
  f.state.verified = false;
  assert.equal(
    (await (await f.post({ action: "prepare" })).json()).error,
    "verified_account_required",
  );
});
test("signed browser identity and account-bound intent are required before issuing any pass", async () => {
  const f = fixture();
  const prepared = await f.post({ action: "prepare" });
  assert.equal(prepared.status, 200);
  const cookie = prepared.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  const { intent } = await prepared.json();
  const body = { action: "claim", intent, token: "challenge-token" };
  assert.equal((await f.post(body)).status, 403);
  f.state.user = "member-b";
  assert.equal((await f.post(body, { cookie: cookie.split(";")[0] })).status, 403);
  f.state.user = "member-a";
  assert.equal((await f.post(body, { cookie: cookie.split(";")[0] + "tamper" })).status, 403);
  assert.equal(f.calls.filter((c) => c.url.endsWith("/website_claim_campaign")).length, 0);
  const result = await f.post(body, { cookie: cookie.split(";")[0] });
  assert.equal((await result.json()).ok, true);
  const rpc = f.calls.find((c) => c.url.endsWith("/website_claim_campaign"));
  const args = JSON.parse(rpc.body);
  assert.equal(args.p_user, "member-a");
  assert.match(args.p_browser, /^[a-f0-9]{64}$/);
});
test("failed challenge, wrong hostname/action and rate limits cannot reach award RPC", async () => {
  const f = fixture();
  const p = await f.post({ action: "prepare" });
  const cookie = p.headers.get("set-cookie").split(";")[0];
  const { intent } = await p.json();
  const body = { action: "claim", intent, token: "test" };
  f.state.challenge = false;
  assert.equal((await f.post(body, { cookie })).status, 403);
  f.state.challenge = true;
  f.state.hostname = "evil.example";
  assert.equal((await f.post(body, { cookie })).status, 403);
  f.state.hostname = "dynamongamer.com";
  f.state.action = "other";
  assert.equal((await f.post(body, { cookie })).status, 403);
  f.state.action = "phoenix_claim";
  f.state.rate = false;
  assert.equal((await f.post(body, { cookie })).status, 429);
  assert.equal(f.calls.filter((c) => c.url.endsWith("/website_claim_campaign")).length, 0);
});
test("gateway fails closed when server configuration or upstream is unavailable", async () => {
  const f = fixture();
  f.state.fail = true;
  assert.equal((await f.post({ action: "prepare" })).status, 503);
  const disabled = createCampaignHandler({ ...env, SUPABASE_SERVICE_ROLE_KEY: "" });
  assert.equal(
    (await disabled(new Request("https://edge.example.test?campaign=test"))).status,
    503,
  );
  const publicResult = await fixture().handler(
    new Request("https://edge.example.test?campaign=test"),
  );
  assert.deepEqual(await publicResult.json(), {
    campaign: { slug: "test", remaining: 1 },
    enabled: true,
  });
  assert.match(publicResult.headers.get("cache-control"), /no-store/);
});
