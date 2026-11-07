import assert from "node:assert/strict";
import { test } from "node:test";
import { initialTier, slowerTier, qualitySettings } from "../src/lib/play-model";

test("power and device constraints select an appropriate initial renderer tier", () => {
  assert.equal(initialTier({ memory: 2, cores: 8, coarse: true }), "low");
  assert.equal(initialTier({ memory: 16, cores: 16, coarse: false, saveData: true }), "low");
  assert.equal(initialTier({ memory: 8, cores: 8, coarse: true }), "balanced");
  assert.equal(initialTier({ memory: 16, cores: 12, coarse: false }), "cinematic");
  assert.equal(slowerTier("cinematic", 32), "balanced");
  assert.equal(slowerTier("balanced", 45), "low");
  assert.equal(slowerTier("low", 70), "low");
  assert.equal(slowerTier("cinematic", 17), "cinematic");
  assert.equal(qualitySettings.low.reflections, false);
  assert.equal(qualitySettings.cinematic.reflections, true);
});
