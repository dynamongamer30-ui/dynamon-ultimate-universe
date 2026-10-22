import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
  );
}

test("release calendar text stays stable across time zones and invalid input", async () => {
  const { formatReleaseDate } = await loadSource("../src/lib/releaseDate.ts");
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Kolkata"]) {
      process.env.TZ = zone;
      assert.equal(formatReleaseDate("2026-06-22"), "Jun 22, 2026");
      assert.equal(formatReleaseDate("2026-01-01T00:00:00Z", true), "Jan 2026");
    }
    assert.equal(formatReleaseDate("invalid"), "Date unavailable");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("support draft encodes text without allowing additional mail headers", async () => {
  const { supportDraftUrl } = await loadSource("../src/lib/contact.ts");
  const url = new URL(
    supportDraftUrl(
      "Trainer\r\nBcc: test@example.com",
      "reply@example.com",
      "Help & details?\nA second line",
    ),
  );
  assert.equal(url.pathname, "info@dynamongamer.com");
  assert.equal(url.searchParams.size, 2);
  assert.doesNotMatch(url.searchParams.get("subject"), /[\r\n]/);
  assert.match(url.searchParams.get("body"), /Help & details\?\nA second line/);
});
