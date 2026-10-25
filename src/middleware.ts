import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n";
import {
  requestWithLanguageCookie,
  resolveLanguage,
} from "@/lib/language-preference";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const existing = req.cookies.get(LANG_COOKIE)?.value;
  const lang = resolveLanguage({
    queryLanguage: url.searchParams.get("lang"),
    cookieLanguage: existing,
    country: req.headers.get("cf-ipcountry"),
    acceptLanguage: req.headers.get("accept-language"),
  });

  // Server pages, shared layout and metadata must all see the same selection.
  // Overwrite these headers so caller-supplied language/URL headers cannot disagree.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", url.toString());
  requestHeaders.set("x-site-language", lang);
  requestHeaders.set(
    "cookie",
    requestWithLanguageCookie(req.headers.get("cookie"), lang),
  );
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (existing !== lang) {
    response.cookies.set(LANG_COOKIE, lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: url.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
