import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("download session identity is stable across create and redeem pages", () => {
  const fingerprint = read("../src/lib/fingerprint.ts");
  const create = read("../src/routes/mods.$slug.tsx");
  const redeem = read("../src/routes/unlock.tsx");

  assert.match(fingerprint, /DOWNLOAD_DEVICE_ID_KEY = "dg_download_device_id_v1"/);
  assert.match(fingerprint, /localStorage/);
  assert.match(fingerprint, /getRandomValues/);
  assert.match(fingerprint, /export function getDownloadDeviceId\(\): string/);

  assert.match(create, /import \{ getDownloadDeviceId \} from "@\/lib\/fingerprint"/);
  assert.match(create, /const fingerprint = getDownloadDeviceId\(\)/);
  assert.match(create, /p_fingerprint: fingerprint/);

  assert.match(redeem, /import \{ getDownloadDeviceId \} from "@\/lib\/fingerprint"/);
  assert.match(redeem, /const fp = getDownloadDeviceId\(\)/);
  assert.match(redeem, /p_fingerprint: fp/);
});

test("generator fingerprint remains separate from download browser identity", () => {
  const fingerprint = read("../src/lib/fingerprint.ts");
  const generator = read("../src/routes/generator.tsx");

  assert.match(fingerprint, /export async function getFingerprint\(\): Promise<string>/);
  assert.match(generator, /getFingerprint/);
});
