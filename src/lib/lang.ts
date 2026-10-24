import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/i18n";

/**
 * Returns the currently active language for this request.
 * Precedence:
 *   1. ?lang=en|sl query parameter (sticky — saved to cookie)
 *   2. lang cookie
 *   3. IP-based detection (Slovenia → sl, otherwise en)
 *   4. DEFAULT_LANG
 */
export async function getLang(): Promise<Lang> {
  try {
    const cookieStore = await cookies();
    const headerList = await headers();

    // 1. Explicit query override
    const url = headerList.get("x-url") ?? "";
    const urlObj = url ? safeUrl(url) : null;
    const queryLang = urlObj?.searchParams.get("lang");
    if (queryLang === "en" || queryLang === "sl") return queryLang;

    // 2. Cookie
    const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
    if (cookieLang === "en" || cookieLang === "sl") return cookieLang;

    // 3. Accept-Language fallback (cheap, no network)
    const accept = headerList.get("accept-language") ?? "";
    if (/\bsl\b/i.test(accept)) return "sl";

    return DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function safeUrl(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

/**
 * Detect language from IP using a free, no-auth geolocation service.
 * Used by middleware on the very first visit.
 */
export async function detectLangFromIp(
  ip: string | null
): Promise<Lang | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { country_code?: string };
    return data.country_code === "SI" ? "sl" : "en";
  } catch {
    return null;
  }
}
