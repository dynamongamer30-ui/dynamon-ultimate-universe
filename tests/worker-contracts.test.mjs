import assert from "node:assert/strict";
import test from "node:test";
import license from "../workers/license/src/index.js";
import generator from "../workers/generator/src/index.js";

test("protected compatibility paths reject bad input without storage or network activity", async () => {
  let calls = 0;
  const original = globalThis.fetch;
  const blocked = () => {
    calls++;
    throw new Error("Unexpected backend work");
  };
  globalThis.fetch = blocked;
  const env = {
    DG: { get: blocked, put: blocked, delete: blocked },
    DG_R2: { get: blocked, put: blocked },
  };
  const request = (path, body) =>
    new Request(`https://worker.invalid${path}`, { method: "POST", body: JSON.stringify(body) });
  try {
    const heartbeat = await license.fetch(request("/heartbeat", {}), env);
    assert.deepEqual(await heartbeat.json(), { ok: true, stateless: true });
    assert.equal(heartbeat.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(
      await (
        await license.fetch(request("/tamper", { fp: "offline-test", kind: "test" }), env)
      ).json(),
      { ok: true, recorded: false },
    );
    assert.equal((await license.fetch(request("/tamper", {}), env)).status, 400);
    assert.deepEqual(await (await license.fetch(request("/verify-key", {}), env)).json(), {
      ok: false,
      error: "bad_request",
    });
    const admin = await license.fetch(new Request("https://worker.invalid/admin/list"), env);
    assert.equal(admin.status, 403);
    for (const origin of ["https://dynamongamer.com", "https://dynamongamer.space"]) {
      const response = await generator.fetch(
        new Request("https://worker.invalid/check-token", { headers: { Origin: origin } }),
        {},
      );
      assert.deepEqual(await response.json(), { valid: false, reason: "missing" });
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    }
    const invalid = await generator.fetch(request("/generate-key", {}), {});
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { ok: false, error: "missing_fields" });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
