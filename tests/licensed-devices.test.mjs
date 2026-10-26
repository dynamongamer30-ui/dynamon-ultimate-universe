import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
const source = readFileSync(new URL("../src/lib/licensedDevices.ts", import.meta.url), "utf8");
const { licensedDevices } = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const now = 1000;
const key = (id, device, expiry, status = "active") => ({ key: id, device, expiry, status });

test("only current bound, usable keys expose stored device information", () => {
  const users = ["live", "lifetime", "expired", "revoked", "orphan", "unbound", "malformed"].map(
    (fingerprint) => ({ fingerprint, lastLogin: 12 }),
  );
  const keys = [
    key("A", "live", now + 1),
    key("B", "lifetime", 0),
    key("C", "expired", now),
    key("D", "revoked", now + 100, "revoked"),
    key("E", null, 0),
    key("F", "malformed", NaN),
  ];
  const result = licensedDevices(users, keys, now);
  assert.deepEqual(
    result.map((row) => row.fingerprint),
    ["live", "lifetime"],
  );
  assert.equal(result[0].lastLogin, 12);
  assert.equal(licensedDevices(users, keys, now + 1).length, 1);
  assert.deepEqual(users[0], { fingerprint: "live", lastLogin: 12 });
});

test("another live key preserves a device with historical expired login metadata", () => {
  const original = { fingerprint: "phone", Key: "OLD", expiry: 1, recordData: { Key: "OLD" } };
  const keys = [key("OLD", "phone", 1), key("NEW", "phone", now + 500), key("OTHER", "phone", 0)];
  const [row] = licensedDevices([original], keys, now);
  assert.equal(row.Key, "NEW");
  assert.equal(row.expiry, now + 500);
  assert.equal(row.recordData, original.recordData);
  assert.equal(original.Key, "OLD");
  assert.equal(licensedDevices([{ ...original, Key: "OTHER" }], keys, now)[0].Key, "OTHER");
});

test("unused keys never invent devices and multiple keys never duplicate one device", () => {
  assert.deepEqual(licensedDevices([], [key("A", "phone", 0)], now), []);
  assert.equal(
    licensedDevices([{ fingerprint: "phone" }], [key("A", "phone", 0), key("B", "phone", 0)], now)
      .length,
    1,
  );
});
