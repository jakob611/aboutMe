import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorkshopRotation } from "../src/components/workshop-rotation";

function fixture({ reduced = false, top = 100, focused = false } = {}) {
  const target = new EventTarget();
  const child = {};
  const element = Object.assign(target, {
    contains: (node: unknown) => node === child,
    ownerDocument: { activeElement: focused ? child : null },
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
  const dispatch = (type: string, values: object = {}) => target.dispatchEvent(Object.assign(new Event(type), values));
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
    enter: (pointerType = "mouse") => dispatch("pointerenter", { pointerType }),
    leave: () => dispatch("pointerleave"),
    focus: () => dispatch("focusin"),
    blur: (internal = false) => dispatch("focusout", { relatedTarget: internal ? child : null }),
    intersect(visible: boolean) { notify([{ isIntersecting: visible }]); },
    hide(hidden: boolean) { page.hidden = hidden; page.dispatchEvent(new Event("visibilitychange")); },
    reduce(matches: boolean) { preference.matches = matches; preference.dispatchEvent(new Event("change")); },
  };
}

test("rotation uses one timer and advances only after a full six-second reading window", () => {
  const f = fixture();
  assert.equal(f.timers.size, 1);
  f.tick(5999);
  assert.equal(f.count(), 0);
  f.tick(1);
  assert.equal(f.count(), 1);
  assert.equal(f.timers.size, 1);
  f.tick(18000);
  assert.equal(f.count(), 4);
  f.controller.destroy();
  assert.equal(f.timers.size, 0);
  assert.equal(f.disconnected(), true);
  f.leave();
  f.hide(false);
  f.reduce(false);
  f.intersect(true);
  f.tick(12000);
  assert.equal(f.count(), 4);
  assert.equal(f.timers.size, 0);
});

test("hover, keyboard focus, hidden pages and offscreen scenes each suspend rotation", () => {
  const f = fixture();
  f.tick(4000);
  f.enter();
  assert.equal(f.timers.size, 0);
  f.tick(20000);
  f.leave();
  f.tick(5999);
  assert.equal(f.count(), 0);
  f.tick(1);
  assert.equal(f.count(), 1);
  f.focus();
  f.blur(true);
  assert.equal(f.timers.size, 0);
  f.blur();
  assert.equal(f.timers.size, 1);
  f.hide(true);
  f.intersect(false);
  f.hide(false);
  assert.equal(f.timers.size, 0);
  f.intersect(true);
  assert.equal(f.timers.size, 1);
  f.tick(6000);
  assert.equal(f.count(), 2);
  f.controller.destroy();
});

test("manual pause persists across visibility and motion changes until explicitly played", () => {
  const f = fixture();
  f.controller.setPaused(true);
  f.enter(); f.leave(); f.focus(); f.blur();
  f.hide(true); f.hide(false); f.intersect(false); f.intersect(true);
  f.reduce(false);
  f.tick(30000);
  assert.equal(f.count(), 0);
  assert.equal(f.paused(), true);
  f.controller.setPaused(false);
  assert.equal(f.paused(), false);
  f.tick(6000);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});

test("reduced motion starts paused; explicit Play works after focus leaves and preference changes stop it", () => {
  const f = fixture({ reduced: true, focused: true });
  assert.equal(f.paused(), true);
  assert.equal(f.timers.size, 0);
  f.controller.setPaused(false);
  assert.equal(f.timers.size, 0);
  f.tick(12000);
  assert.equal(f.count(), 0);
  f.blur();
  f.tick(6000);
  assert.equal(f.count(), 1);
  f.reduce(true);
  assert.equal(f.paused(), true);
  f.reduce(false);
  assert.equal(f.timers.size, 0);
  f.controller.destroy();
});

test("offscreen initial scenes do not rotate, and touch input does not become a stuck hover", () => {
  const f = fixture({ top: 1000 });
  assert.equal(f.timers.size, 0);
  f.intersect(true);
  f.enter("touch");
  f.tick(6000);
  assert.equal(f.count(), 1);
  f.controller.destroy();
});
