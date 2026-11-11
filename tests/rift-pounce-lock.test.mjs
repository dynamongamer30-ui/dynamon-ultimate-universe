import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(new URL("../src/components/DexControls.tsx", import.meta.url), "utf8");
const worker = readFileSync(new URL("../workers/license/src/index.js", import.meta.url), "utf8");

test("Rift Pounce uses the existing FeatureLocks admin node", () => {
  assert.match(panel, /\["riftPounce",\s*"Rift Pounce \(Dark Void PvE ability\)"\]/);
  assert.match(panel, /getConfigNode<Record<string, boolean>>\("FeatureLocks"\)/);
  assert.match(panel, /compareConfigNode\("FeatureLocks",\s*next,\s*snapshot\.current\)/);
});

test("the existing dg /check response forwards FeatureLocks without a schema change", () => {
  assert.match(worker, /const featureLocks = await fbGet\("Config\/FeatureLocks"\)/);
  assert.match(worker, /featureLocks:\s*featureLocks\s*\|\|\s*\{\}/);
});
