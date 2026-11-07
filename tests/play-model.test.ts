import assert from "node:assert/strict";
import { test } from "node:test";
import { initialTier, slowerTier, landmarks, walkable, moveMarble, qualitySettings } from "../src/lib/play-model";

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
test("all landmark destinations are reachable and movement cannot escape or tunnel through the tower", () => {
  landmarks.forEach(point => assert.ok(walkable(point), point.id));
  const edge = moveMarble({ x: 0, z: 0 }, 30, 0);
  assert.ok(walkable(edge)); assert.ok(edge.x < 12.9);
  const tower = moveMarble({ x: -6, z: -3 }, 0, -12);
  assert.ok(walkable(tower)); assert.ok(tower.z > -5.2);
  const diagonal = moveMarble({ x: -3, z: -4 }, -4, -4);
  assert.ok(walkable(diagonal));
});
