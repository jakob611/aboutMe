import { NextResponse, type NextRequest } from "next/server";

const LANG_COOKIE = "lang";

/**
 * On the very first visit, detect visitor country from IP via a free
 * geolocation API and store the result in a cookie. The user can still
 * override it with the language switcher (which sets ?lang= and updates
 * the cookie). Cloudflare also exposes cf-ipcountry as a header when
 * you deploy behind Cloudflare, so we prefer that when available.
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const response = NextResponse.next();

  // Pass the full URL to server components via a header so they can
  // read ?lang= overrides without relying on `headers()`.
  response.headers.set("x-url", url.toString());

  // Skip if the language is already sticky in a cookie.
  const existing = req.cookies.get(LANG_COOKIE)?.value;
  if (existing === "en" || existing === "sl") {
    return response;
  }

  // Honour explicit ?lang= even on first visit.
  const queryLang = url.searchParams.get("lang");
  if (queryLang === "en" || queryLang === "sl") {
    response.cookies.set(LANG_COOKIE, queryLang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // Prefer Cloudflare's country header (zero latency, highly reliable).
  const cfCountry =
    req.headers.get("cf-ipcountry") ?? req.headers.get("x-country");
  if (cfCountry) {
    const lang = cfCountry.toUpperCase() === "SI" ? "sl" : "en";
    response.cookies.set(LANG_COOKIE, lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // Fallback: free IP lookup. Only on non-static routes to save latency.
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes(".")
  ) {
    return response;
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (ip && ip !== "unknown") {
      const res = await fetch(
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = (await res.json()) as { country_code?: string };
        const lang = data.country_code === "SI" ? "sl" : "en";
        response.cookies.set(LANG_COOKIE, lang, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
    }
  } catch {
    // Ignore — keep the response going.
  }

  return response;
}

export const config = {
  // Run on all page routes but not on static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
