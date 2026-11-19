import assert from "node:assert/strict";
import test from "node:test";
import license from "../workers/license/src/index.js";

test("DG admin-key failures are rate-limited per client IP without blocking other IPs", async () => {
  const values = new Map();
  const kv = {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value, options) => {
      assert.equal(options?.expirationTtl, 900);
      values.set(key, value);
    },
    delete: async (key) => values.delete(key),
  };
  const env = { ADMIN_KEY: "correct-test-admin-key", DG: kv };
  const request = (ip, key) =>
    new Request("https://worker.invalid/admin/upload-payload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": ip,
        "X-Admin": key,
      },
      body: "{}",
    });

  for (let i = 0; i < 8; i++) {
    const response = await license.fetch(request("203.0.113.10", "incorrect-key"), env);
    assert.equal(response.status, 403);
  }

  const locked = await license.fetch(
    request("203.0.113.10", "correct-test-admin-key"),
    env,
  );
  assert.equal(locked.status, 403, "the eighth failed attempt locks this IP for the TTL");

  const separateIp = await license.fetch(
    request("203.0.113.11", "correct-test-admin-key"),
    env,
  );
  assert.equal(separateIp.status, 400, "a valid key from another IP reaches request validation");
  assert.equal(values.size, 1, "the valid request does not leave a failure counter behind");
});
