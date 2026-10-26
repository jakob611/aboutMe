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

/** Keep intentional navigation consistent without reloading an active draft on focus. */
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

  // Another tab may change the shared cookie. Keep this document and its form
  // state intact until the visitor deliberately follows a link or switches language.
  documentEvents.addEventListener("click", routeClick, true);
  return () => {
    documentEvents.removeEventListener("click", routeClick, true);
  };
}
