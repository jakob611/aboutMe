type MotionPreference = {
  matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
};

type Observer = {
  observe(target: HTMLElement): void;
  disconnect(): void;
};

type Environment = {
  preference: MotionPreference;
  viewportHeight: number;
  createObserver(
    callback: (entries: readonly { isIntersecting: boolean }[]) => void,
    options: IntersectionObserverInit,
  ): Observer;
};

/** Enhance below-the-fold content while leaving the initial server paint intact. */
export function enhanceReveal(
  element: HTMLElement,
  { delay, y }: { delay: number; y: number },
  { preference, viewportHeight, createObserver }: Environment,
) {
  const noop = () => {};
  if (preference.matches || !element.animate) return noop;
  const rect = element.getBoundingClientRect();
  // Already visible (or already passed) content must not flash back to hidden.
  if (rect.top < viewportHeight || rect.bottom <= 0) return noop;

  let animation: Animation | undefined;
  let observer: Observer | undefined;
  let started = false;
  const reveal = () => {
    if (started) return;
    started = true;
    observer?.disconnect();
    animation?.play();
  };
  const showImmediately = () => {
    started = true;
    observer?.disconnect();
    animation?.cancel();
  };

  try {
    animation = element.animate(
      [
        {
          opacity: 0,
          transform: `translate3d(0, ${Math.min(Math.max(y, 0), 48)}px, 0)`,
        },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 720,
        delay: Math.min(Math.max(delay, 0), 0.4) * 1000,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      },
    );
    animation.pause();
    animation.currentTime = 0;
    animation.onfinish = () => animation?.cancel();
    observer = createObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      // Any intersection can trigger, even for a very tall description section.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(element);
  } catch {
    animation?.cancel();
    observer?.disconnect();
    return noop;
  }

  const reduceMotion = () => {
    if (preference.matches) showImmediately();
  };
  // Tab navigation must never land on a still-transparent link or control.
  element.addEventListener("focusin", showImmediately);
  preference.addEventListener("change", reduceMotion);
  return () => {
    observer?.disconnect();
    animation?.cancel();
    element.removeEventListener("focusin", showImmediately);
    preference.removeEventListener("change", reduceMotion);
  };
}
