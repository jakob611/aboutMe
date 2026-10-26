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
  let paused = false;
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
    if (destroyed || paused || preference.matches || page.hidden || !inView) return;
    timer = environment.setTimer(() => {
      timer = undefined;
      if (destroyed) return;
      advance();
      schedule();
    }, 4000);
  };
  const setPaused = (value: boolean) => {
    if (destroyed) return;
    paused = value;
    onPausedChange(paused || preference.matches);
    schedule();
  };
  const clickAway = (event: Event) => {
    const target = event.target as Element | null;
    const subject = target?.closest?.("[data-workshop-subject]");
    if (subject && element.contains(subject)) return;
    if (paused) setPaused(false);
  };
  const preferenceChanged = () => {
    onPausedChange(paused || preference.matches);
    schedule();
  };
  page.addEventListener("click", clickAway);
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
  onPausedChange(paused || preference.matches);
  schedule();
  return {
    setPaused,
    destroy() {
      destroyed = true;
      clear();
      observer?.disconnect();
      page.removeEventListener("click", clickAway);
      preference.removeEventListener("change", preferenceChanged);
      page.removeEventListener("visibilitychange", schedule);
    },
  };
}
