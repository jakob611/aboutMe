import assert from "node:assert/strict";
import { test } from "node:test";
import { enhanceReveal } from "../src/lib/reveal-motion";

function fixture({ reduced = false, top = 1000, height = 500 } = {}) {
  const calls = {
    animate: 0,
    pause: 0,
    play: 0,
    cancel: 0,
    observe: 0,
    disconnect: 0,
  };
  let options: KeyframeAnimationOptions | undefined;
  let observerOptions: IntersectionObserverInit | undefined;
  let notify:
    | ((entries: readonly { isIntersecting: boolean }[]) => void)
    | undefined;
  const focusListeners = new Set<() => void>();
  const preferenceListeners = new Set<() => void>();
  const animation = {
    currentTime: null as number | null,
    onfinish: null as (() => void) | null,
    pause() {
      calls.pause++;
    },
    play() {
      calls.play++;
    },
    cancel() {
      calls.cancel++;
    },
  };
  const element = {
    getBoundingClientRect: () => ({ top, bottom: top + height, height }),
    animate(_frames: Keyframe[], supplied: KeyframeAnimationOptions) {
      calls.animate++;
      options = supplied;
      return animation;
    },
    addEventListener(_type: string, listener: () => void) {
      focusListeners.add(listener);
    },
    removeEventListener(_type: string, listener: () => void) {
      focusListeners.delete(listener);
    },
  } as unknown as HTMLElement;
  const preference = {
    matches: reduced,
    addEventListener(_type: "change", listener: () => void) {
      preferenceListeners.add(listener);
    },
    removeEventListener(_type: "change", listener: () => void) {
      preferenceListeners.delete(listener);
    },
  };
  const environment = {
    preference,
    viewportHeight: 800,
    createObserver(
      callback: (entries: readonly { isIntersecting: boolean }[]) => void,
      supplied: IntersectionObserverInit,
    ) {
      notify = callback;
      observerOptions = supplied;
      return {
        observe() {
          calls.observe++;
        },
        disconnect() {
          calls.disconnect++;
        },
      };
    },
  };
  return {
    calls,
    element,
    environment,
    animation,
    options: () => options,
    observerOptions: () => observerOptions,
    intersect: (visible = true) => notify?.([{ isIntersecting: visible }]),
    focus: () => {
      for (const listener of focusListeners) listener();
    },
    reduceMotion: () => {
      preference.matches = true;
      for (const listener of preferenceListeners) listener();
    },
    listenerCount: () => focusListeners.size + preferenceListeners.size,
  };
}

test("scroll reveals are prepared, staggered, played once, then cleaned up", () => {
  const f = fixture();
  const cleanup = enhanceReveal(
    f.element,
    { delay: 0.16, y: 30 },
    f.environment,
  );
  assert.equal(f.calls.pause, 1);
  assert.equal(f.calls.play, 0);
  assert.equal(f.animation.currentTime, 0);
  assert.equal(f.options()?.delay, 160);
  assert.equal(f.options()?.fill, "both");
  assert.equal(f.listenerCount(), 2);
  f.intersect(false);
  assert.equal(f.calls.play, 0);
  f.intersect();
  f.intersect();
  assert.equal(f.calls.play, 1);
  f.animation.onfinish?.();
  assert.equal(f.calls.cancel, 1);
  cleanup();
  assert.equal(f.listenerCount(), 0);
  assert.ok(f.calls.disconnect >= 2);
});

test("initial viewport, passed sections and reduced motion never become hidden", () => {
  for (const settings of [{ top: 100 }, { top: -1000 }, { reduced: true }]) {
    const f = fixture(settings);
    enhanceReveal(f.element, { delay: 0, y: 30 }, f.environment)();
    assert.equal(f.calls.animate, 0);
    assert.equal(f.calls.observe, 0);
    assert.equal(f.listenerCount(), 0);
  }
});

test("keyboard focus and preference changes reveal pending content immediately", () => {
  for (const action of ["focus", "reduceMotion"] as const) {
    const f = fixture();
    const cleanup = enhanceReveal(
      f.element,
      { delay: 0.2, y: 30 },
      f.environment,
    );
    f[action]();
    assert.equal(f.calls.cancel, 1);
    f.intersect();
    assert.equal(f.calls.play, 0);
    cleanup();
  }
});

test("very tall content triggers on entry and observer failure restores visibility", () => {
  const f = fixture({ height: 10000 });
  const cleanup = enhanceReveal(f.element, { delay: 0, y: 30 }, f.environment);
  assert.equal(f.observerOptions()?.threshold, 0);
  f.intersect();
  assert.equal(f.calls.play, 1);
  cleanup();
  const broken = fixture();
  enhanceReveal(
    broken.element,
    { delay: 0, y: 30 },
    {
      ...broken.environment,
      createObserver() {
        throw new Error("Observer unavailable");
      },
    },
  );
  assert.equal(broken.calls.cancel, 1);
  assert.equal(broken.listenerCount(), 0);
});
