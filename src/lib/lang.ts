import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/i18n";

/**
 * Returns the currently active language for this request.
 * Precedence:
 *   1. ?lang=en|sl query parameter (sticky — saved to cookie)
 *   2. lang cookie
 *   3. Accept-Language (Cloudflare country selection is persisted by middleware)
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
