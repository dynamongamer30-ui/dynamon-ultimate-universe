import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
test("site icon and share preview use separate public settings, refresh cached values, and reject unsafe redirects", async () => {
  const fetchBefore = globalThis.fetch,
    nowBefore = Date.now;
  let timestamp = 100000,
    reads = 0;
  Date.now = () => timestamp;
  let value = {
    faviconUrl: "https://images.example.com/icon.png",
    previewImageUrl: "/preview.png",
    logoUrl: "/header.png",
  };
  globalThis.fetch = async (url) => {
    assert.match(url, /site_settings\?key=eq.branding&select=value$/);
    reads++;
    return Response.json([{ value }]);
  };
  try {
    const source = stripTypeScriptTypes(
      await readFile(new URL("../src/lib/siteImages.ts", import.meta.url), "utf8"),
    ).replaceAll(
      "import.meta.env",
      '({VITE_SUPABASE_URL:"https://fixture.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"LOCAL-PUBLIC-ONLY"})',
    );
    const { siteImageResponse } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    assert.equal(await siteImageResponse(new Request("https://website.test/mods")), null);
    assert.equal(
      (await siteImageResponse(new Request("https://website.test/site-icon"))).headers.get(
        "location",
      ),
      "https://images.example.com/icon.png",
    );
    assert.equal(
      (await siteImageResponse(new Request("https://website.test/site-preview"))).headers.get(
        "location",
      ),
      "https://website.test/preview.png",
    );
    assert.equal(reads, 1);
    timestamp += 31000;
    value = {
      faviconUrl: "javascript:alert(1)",
      previewImageUrl: "https://user:secret@images.example.com/private.png",
    };
    const response = await siteImageResponse(new Request("https://website.test/site-icon"));
    assert.equal(response.headers.get("location"), "https://website.test/dynamon-gamer-avatar.png");
    assert.equal(
      (await siteImageResponse(new Request("https://website.test/site-preview"))).headers.get(
        "location",
      ),
      "https://website.test/dynamon-gamer-avatar.png",
    );
    assert.equal(response.headers.get("cache-control"), "no-cache, max-age=0");
    assert.equal(reads, 2);
  } finally {
    globalThis.fetch = fetchBefore;
    Date.now = nowBefore;
  }
});
