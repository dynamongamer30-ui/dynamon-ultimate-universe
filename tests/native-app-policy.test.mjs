import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { publicUiConfig } from "../workers/legacy-license/src/public-ui.js";
import { checkAppPolicy } from "../workers/license-v2/src/app-policy.js";
import worker from "../workers/license-v2/src/index.js";
import legacyWorker from "../workers/legacy-license/src/index.js";
const source = await readFile(new URL("../src/lib/nativeAppConfig.ts", import.meta.url), "utf8");
const { nativeUi, validateNativeUi } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);

test("shared native links preserve existing content and publish only public presentation fields", () => {
  const config = nativeUi(null, {
    Title: "Existing owner title",
    Texts: { BtnKey: "Claim access" },
    Links: { Telegram: "https://t.me/example" },
    DexBranding: { links: [{ title: "Website", url: "https://dynamongamer.com/" }] },
  });
  assert.equal(validateNativeUi(config), null);
  assert.equal(config.brand.title, "Existing owner title");
  assert.equal(config.login.getKeyLabel, "Claim access");
  assert.equal(config.links.website, "https://dynamongamer.com/");
  config.social.labels.website = "Official home";
  config.links.website = "https://example.com/community";
  const published = publicUiConfig({
    Ui: { ...config, privateToken: "MUST-NOT-PUBLISH" },
    Api: { Token: "ALSO-PRIVATE" },
  });
  assert.equal(published.links.website, "https://example.com/community");
  assert.equal(published.social.labels.website, "Official home");
  assert.ok(!JSON.stringify(published).includes("PRIVATE"));
  config.links.website = "";
  assert.equal(
    publicUiConfig({ Ui: config, Links: { Website: "https://old.example/" } }).links.website,
    "",
  );
});
test("native link validation refuses credentials, unsafe protocols and partial input", () => {
  for (const link of [
    "javascript:alert(1)",
    "https://user:pass@example.com/",
    "https://localhost/",
    "not ready",
    "https://example.com:8443/",
  ]) {
    const config = nativeUi(null, {});
    config.links.website = link;
    assert.notEqual(validateNativeUi(config), null, link);
    assert.equal(publicUiConfig({ Ui: config }).links.website, "");
  }
});
test("maintenance takes priority; mandatory updates block missing or older versions and allow current versions", async () => {
  const original = globalThis.fetch;
  const env = { SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SERVICE_KEY: "local-only" };
  let rows = [];
  globalThis.fetch = async () => Response.json(rows);
  try {
    rows = [
      { id: "Maintenance", data: true },
      { id: "Update", data: { Enabled: true, Force: true, VersionCode: 20 } },
    ];
    assert.deepEqual(await checkAppPolicy(env, 100), { status: 503, error: "maintenance" });
    rows[0].data = false;
    for (const version of [undefined, -1, "20", 0, 19])
      assert.deepEqual(await checkAppPolicy(env, version), {
        status: 426,
        error: "update_required",
      });
    assert.equal(await checkAppPolicy(env, 20), null);
    assert.equal(await checkAppPolicy(env, 21), null);
    rows[1].data.Force = false;
    assert.equal(await checkAppPolicy(env, 1), null);
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(checkAppPolicy(env, 20), /Policy unavailable/);
  } finally {
    globalThis.fetch = original;
  }
});
test("activation and renewal stop before license claims when maintenance or a forced update blocks access", async () => {
  const original = globalThis.fetch;
  const env = {
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_KEY: "LOCAL-SERVER-ONLY",
    LICENSE_HMAC_PEPPER: "LOCAL-LICENSE-ONLY",
    SESSION_SIGNING_SECRET: "LOCAL-SESSION-ONLY",
  };
  let policy = [{ id: "Maintenance", data: true }];
  let reads = 0;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, "/rest/v1/app_config");
    reads++;
    return Response.json(policy);
  };
  try {
    for (const route of ["activate", "renew"]) {
      const request = () =>
        new Request("https://fixture.test/v2/" + route, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ client_version_code: 19 }),
        });
      assert.equal((await worker.fetch(request(), env)).status, 503);
      policy = [{ id: "Update", data: { Enabled: true, Force: true, VersionCode: 20 } }];
      assert.equal((await worker.fetch(request(), env)).status, 426);
      policy = [{ id: "Maintenance", data: true }];
    }
    assert.equal(reads, 4);
  } finally {
    globalThis.fetch = original;
  }
});
test("public configuration publishes the shared UI without private values and never invents availability on a failed read", async () => {
  const original = globalThis.fetch;
  const env = {
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_SERVICE_KEY: "LOCAL-SERVER-ONLY",
  };
  let rows = [
    { id: "Ui", data: nativeUi(null, { Links: { Website: "https://dynamongamer.com/" } }) },
    { id: "Api", data: { Token: "DO-NOT-PUBLISH" } },
    {
      id: "Update",
      data: {
        Enabled: true,
        Force: false,
        VersionCode: 20,
        UpdateUrl: "https://downloads.example.com/latest.apk",
      },
    },
  ];
  let reads = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(new URL(url).pathname, "/rest/v1/app_config");
    reads++;
    return Response.json(rows);
  };
  try {
    const response = await legacyWorker.fetch(new Request("https://fixture.test/config"), env);
    assert.equal(response.status, 200);
    const config = await response.json();
    assert.equal(config.Ui.links.website, "https://dynamongamer.com/");
    assert.equal(config.Update.Enabled, true);
    assert.equal(config.Update.UpdateUrl, "https://downloads.example.com/latest.apk");
    assert.ok(!JSON.stringify(config).includes("DO-NOT-PUBLISH"));
    rows = [{ id: "Maintenance", data: true }];
    const verify = new Request("https://fixture.test/verify-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "DG-ABC234", fp: "local-device" }),
    });
    assert.equal((await legacyWorker.fetch(verify, env)).status, 503);
    assert.equal(reads, 2);
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    assert.equal(
      (await legacyWorker.fetch(new Request("https://fixture.test/config"), env)).status,
      500,
    );
  } finally {
    globalThis.fetch = original;
  }
});
