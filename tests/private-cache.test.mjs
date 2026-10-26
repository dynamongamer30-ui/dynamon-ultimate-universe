import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

test("private SSR, session-bearing requests and error pages cannot enter shared caches", async () => {
  let responseHeaders = { "content-type": "text/html", "cache-control": "public, max-age=300" };
  let status = 200;
  globalThis.__cacheTestServer = {
    fetch: () => new Response("local fixture", { status, headers: responseHeaders }),
  };
  try {
    const source = stripTypeScriptTypes(
      await readFile(new URL("../src/server.ts", import.meta.url), "utf8"),
    )
      .replace('import "./lib/error-capture";', "")
      .replace(
        /import\s*\{\s*consumeLastCapturedError\s*\}\s*from\s*[^;]+;/,
        "const consumeLastCapturedError=()=>null;",
      )
      .replace(
        /import\s*\{\s*renderErrorPage\s*\}\s*from\s*[^;]+;/,
        'const renderErrorPage=()=>"local error fixture";',
      )
      .replace(
        'import("@tanstack/react-start/server-entry")',
        "Promise.resolve({default:globalThis.__cacheTestServer})",
      );
    const { default: server } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    const check = async (path, headers = {}) => {
      const response = await server.fetch(
        new Request(`https://fixture.test${path}`, { headers }),
        {},
        {},
      );
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("cdn-cache-control"), "no-store");
      assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(await response.text(), "local fixture");
    };
    for (const path of [
      "/admin",
      "/admin-control",
      "/admin-loader",
      "/admin-notifications",
      "/auth",
      "/profile",
      "/favorites",
      "/achievements",
      "/notifications",
      "/rewards",
      "/claim/tesla",
      "/unlock",
      "/generator?ref=local-fixture",
    ])
      await check(path);
    await check("/mods", { authorization: "Bearer local-fixture" });
    await check("/", { cookie: "local-fixture=1" });
    responseHeaders = { ...responseHeaders, "set-cookie": "local-fixture=1; Secure; HttpOnly" };
    await check("/about");
    responseHeaders = { "content-type": "text/html", "cache-control": "public, max-age=300" };
    status = 503;
    await check("/mods");
    status = 200;
    const publicResponse = await server.fetch(new Request("https://fixture.test/mods"), {}, {});
    assert.equal(publicResponse.headers.get("cache-control"), "public, max-age=300");
  } finally {
    delete globalThis.__cacheTestServer;
  }
});
