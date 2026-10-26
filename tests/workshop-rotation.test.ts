import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorkshopRotation } from "../src/components/workshop-rotation";

function fixture({ reduced = false, top = 100 } = {}) {
  const target = new EventTarget();
  const subject = { closest: () => subject };
  const nestedIcon = { closest: () => subject };
  const element = Object.assign(target, {
    contains: (node: unknown) => node === subject,
    getBoundingClientRect: () => ({ top, bottom: top + 400 }),
  }) as unknown as HTMLElement;
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const page = Object.assign(new EventTarget(), { hidden: false });
  const timers = new Map<number, { callback: () => void; due: number }>();
  let timerId = 0;
  let now = 0;
  let count = 0;
  let paused = false;
  let disconnected = false;
  let notify: (entries: readonly { isIntersecting: boolean }[]) => void = () => {};
  const controller = createWorkshopRotation(element, () => count++, value => { paused = value; }, {
    preference: preference as unknown as MediaQueryList,
    page: page as unknown as Document,
    viewportHeight: 800,
    setTimer(callback, delay) {
      timers.set(++timerId, { callback, due: now + delay });
      return timerId as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer(timer) { timers.delete(timer as unknown as number); },
    createObserver(callback) {
      notify = callback;
      return { observe() {}, disconnect() { disconnected = true; } };
    },
  });
  const click = (clicked: unknown = {}) => {
    const event = new Event("click");
    Object.defineProperty(event, "target", { value: clicked });
    page.dispatchEvent(event);
  };
  return {
    controller,
    timers,
    count: () => count,
    paused: () => paused,
    disconnected: () => disconnected,
    tick(milliseconds: number) {
      const end = now + milliseconds;
      let next: [number, { callback: () => void; due: number }] | undefined;
      while ((next = [...timers].sort((a, b) => a[1].due - b[1].due)[0]) && next[1].due <= end) {
        now = next[1].due;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    },
    clickElsewhere: () => click(),
    clickSubject: () => click(subject),
    clickSubjectIcon: () => click(nestedIcon),
    hover: () => target.dispatchEvent(new Event("pointerenter")),
    focus: () => target.dispatchEvent(new Event("focusin")),
    intersect(visible: boolean) { notify([{ isIntersecting: visible }]); },
    hide(hidden: boolean) { page.hidden = hidden; page.dispatchEvent(new Event("visibilitychange")); },
    reduce(matches: boolean) { preference.matches = matches; preference.dispatchEvent(new Event("change")); },
  };
}

test("rotation advances on four-second boundaries with a single cancellable timer", () => {
  const f = fixture();
  assert.equal(f.timers.size, 1);
  f.tick(3999);
  assert.equal(f.count(), 0);
  f.tick(1);
  assert.equal(f.count(), 1);
  f.tick(12000);
  assert.equal(f.count(), 4);
  assert.equal(f.timers.size, 1);
  f.controller.destroy();
  assert.equal(f.timers.size, 0);
  assert.equal(f.disconnected(), true);
  f.clickElsewhere();
  f.hide(false);
  f.reduce(false);
  f.intersect(true);
  f.tick(12000);
  assert.equal(f.count(), 4);
  assert.equal(f.timers.size, 0);
});

test("manual subject pause survives subject/icon clicks and resumes on a nonfocusable click elsewhere", () => {
  const f = fixture();
  f.controller.setPaused(true);
  f.clickSubject();
  f.clickSubjectIcon();
  f.tick(12000);
  assert.equal(f.count(), 0);
  assert.equal(f.paused(), true);
  f.clickElsewhere();
  assert.equal(f.paused(), false);
  f.tick(3999);
  assert.equal(f.count(), 0);
  f.tick(1);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});

test("pointer hover and retained focus cannot defeat click-away resume", () => {
  const f = fixture();
  f.controller.setPaused(true);
  f.hover();
  f.focus();
  f.clickElsewhere();
  f.tick(4000);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});

test("hidden and offscreen scenes suspend rotation and restart with a fresh window", () => {
  const f = fixture({ top: 1000 });
  assert.equal(f.timers.size, 0);
  f.intersect(true);
  f.tick(3000);
  f.hide(true);
  f.tick(20000);
  assert.equal(f.count(), 0);
  f.hide(false);
  f.tick(3999);
  assert.equal(f.count(), 0);
  f.tick(1);
  assert.equal(f.count(), 1);
  f.intersect(false);
  f.tick(20000);
  assert.equal(f.count(), 1);
  f.intersect(true);
  f.tick(4000);
  assert.equal(f.count(), 2);
  f.controller.destroy();
});

test("click-away respects reduced motion, and switching the preference off resumes automatically", () => {
  const f = fixture({ reduced: true });
  assert.equal(f.paused(), true);
  f.clickElsewhere();
  f.tick(12000);
  assert.equal(f.count(), 0);
  assert.equal(f.timers.size, 0);
  f.reduce(false);
  assert.equal(f.paused(), false);
  f.tick(4000);
  assert.equal(f.count(), 1);
  f.reduce(true);
  f.tick(12000);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});

test("manual pause survives visibility and motion changes until a click elsewhere", () => {
  const f = fixture();
  f.controller.setPaused(true);
  f.hide(true); f.hide(false); f.intersect(false); f.intersect(true);
  f.reduce(true); f.reduce(false);
  f.tick(12000);
  assert.equal(f.count(), 0);
  assert.equal(f.paused(), true);
  f.clickElsewhere();
  f.tick(4000);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});
