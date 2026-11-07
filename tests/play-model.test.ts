import assert from "node:assert/strict";
import { test } from "node:test";
import { initialTier, slowerTier, qualitySettings } from "../src/lib/play-model";
import { aimShot, coastLength, course, makePaper, makeRun, paperLandingTime, paperRound, paperTarget, paperThrows, paperWind, runAction, stepPaper, stepRun, throwPaper } from "../src/lib/arcade";

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
test("staying in the center lane loses the coastal run; a timed jump clears a barrier", () => {
  const idle = makeRun();
  while (!idle.done) stepRun(idle, 1 / 30);
  assert.equal(idle.lives, 0); assert.ok(idle.d < coastLength);

  const run = makeRun(), barrier = course.find(o => o.kind === "barrier" && o.lane === 0)!;
  while (run.d < barrier.d - 5.8) stepRun(run, 1 / 30);
  runAction(run, "jump");
  const events: string[] = [];
  while (run.d < barrier.d + 1) events.push(...stepRun(run, 1 / 30));
  assert.ok(events.includes("clear")); assert.equal(run.lives, 3);
});
test("the coastal course can be completed with all hearts at 30 fps", () => {
  const run = makeRun();
  const distances = [...new Set(course.map(o => o.d))];
  for (const d of distances) {
    while (run.d < d - 8.8 && !run.done) stepRun(run, 1 / 30);
    const row = course.filter(o => o.d === d);
    const lane = row.find(o => o.kind === "light")?.lane ?? [-1, 0, 1].find(l => !row.some(o => o.lane === l && o.kind === "barrier")) ?? run.lane;
    while (run.lane < lane) runAction(run, "right");
    while (run.lane > lane) runAction(run, "left");
    if (row.some(o => o.lane === lane && o.kind === "barrier")) {
      while (run.d < d - 6.3) stepRun(run, 1 / 30);
      runAction(run, "jump");
    }
    while (run.d < d + 1 && !run.done) stepRun(run, 1 / 30);
    assert.ok(run.lives > 0);
  }
  while (!run.done) stepRun(run, 1 / 30);
  assert.equal(run.d, coastLength); assert.equal(run.lives, 3); assert.ok(run.score > 2000);
});
test("paper shots settle once, transition rounds, and can beat moving targets in wind", () => {
  const s = makePaper();
  for (let i = 0; i < paperThrows; i++) {
    const wind = paperWind(s);
    const flight = paperLandingTime(aimShot(0, .73, wind));
    const target = paperTarget({ ...s, roundClock: s.roundClock + flight });
    const aim = target.x - .5 * wind * flight * flight;
    assert.ok(throwPaper(s, aimShot(aim, .73, wind)));
    assert.equal(throwPaper(s, aimShot(0, .18, wind)), false);
    while (s.shot) stepPaper(s, 1 / 30);
    assert.equal(s.shots, i + 1); assert.equal(s.hits, i + 1);
  }
  assert.equal(paperRound(2), 0); assert.equal(paperRound(3), 1); assert.equal(paperRound(6), 2);
  assert.ok(s.done); assert.equal(throwPaper(s, aimShot(0, .73, 0)), false);
});
test("a short throw misses and breaks the streak", () => {
  const s = makePaper();
  throwPaper(s, aimShot(0, .73, 0));
  while (s.shot) stepPaper(s, 1 / 30);
  assert.equal(s.last, "perfect");
  throwPaper(s, aimShot(0, .25, 0));
  while (s.shot) stepPaper(s, 1 / 30);
  assert.equal(s.last, "miss"); assert.equal(s.chain, 0); assert.equal(s.score, 125);
});
