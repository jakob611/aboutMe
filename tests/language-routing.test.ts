import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageSwitcher } from "../src/components/LanguageSwitcher";
import { Footer } from "../src/components/Footer";
import { translations, type Lang } from "../src/lib/i18n";
import {
  browserLanguage,
  languageHref,
  languageNavigation,
  languagePreferenceCookie,
  requestWithLanguageCookie,
  resolveLanguage,
} from "../src/lib/language-preference";

test("explicit language switches override the saved preference", () => {
  const result = middleware(
    new NextRequest("https://example.com/projects?lang=sl", {
      headers: { cookie: "lang=en", "x-url": "https://wrong.example" },
    }),
  );
  assert.equal(result.cookies.get("lang")?.value, "sl");
  assert.equal(
    result.headers.get("x-middleware-request-x-url"),
    "https://example.com/projects?lang=sl",
  );
  assert.equal(
    result.headers.get("x-middleware-request-x-site-language"),
    "sl",
  );
  assert.equal(result.headers.get("x-middleware-request-cookie"), "lang=sl");
  assert.match(result.headers.get("set-cookie") || "", /Secure/i);
});

test("repeated language switches preserve the route, query values and fragment", () => {
  let current =
    "https://example.com/contact?subject=Android+app&filter=web&lang=en#message";
  for (const next of ["sl", "en", "sl", "en"] as const) {
    const href = languageHref(current, next);
    const target = new URL(href, "https://example.com");
    assert.equal(target.pathname, "/contact");
    assert.equal(target.searchParams.get("subject"), "Android app");
    assert.equal(target.searchParams.get("filter"), "web");
    assert.deepEqual(target.searchParams.getAll("lang"), [next]);
    assert.equal(target.hash, "#message");
    current = target.href;
  }
});

test("explicit preferences override IP detection in either direction", () => {
  assert.equal(
    resolveLanguage({
      queryLanguage: "en",
      cookieLanguage: "sl",
      country: "SI",
    }),
    "en",
  );
  assert.equal(
    resolveLanguage({
      queryLanguage: "sl",
      cookieLanguage: "en",
      country: "US",
    }),
    "sl",
  );
  assert.equal(resolveLanguage({ cookieLanguage: "en", country: "SI" }), "en");
  assert.equal(resolveLanguage({ cookieLanguage: "sl", country: "US" }), "sl");
  assert.equal(
    resolveLanguage({
      queryLanguage: "de",
      cookieLanguage: "sl",
      country: "US",
    }),
    "sl",
  );
  assert.equal(
    resolveLanguage({
      queryLanguage: "bad",
      cookieLanguage: "bad",
      country: "SI",
    }),
    "sl",
  );
});

test("country recognition applies only without a valid saved or URL preference", () => {
  assert.equal(
    resolveLanguage({ country: "SI", acceptLanguage: "en-US,en;q=0.9" }),
    "sl",
  );
  assert.equal(
    resolveLanguage({ country: "GB", acceptLanguage: "sl-SI" }),
    "en",
  );
  assert.equal(
    resolveLanguage({ country: "XX", acceptLanguage: "sl-SI" }),
    "sl",
  );
  assert.equal(
    resolveLanguage({ country: "T1", acceptLanguage: "sl-SI" }),
    "sl",
  );
  assert.equal(
    resolveLanguage({ acceptLanguage: "en-US,en;q=0.9,sl;q=0.1" }),
    "en",
  );
});

test("browser language detection respects q values and disabled languages", () => {
  assert.equal(browserLanguage("en-US,en;q=0.9,sl;q=0.1"), "en");
  assert.equal(browserLanguage("en;q=0.5,sl-SI;q=0.9"), "sl");
  assert.equal(browserLanguage("sl;q=0,en;q=0.7"), "en");
  assert.equal(browserLanguage("sl;q=invalid,en;q=0.7"), "en");
  assert.equal(browserLanguage("SL-si;q=0.8,en;q=0.8"), "sl");
  assert.equal(browserLanguage("de-DE,fr;q=0.8"), "en");
});

test("middleware removes stale duplicate preferences and ignores forged language headers", () => {
  const result = middleware(
    new NextRequest("https://example.com/about?lang=en", {
      headers: {
        cookie: "admin_session=keep.this.signature; lang=sl; other=keep",
        "x-site-language": "sl",
        "x-url": "https://wrong.example/?lang=sl",
        "cf-ipcountry": "SI",
      },
    }),
  );
  assert.equal(
    result.headers.get("x-middleware-request-x-site-language"),
    "en",
  );
  assert.equal(
    result.headers.get("x-middleware-request-cookie"),
    "admin_session=keep.this.signature; other=keep; lang=en",
  );
  assert.equal(
    requestWithLanguageCookie("lang=sl; session=abc; lang=en", "sl"),
    "session=abc; lang=sl",
  );
});

test("language preference cookies last a year and are Secure on HTTPS", () => {
  assert.equal(
    languagePreferenceCookie("sl", true),
    "lang=sl; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
  );
  assert.equal(
    languagePreferenceCookie("en", false),
    "lang=en; Path=/; Max-Age=31536000; SameSite=Lax",
  );
});

test("navigation commits matching cookie and URL choices in both directions", () => {
  let current = "https://example.com/projects?category=web&lang=en#gallery";
  for (const next of ["sl", "en", "sl", "en"] as const) {
    const action = languageNavigation(current, next);
    assert.match(action.cookie, new RegExp(`^lang=${next};`));
    assert.match(action.cookie, /; Secure$/);
    const target = new URL(action.href, current);
    assert.equal(target.searchParams.get("lang"), next);
    assert.equal(target.searchParams.get("category"), "web");
    assert.equal(target.hash, "#gallery");
    current = target.href;
  }
});

test("server-rendered language controls and footer translate in both directions", async () => {
  for (const lang of ["en", "sl"] as Lang[]) {
    const button = renderToStaticMarkup(
      createElement(LanguageSwitcher, {
        lang,
        label: translations[lang].common.switchLang,
      }),
    );
    assert.match(button, /lucide-languages/);
    assert.equal(button.includes("lucide-globe"), false);
    assert.doesNotMatch(button, /<button[^>]*\sdisabled(?:=|\s|>)/);
    assert.ok(button.includes(lang === "en" ? ">SL<" : ">EN<"));
    const footer = renderToStaticMarkup(
      await Footer({ lang, t: translations[lang] }),
    );
    assert.ok(footer.includes(lang === "en" ? "Explore" : "Razišči"));
    assert.ok(footer.includes(lang === "en" ? "Back to top" : "Na vrh"));
  }
});

test("first-visit country preference is available to the initial render", () => {
  const result = middleware(
    new NextRequest("https://example.com/", {
      headers: { "cf-ipcountry": "SI" },
    }),
  );
  assert.equal(result.cookies.get("lang")?.value, "sl");
  assert.match(
    result.headers.get("x-middleware-request-cookie") || "",
    /lang=sl/,
  );
});
