import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

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
