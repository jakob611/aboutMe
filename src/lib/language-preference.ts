import { DEFAULT_LANG, LANG_COOKIE, type Lang } from "@/lib/i18n";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "sl";
}

/** Pick the highest-priority supported browser language, ignoring q=0 entries. */
export function browserLanguage(header: string | null | undefined): Lang {
  const candidates = (header || "")
    .split(",")
    .map((entry, order) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith("q="),
      );
      const quality =
        qualityParameter === undefined
          ? 1
          : Number(qualityParameter.trim().slice(2));
      return { language: tag.toLowerCase().split("-")[0], quality, order };
    })
    .filter(
      (candidate) =>
        isLang(candidate.language) &&
        Number.isFinite(candidate.quality) &&
        candidate.quality > 0 &&
        candidate.quality <= 1,
    );
  candidates.sort((a, b) => b.quality - a.quality || a.order - b.order);
  return candidates.length ? (candidates[0].language as Lang) : DEFAULT_LANG;
}

type Preference = {
  queryLanguage?: string | null;
  cookieLanguage?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
};

/** A saved or explicit choice always wins over country/browser detection. */
export function resolveLanguage({
  queryLanguage,
  cookieLanguage,
  country,
  acceptLanguage,
}: Preference): Lang {
  if (isLang(queryLanguage)) return queryLanguage;
  if (isLang(cookieLanguage)) return cookieLanguage;
  const countryCode = country?.trim().toUpperCase();
  // XX (unknown) and T1 (Tor) do not identify a usable visitor country.
  if (countryCode && /^[A-Z]{2}$/.test(countryCode) && countryCode !== "XX") {
    return countryCode === "SI" ? "sl" : "en";
  }
  return browserLanguage(acceptLanguage);
}

/** Preserve unrelated cookies, replacing every stale/duplicate lang value. */
export function requestWithLanguageCookie(header: string | null, lang: Lang) {
  return [
    ...(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && part.split("=", 1)[0] !== LANG_COOKIE),
    `${LANG_COOKIE}=${lang}`,
  ].join("; ");
}

/** Change only lang; retain the current route, filters, inquiry subject and hash. */
export function languageHref(currentUrl: string, next: Lang) {
  const url = new URL(currentUrl);
  url.searchParams.set("lang", next);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function languagePreferenceCookie(lang: Lang, secure: boolean) {
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function languageNavigation(currentUrl: string, next: Lang) {
  return {
    href: languageHref(currentUrl, next),
    cookie: languagePreferenceCookie(
      next,
      new URL(currentUrl).protocol === "https:",
    ),
  };
}
