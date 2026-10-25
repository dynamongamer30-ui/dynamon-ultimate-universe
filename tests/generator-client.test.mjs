import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = (
  await readFile(new URL("../src/lib/dgWorker.ts", import.meta.url), "utf8")
).replaceAll("import.meta.env", "({})");
const client = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const args = {
  accessToken: "local-ref",
  turnstileToken: "local-captcha",
  fingerprint: "local-device",
};
const original = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = original;
});

test("link lookup preserves the encoded reference and cancellation signal", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/check-token?ref=a%2Bb%26c");
    assert.equal(init.method, "GET");
    assert.equal(init.signal, controller.signal);
    return Response.json({ valid: false, reason: "used" });
  };
  assert.deepEqual(await client.checkToken("a+b&c", controller.signal), {
    valid: false,
    reason: "used",
  });
});
test("failed and malformed link checks remain unavailable instead of valid or expired", async () => {
  for (const [body, status] of [
    [{ valid: true }, 503],
    [null, 200],
    [{ valid: "true" }, 200],
    [{ valid: false, reason: 1 }, 200],
  ]) {
    globalThis.fetch = async () => Response.json(body, { status });
    assert.deepEqual(await client.checkToken("local-ref"), { valid: false, unavailable: true });
  }
});
test("generation preserves the Worker payload and does not invent a remaining quota", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/generate-key");
    assert.equal(init.method, "POST");
    assert.equal(init.signal, controller.signal);
    assert.deepEqual(JSON.parse(init.body), args);
    return Response.json({ ok: true, key: "LOCAL-NOT-A-LICENSE", remaining: "unknown" });
  };
  assert.deepEqual(await client.generateKey(args, controller.signal), {
    ok: true,
    key: "LOCAL-NOT-A-LICENSE",
    remaining: null,
  });
});
test("malformed successful generation responses have an unconfirmed outcome", async () => {
  for (const body of [
    null,
    {},
    { key: {} },
    { key: " " },
    { ok: false, key: "LOCAL-NOT-A-LICENSE" },
  ]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json(body);
    };
    assert.equal((await client.generateKey(args)).uncertain, true);
    assert.equal(calls, 1);
  }
});
test("known server rejections retain their reason while unknown failures stay uncertain", async () => {
  globalThis.fetch = async () =>
    Response.json({ error: "rate_limited", resetInMinutes: 12 }, { status: 429 });
  assert.deepEqual(await client.generateKey(args), {
    ok: false,
    status: 429,
    error: "rate_limited",
    resetInMinutes: 12,
  });
  globalThis.fetch = async () => Response.json({ error: "unknown_failure" }, { status: 500 });
  assert.equal((await client.generateKey(args)).uncertain, true);
  globalThis.fetch = async () => new Response("not json", { status: 502 });
  assert.equal((await client.generateKey(args)).uncertain, true);
});
test("aborted generation is not replayed or described as a definite failed write", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new DOMException("Aborted", "AbortError");
  };
  assert.deepEqual(await client.generateKey(args), {
    ok: false,
    error: "generation_unconfirmed",
    uncertain: true,
  });
  assert.equal(calls, 1);
});

test("admin mutations require an explicit successful Worker acknowledgement", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: { getItem: () => "LOCAL-ADMIN-FIXTURE" } };
  try {
    for (const body of [{}, { ok: false }, null]) {
      globalThis.fetch = async () => Response.json(body);
      await assert.rejects(client.banDevice("LOCAL-FP", "local reason"), /not confirmed/);
    }
    globalThis.fetch = async () => Response.json({ active: null, current_build: "local" });
    await assert.rejects(client.listDevices(), /not valid/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("admin payloads retain the signed wire fields and include bounded cancellation", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: { getItem: () => "LOCAL-ADMIN-FIXTURE" } };
  try {
    const payload = {
      build: "LOCAL",
      ct_b64: "local",
      iv_b64: "local",
      sig_b64: "local",
      key_b64: "local",
      ct_sha: "local",
      protocol: 2,
      min_client: 3,
      issued: Math.floor(Date.now() / 1000),
      meta_sig_b64: "local",
    };
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/admin/upload-payload");
      assert.equal(init.headers.get("X-Admin"), "LOCAL-ADMIN-FIXTURE");
      assert.deepEqual(JSON.parse(init.body), payload);
      assert.ok(init.signal instanceof AbortSignal);
      return Response.json({ ok: true });
    };
    assert.deepEqual(await client.uploadPayload(payload), { ok: true });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("blocked session storage cannot claim an admin key was saved", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    sessionStorage: {
      setItem: () => {
        throw Error("blocked");
      },
      getItem: () => null,
    },
  };
  try {
    assert.equal(client.setAdminKey("LOCAL"), false);
    assert.throws(() => client.requireAdminKey(), /not set/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
