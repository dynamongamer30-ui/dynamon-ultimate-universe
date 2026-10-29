import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createHmac } from "node:crypto";
const source = stripTypeScriptTypes(
  readFileSync(new URL("../src/lib/campaignProxy.server.ts", import.meta.url), "utf8"),
)
  .replace("import.meta.env.VITE_SUPABASE_URL", JSON.stringify("https://fixture.supabase.co"))
  .replace(
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY",
    JSON.stringify("sb_publishable_fixture"),
  );
const { campaignProxy } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("same-origin proxy signs trusted network identity and preserves secure cookie without caching", async () => {
  const original = globalThis.fetch;
  const calls = [];
  const secret = "server-only-proxy-test-secret-32-characters";
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(
      { intent: "signed-intent" },
      {
        headers: {
          "set-cookie":
            "__Host-dg-campaign-browser=fixture; Path=/; HttpOnly; Secure; SameSite=Lax",
        },
      },
    );
  };
  try {
    const body = JSON.stringify({ action: "prepare" });
    const response = await campaignProxy(
      new Request("https://fixture.test/api/phoenix/test", {
        method: "POST",
        headers: {
          origin: "https://fixture.test",
          "content-type": "application/json",
          authorization: "Bearer member-jwt",
          "x-forwarded-for": "forged",
          "cf-connecting-ip": "192.0.2.1",
        },
        body,
      }),
      { CAMPAIGN_PROXY_SECRET: secret },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(calls.length, 1);
    const headers = calls[0].options.headers;
    assert.equal(headers.get("x-forwarded-for"), "192.0.2.1");
    assert.equal(headers.get("authorization"), "Bearer member-jwt");
    const proof = createHmac("sha256", secret)
      .update(["proxy", headers.get("x-dg-proxy-time"), "test", "192.0.2.1", body].join("\n"))
      .digest("hex");
    assert.equal(headers.get("x-dg-proxy-proof"), proof);
    assert.equal(
      calls[0].url,
      "https://fixture.supabase.co/functions/v1/website-campaign?campaign=test",
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("proxy rejects foreign origins, missing server secret, bad paths and oversized requests before forwarding", async () => {
  const request = (headers = {}) =>
    new Request("https://fixture.test/api/phoenix/test", {
      method: "POST",
      headers: { origin: "https://fixture.test", "content-type": "application/json", ...headers },
      body: "{}",
    });
  assert.equal((await campaignProxy(request({ origin: "https://evil.test" }), {})).status, 403);
  assert.equal((await campaignProxy(request(), {})).status, 503);
  assert.equal((await campaignProxy(request({ "content-length": "9000" }), {})).status, 413);
  assert.equal(
    (await campaignProxy(new Request("https://fixture.test/api/phoenix/INVALID"), {})).status,
    400,
  );
  assert.equal(await campaignProxy(new Request("https://fixture.test/other"), {}), null);
});
