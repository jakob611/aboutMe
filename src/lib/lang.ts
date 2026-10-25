import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { isLang, resolveLanguage } from "@/lib/language-preference";

/** Query choice → saved preference → Cloudflare country → browser language. */
export async function getLang(): Promise<Lang> {
  try {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    const selected = headerList.get("x-site-language");
    if (isLang(selected)) return selected;
    let queryLanguage: string | null = null;
    try {
      queryLanguage = new URL(headerList.get("x-url") || "").searchParams.get(
        "lang",
      );
    } catch {
      /* Middleware may be absent in a standalone server render. */
    }
    return resolveLanguage({
      queryLanguage,
      cookieLanguage: cookieStore.get(LANG_COOKIE)?.value,
      country: headerList.get("cf-ipcountry"),
      acceptLanguage: headerList.get("accept-language"),
    });
  } catch {
    return DEFAULT_LANG;
  }
}
