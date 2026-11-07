import { strict as assert } from "node:assert";
import { test } from "node:test";
import { launchPebble, stepPebble, type Pebble, type WaterImpact } from "../src/components/simulation/coast/pebble-physics";
import { coastHeight, coastStart, eyeHeight } from "../src/components/simulation/coast/terrain";

function follow(stone: Pebble, ground = coastHeight) {
  const impacts: WaterImpact[] = [];
  for (let i = 0; i < 720 && stone.state === "air"; i++) {
    const impact = stepPebble(stone, 1 / 144, 0, ground);
    if (impact) impacts.push(impact);
  }
  return impacts;
}

test("a level throw from the cove skips across water and eventually sinks", () => {
  const stone = launchPebble(coastStart, coastHeight(coastStart.x, coastStart.z) + eyeHeight);
  const impacts = follow(stone);
  assert.ok(impacts.length >= 2);
  assert.equal(impacts[0].skipped, true);
  assert.equal(impacts.at(-1)?.skipped, false);
  assert.equal(stone.state, "sunk");
  assert.ok(impacts.every((impact, i) => i === 0 || impact.speed < impacts[i - 1].speed));
});

test("a steep throw sinks without a skip and a dry impact leaves the pebble at rest", () => {
  const launch = { x: 0, z: 0, yaw: 0, pitch: -.7 };
  const wet = launchPebble(launch, 1.8);
  const impacts = follow(wet, () => -1);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].skipped, false);
  const dry = launchPebble(launch, 1.8);
  assert.deepEqual(follow(dry, () => .15), []);
  assert.equal(dry.state, "rest");
  assert.ok(Math.abs(dry.y - (.15 + dry.thickness / 2)) < 1e-7);
});

test("an ascending pebble rebounds from steep terrain without passing inside it", () => {
  const hill = (x: number) => Math.max(0, Math.min(3, (x - .75) * 1.8));
  const stone = launchPebble({ x: 0, z: 0, yaw: Math.PI / 2, pitch: .26 }, 1.68);
  for (let i = 0; i < 720 && stone.state === "air"; i++) {
    stepPebble(stone, 1 / 144, 0, hill);
    assert.ok(stone.y >= hill(stone.x) + stone.thickness / 2 - 1e-7);
  }
  assert.equal(stone.state, "rest");
});
