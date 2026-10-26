type Preference = Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
type Observer = Pick<IntersectionObserver, "observe" | "disconnect">;
type Environment = {
  preference: Preference;
  page: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;
  viewportHeight: number;
  setTimer(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout>;
  clearTimer(timer: ReturnType<typeof setTimeout>): void;
  createObserver?(callback: (entries: readonly { isIntersecting: boolean }[]) => void): Observer;
};

/** A single cancellable timer; every interruption earns a fresh reading window. */
export function createWorkshopRotation(
  element: HTMLElement,
  advance: () => void,
  onPausedChange: (paused: boolean) => void,
  environment: Environment,
) {
  const { preference, page } = environment;
  let paused = preference.matches;
  let hovered = false;
  let focused = element.contains(element.ownerDocument.activeElement);
  const rect = element.getBoundingClientRect();
  let inView = rect.bottom > 0 && rect.top < environment.viewportHeight;
  let destroyed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observer: Observer | undefined;
  const clear = () => {
    if (timer !== undefined) environment.clearTimer(timer);
    timer = undefined;
  };
  const schedule = () => {
    clear();
    if (destroyed || paused || hovered || focused || page.hidden || !inView) return;
    timer = environment.setTimer(() => {
      timer = undefined;
      if (destroyed) return;
      advance();
      schedule();
    }, 6000);
  };
  const setPaused = (value: boolean) => {
    if (destroyed) return;
    paused = value;
    onPausedChange(paused);
    schedule();
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    schedule();
  };
  const leave = () => { hovered = false; schedule(); };
  const focusIn = () => { focused = true; schedule(); };
  const focusOut = (event: FocusEvent) => {
    focused = !!event.relatedTarget && element.contains(event.relatedTarget as Node);
    schedule();
  };
  const preferenceChanged = () => {
    if (preference.matches) setPaused(true);
  };
  element.addEventListener("pointerenter", enter);
  element.addEventListener("pointerleave", leave);
  element.addEventListener("focusin", focusIn);
  element.addEventListener("focusout", focusOut);
  preference.addEventListener("change", preferenceChanged);
  page.addEventListener("visibilitychange", schedule);
  try {
    observer = environment.createObserver?.((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      schedule();
    });
    observer?.observe(element);
  } catch {
    // If observation fails, leave the sketch static until the user chooses it.
    inView = false;
  }
  onPausedChange(paused);
  schedule();
  return {
    setPaused,
    destroy() {
      destroyed = true;
      clear();
      observer?.disconnect();
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusin", focusIn);
      element.removeEventListener("focusout", focusOut);
      preference.removeEventListener("change", preferenceChanged);
      page.removeEventListener("visibilitychange", schedule);
    },
  };
}
