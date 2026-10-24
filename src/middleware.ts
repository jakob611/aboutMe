import { NextResponse, type NextRequest } from "next/server";

const LANG_COOKIE = "lang";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Forward the actual request URL to server components; never trust a caller's x-url.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", url.toString());
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const query = url.searchParams.get("lang");
  const existing = req.cookies.get(LANG_COOKIE)?.value;

  // A deliberate switch must take precedence over an older saved preference.
  if (query === "en" || query === "sl") {
    response.cookies.set(LANG_COOKIE, query, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }
  if (existing === "en" || existing === "sl") return response;

  // Cloudflare's country header is available in production. Local previews use
  // Accept-Language, without a slow third-party request or visitor IP disclosure.
  const country = req.headers.get("cf-ipcountry");
  const lang = country
    ? country.toUpperCase() === "SI"
      ? "sl"
      : "en"
    : /\bsl\b/i.test(req.headers.get("accept-language") || "")
      ? "sl"
      : "en";
  response.cookies.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Make the first render agree with the preference being sent to the browser.
  const requestCookies = req.headers.get("cookie") || "";
  requestHeaders.set(
    "cookie",
    requestCookies + (requestCookies ? "; " : "") + LANG_COOKIE + "=" + lang,
  );
  return NextResponse.next({
    request: { headers: requestHeaders },
    headers: { "set-cookie": response.headers.get("set-cookie")! },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
