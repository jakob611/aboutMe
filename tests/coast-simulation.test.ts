import { strict as assert } from "node:assert";
import { test } from "node:test";
import { coastHeight, coastStart, shoreline, walkCoast, walkingSpeed } from "../src/components/simulation/coast/terrain";

test("wading depth stays bounded on both slow and high-refresh displays", () => {
  for (const rate of [30, 60, 120, 240]) {
    for (const tide of [-.4, 0, .5]) {
      const walker = { ...coastStart, yaw: -Math.PI / 2, speed: 0 };
      for (let i = 0; i < 20 * rate; i++) walkCoast(walker, 0, 1, 1 / rate, tide, []);
      const depth = tide - coastHeight(walker.x, walker.z);
      assert.ok(depth >= .42 && depth <= .440001, `${rate} Hz at tide ${tide}: depth ${depth}`);
      assert.equal(walker.speed, 0);
      walkCoast(walker, 0, -1, 1 / rate, tide, []);
      assert.ok(walker.speed > 0, "the visitor can reverse out of the water");
    }
  }
});

test("water and dry ground meet continuously along the authored shoreline", () => {
  for (let z = -164; z <= 158; z += 1.3) {
    const x = shoreline(z);
    assert.ok(Math.abs(coastHeight(x - .0001, z) - coastHeight(x + .0001, z)) < .0001);
  }
});

test("two-axis movement cannot exceed walking speed or pass through a boulder", () => {
  const walker = { ...coastStart, yaw: 0, speed: 0 };
  const rock = { x: walker.x, z: walker.z - 1, radius: .37 };
  assert.ok(walkCoast(walker, 1, 1, .016, 0, [rock]) <= walkingSpeed * .016 + 1e-10);
  walker.x = coastStart.x;
  walker.z = coastStart.z;
  for (let i = 0; i < 300; i++) walkCoast(walker, 0, 1, .016, 0, [rock]);
  assert.ok(walker.z > rock.z);
  assert.ok(Math.abs(walker.z - rock.z) >= rock.radius + .219);
});
