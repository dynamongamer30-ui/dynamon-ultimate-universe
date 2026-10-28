import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = readFileSync(new URL("../src/lib/dailyKeyClaim.ts", import.meta.url), "utf8");
const { resolveDailyKeyClaimId } = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
test("daily notifications resolve owned key references to the claim UUID without changing reward identity", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  let reads = 0;
  const load = async () => {
    reads++;
    return { data: [{ id, key: "VIP-ABC234" }], error: null };
  };
  assert.equal(await resolveDailyKeyClaimId("VIP-ABC234", load), id);
  assert.equal(await resolveDailyKeyClaimId("DG-OTH234", load), null);
  assert.equal(await resolveDailyKeyClaimId(id, load), id);
  assert.equal(reads, 2);
  assert.equal(await resolveDailyKeyClaimId("invalid", load), null);
  await assert.rejects(
    resolveDailyKeyClaimId("DG-ABC234", async () => ({
      data: null,
      error: { message: "offline" },
    })),
  );
});
