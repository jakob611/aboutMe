import assert from "node:assert/strict";
import { test } from "node:test";
import { A4_LENGTH, A4_WIDTH, PAPER_MASS, PaperSheet, STEP, TABLE_CONTACT } from "../src/components/simulation/paper/paper-physics";

function run(sheet: PaperSheet, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) sheet.step();
}

function range(sheet: PaperSheet, axis: number) {
  let min = Infinity, max = -Infinity;
  for (let i = axis; i < sheet.positions.length; i += 3) {
    min = Math.min(min, sheet.positions[i]);
    max = Math.max(max, sheet.positions[i]);
  }
  return { min, max, span: max - min };
}

function strain(sheet: PaperSheet) {
  let square = 0, edges = 0, worst = 0;
  for (let node = 0; node < sheet.count; node++) {
    const i = node * 3;
    for (const offset of [1, sheet.columns]) {
      const next = node + offset;
      if (next >= sheet.count || (offset === 1 && next % sheet.columns === 0)) continue;
      const j = next * 3;
      const rest = Math.hypot(sheet.planar[i] - sheet.planar[j], sheet.planar[i + 2] - sheet.planar[j + 2]);
      const a = sheet.point(node), b = sheet.point(next);
      const error = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / rest - 1;
      worst = Math.max(worst, Math.abs(error));
      square += error * error;
      edges++;
    }
  }
  return { rms: Math.sqrt(square / edges), worst };
}

test("A4 paper uses metre scale and a held corner pulls up the sheet", () => {
  const sheet = new PaperSheet();
  sheet.setPasses(6);
  assert.equal(A4_WIDTH, .210);
  assert.equal(A4_LENGTH, .297);
  assert.ok(Math.abs(PAPER_MASS - .0049896) < 1e-9);
  run(sheet, 1);
  assert.equal(sheet.awake, false);
  const start = sheet.point(0);
  assert.ok(sheet.grab(0, start));
  for (let i = 1; i <= 60; i++) {
    sheet.pull({ x: start.x + .023 * i / 60, y: .18 * i / 60, z: start.z }, STEP);
    sheet.step();
  }
  assert.ok(Math.abs(sheet.point(0).y - .18) < .00001);
  assert.ok(sheet.centre().y > .025);
  assert.ok(strain(sheet).rms < .04);
  assert.ok(strain(sheet).worst < .12);
  sheet.release(false);
  run(sheet, 2);
  assert.ok(Math.abs(range(sheet, 1).min - TABLE_CONTACT) < .00001);
  assert.equal(sheet.awake, false);
  const settled = sheet.positions.slice();
  run(sheet, 1);
  assert.deepEqual(sheet.positions, settled);
});

test("folded layers stay separated and unfolding retains a crease", () => {
  const sheet = new PaperSheet();
  sheet.setPasses(6);
  run(sheet, 1);
  const before = range(sheet, 0).span;
  assert.ok(sheet.tool("fold"));
  run(sheet, 2.5);
  assert.equal(sheet.isFolded, true);
  assert.ok(range(sheet, 0).span < before * .7);
  assert.deepEqual(sheet.foldMemory, [1, 0]);
  const center = (sheet.columns - 1) / 2;
  for (let row = 0; row < sheet.rows; row++) {
    const lower = sheet.point(row * sheet.columns + center - 4);
    const upper = sheet.point(row * sheet.columns + center + 4);
    assert.ok(upper.y - lower.y > .001, "the two folded layers remain separated");
  }
  assert.ok(sheet.tool("unfold", true), "unfold reuses the existing fold axis");
  run(sheet, 2);
  assert.equal(sheet.isFolded, false);
  assert.ok(range(sheet, 0).span > before * .94);
  assert.ok(sheet.creases.some(value => value > .2));
  assert.deepEqual(sheet.foldMemory, [1, 0]);
  sheet.reset();
  assert.deepEqual(sheet.foldMemory, [0, 0]);
  assert.ok(sheet.creases.every(value => value === 0));
});

test("compression leaves a compact raised ball and flattening retains crease damage", () => {
  const sheet = new PaperSheet();
  sheet.setPasses(6);
  run(sheet, 1);
  const before = range(sheet, 0).span * range(sheet, 2).span;
  assert.ok(sheet.tool("crumple"));
  run(sheet, 3.5);
  const compressed = range(sheet, 0).span * range(sheet, 2).span;
  assert.ok(compressed < before * .27);
  assert.ok(range(sheet, 1).span > .020);
  assert.ok(sheet.positions.every(Number.isFinite));
  assert.ok(sheet.creases.some(value => value > .4));
  assert.ok(sheet.tool("smooth"));
  run(sheet, 2);
  assert.ok(range(sheet, 0).span * range(sheet, 2).span > before * .93);
  assert.ok(range(sheet, 1).span < .015);
  assert.ok(sheet.creases.some(value => value > .4));
});

test("the fan lifts the open sheet and a compact sheet gets a longer toss", () => {
  const flat = new PaperSheet(), compact = new PaperSheet();
  flat.setPasses(6);
  compact.setPasses(6);
  run(flat, 1);
  run(compact, 1);
  compact.tool("crumple");
  run(compact, 3.5);
  const before = flat.centre();
  flat.setWind(1);
  run(flat, 1.75);
  assert.ok(range(flat, 1).span > .010, "the exposed edge lifts");
  assert.ok(flat.centre().x - before.x > .03, "the sheet moves downwind");
  flat.setWind(0);
  run(flat, 2);
  assert.equal(flat.awake, false);
  flat.reset();
  run(flat, 1);
  function lift(sheet: PaperSheet) {
    const start = sheet.centre().y;
    let peak = start;
    assert.ok(sheet.toss());
    for (let i = 0; i < 120; i++) {
      sheet.step();
      peak = Math.max(peak, sheet.centre().y);
    }
    return peak - start;
  }
  assert.ok(lift(compact) > lift(flat) + .007);
});
