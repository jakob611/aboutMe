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
  createObserver?(
    callback: (entries: readonly { isIntersecting: boolean }[]) => void,
    options: IntersectionObserverInit,
  ): Observer;
};

/** Keep server content readable; enhance entry and scrolling after hydration. */
export function enhanceReveal(
  element: HTMLElement,
  { delay, y }: { delay: number; y: number },
  { preference, viewportHeight, createObserver }: Environment,
) {
  const noop = () => {};
  if (preference.matches || !element.animate) return noop;
  const rect = element.getBoundingClientRect();
  if (rect.bottom <= 0) return noop;
  const inViewport = rect.top < viewportHeight;

  let animation: Animation | undefined;
  let observer: Observer | undefined;
  let started = false;
  const reveal = () => {
    if (started) return;
    started = true;
    observer?.disconnect();
    try {
      animation = element.animate(
        [
          {
            // Entry stays partly readable even when hydration arrives late.
            opacity: inViewport ? 0.2 : 0,
            transform: `translate3d(0, ${Math.min(Math.max(y, 0), 48)}px, 0)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          id: inViewport ? "reveal-entry" : "reveal-scroll",
          duration: 800,
          delay: Math.min(Math.max(delay, 0), 0.3) * 1000,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
      animation.onfinish = () => animation?.cancel();
    } catch {
      animation?.cancel();
    }
  };
  const showImmediately = () => {
    started = true;
    observer?.disconnect();
    animation?.cancel();
  };

  try {
    if (inViewport) {
      reveal();
    } else if (createObserver) {
      // Do not pause an invisible animation while waiting: a silent observer
      // failure must leave the content readable. Animate only upon entry.
      observer = createObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { threshold: 0, rootMargin: "0px 0px -24px 0px" },
      );
      observer.observe(element);
    } else {
      return noop;
    }
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
