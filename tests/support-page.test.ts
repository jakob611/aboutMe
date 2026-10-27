import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import DonatePage from "../src/app/donate/page";
import type { Lang } from "../src/lib/i18n";
import { koFiProfile } from "../src/lib/kofi-profile";

const require = createRequire(resolve("package.json"));
const requestHeaders = require("next/headers") as typeof import("next/headers");

test("the embedded panel and fallback share one validated Ko-fi recipient", () => {
  assert.deepEqual(koFiProfile("https://ko-fi.com/jakobtominc/"), {
    href: "https://ko-fi.com/jakobtominc",
    panelUrl: "https://ko-fi.com/jakobtominc/?hidefeed=true&widget=true&embed=true",
  });
  assert.deepEqual(koFiProfile("https://ko-fi.com/another_owner"), {
    href: "https://ko-fi.com/another_owner",
    panelUrl: "https://ko-fi.com/another_owner/?hidefeed=true&widget=true&embed=true",
  });
  for (const href of ["", "javascript:alert(1)", "http://ko-fi.com/jakobtominc", "https://example.com/jakobtominc", "https://ko-fi.com/owner/shop", "https://ko-fi.com/owner?widget=true", "https://user@ko-fi.com/owner"]) {
    assert.equal(koFiProfile(href), null);
  }
});

test("Support keeps a real Ko-fi fallback and defers the third-party panel until requested", async (t) => {
  let lang: Lang = "en";
  t.mock.method(requestHeaders, "headers", async () => new Headers({ "x-site-language": lang }));
  t.mock.method(requestHeaders, "cookies", async () => ({ get: () => undefined }));

  for (const selected of ["en", "sl"] as const) {
    lang = selected;
    const html = renderToStaticMarkup(await DonatePage());
    assert.match(html, /id="donations"/);
    assert.match(html, /href="https:\/\/ko-fi\.com\/jakobtominc"/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.equal(html.split('id="kofi-support-panel"').length - 1, 1);
    assert.ok(html.includes(selected === "sl" ? "Podpri me" : "Support me"));
    assert.doesNotMatch(html, /<iframe|overlay-widget\.js|<script/);
  }
});
