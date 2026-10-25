import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import {
  languageHref,
  languagePreferenceCookie,
} from "@/lib/language-preference";

type DocumentEvents = Pick<
  Document,
  "cookie" | "visibilityState" | "addEventListener" | "removeEventListener"
>;
type BrowserEvents = Pick<
  Window,
  "location" | "addEventListener" | "removeEventListener"
>;

/** Keep a restored/shared document's language aligned with future server requests. */
export function synchronizeDocumentLanguage(
  lang: Lang,
  {
    document: documentEvents,
    browser,
  }: { document: DocumentEvents; browser: BrowserEvents },
) {
  const matchesDocument = () =>
    documentEvents.cookie
      .split(";")
      .some((part) => part.trim() === `${LANG_COOKIE}=${lang}`);
  const saveDocumentLanguage = () => {
    documentEvents.cookie = languagePreferenceCookie(
      lang,
      browser.location.protocol === "https:",
    );
  };
  const synchronize = () => {
    if (matchesDocument()) return;
    saveDocumentLanguage();
    const current = new URL(browser.location.href);
    const href = languageHref(current.href, lang);
    // Same-URL replacement with a fragment may be a same-document navigation.
    // reload() guarantees that the old layout/prefetch cache is discarded.
    if (href === current.pathname + current.search + current.hash)
      browser.location.reload();
    else browser.location.replace(href);
  };
  const pageShow = (event: Event) => {
    if ("persisted" in event && event.persisted === true) synchronize();
  };
  const focus = () => synchronize();
  const visibility = () => {
    if (documentEvents.visibilityState === "visible") synchronize();
  };
  const routeClick = (event: Event) => {
    if (event.defaultPrevented || matchesDocument()) return;
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    let url: URL;
    try {
      url = new URL(anchor.href, browser.location.href);
    } catch {
      return;
    }
    if (url.origin !== browser.location.origin) return;
    const mouse = event as MouseEvent;
    const otherContext =
      mouse.ctrlKey ||
      mouse.metaKey ||
      mouse.shiftKey ||
      mouse.altKey ||
      mouse.button > 0 ||
      (anchor.target && anchor.target !== "_self");
    if (
      otherContext ||
      anchor.hasAttribute("download") ||
      anchor.getAttribute("href")?.startsWith("#")
    ) {
      return;
    }
    // A stale cookie can also mean a stale prefetched page. A fresh document is
    // safer than racing a router refresh against that same navigation event.
    event.preventDefault();
    saveDocumentLanguage();
    browser.location.assign(languageHref(url.href, lang));
  };

  browser.addEventListener("pageshow", pageShow);
  browser.addEventListener("focus", focus);
  documentEvents.addEventListener("visibilitychange", visibility);
  documentEvents.addEventListener("click", routeClick, true);
  return () => {
    browser.removeEventListener("pageshow", pageShow);
    browser.removeEventListener("focus", focus);
    documentEvents.removeEventListener("visibilitychange", visibility);
    documentEvents.removeEventListener("click", routeClick, true);
  };
}
