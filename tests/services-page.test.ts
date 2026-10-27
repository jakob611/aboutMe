import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { renderToReadableStream } from "react-dom/server";
import { neonConfig } from "@neondatabase/serverless";
import ServicesPage from "../src/app/services/page";
import {
  coreServiceIdFromSlug,
  serviceOfferings,
} from "../src/lib/service-offerings";
import type { Lang } from "../src/lib/i18n";
import { serviceInquiryHref } from "../src/lib/inquiry-topics";

const require = createRequire(resolve("package.json"));
const requestHeaders = require("next/headers") as typeof import("next/headers");
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

test("service catalog remains useful without Neon and preserves configured service details", async (t) => {
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  let lang: Lang = "en";
  t.mock.method(
    requestHeaders,
    "headers",
    async () => new Headers({ "x-site-language": lang }),
  );
  t.mock.method(requestHeaders, "cookies", async () => ({
    get: () => undefined,
  }));
  t.mock.method(console, "error", () => {});
  t.after(() => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    neonConfig.fetchFunction = oldFetch;
  });

  await t.test(
    "all four core offerings render in both languages without credentials",
    async () => {
      delete process.env.DATABASE_URL;
      let fetchCalls = 0;
      neonConfig.fetchFunction = async () => {
        fetchCalls++;
        throw new Error("Unexpected database request");
      };
      for (const selected of ["en", "sl"] as const) {
        lang = selected;
        const html = await new Response(await renderToReadableStream(await ServicesPage())).text();
        for (const id of ["android", "web", "automation", "printing"]) {
          assert.equal(html.split(`id="${id}"`).length - 1, 1);
        }
        for (const offering of serviceOfferings[lang]) {
          assert.ok(html.includes(escapeHtml(offering.title)));
          assert.ok(
            html.includes(
              escapeHtml(serviceInquiryHref(offering.id)),
            ),
          );
        }
        assert.equal(html.includes("€"), false);
      }
      assert.equal(fetchCalls, 0);
    },
  );

  await t.test(
    "known aliases keep descriptions, custom titles and prices without duplicating core cards",
    async () => {
      process.env.DATABASE_URL =
        "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
      const rows = [
        [
          "1",
          "mobile-apps",
          "app",
          "Configured Android package",
          "Prilagojena Android ponudba",
          "Android details from the database",
          "Android podrobnosti iz zbirke",
          "€121",
          "0",
        ],
        [
          "2",
          "web",
          "web",
          "Configured website package",
          "Prilagojena spletna ponudba",
          "Website details from the database",
          "Spletne podrobnosti iz zbirke",
          "€242",
          "1",
        ],
        [
          "3",
          "ai-automation",
          "sparkles",
          "Configured automation package",
          "Prilagojena avtomatizacija",
          "Automation details from the database",
          "Podrobnosti avtomatizacije iz zbirke",
          "€363",
          "2",
        ],
        [
          "4",
          "code-review",
          "web",
          "Code review",
          "Pregled kode",
          "An additional configured service",
          "Dodatna storitev iz zbirke",
          "€484",
          "3",
        ],
      ];
      neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
        assert.match(JSON.parse(String(init.body)).query, /from "services"/);
        return Response.json({
          fields: [
            "id",
            "slug",
            "icon",
            "title_en",
            "title_sl",
            "description_en",
            "description_sl",
            "price_from",
            "order_index",
          ].map((name) => ({ name, dataTypeID: 25 })),
          rows,
          rowCount: rows.length,
        });
      };
      for (const selected of ["en", "sl"] as const) {
        lang = selected;
        const html = await new Response(await renderToReadableStream(await ServicesPage())).text();
        for (const id of ["android", "web", "automation", "printing"])
          assert.equal(html.split(`id="${id}"`).length - 1, 1);
        for (const row of rows) {
          assert.ok(
            html.includes(row[lang === "en" ? 3 : 4]),
            `Missing configured title: ${row[3]}`,
          );
          assert.ok(html.includes(row[lang === "en" ? 5 : 6]));
          assert.equal(html.split(row[7]).length - 1, 1);
        }
        assert.ok(
          html.includes(lang === "en" ? "Other services" : "Druge storitve"),
        );
      }
    },
  );

  await t.test(
    "alias normalization does not swallow unrelated services",
    () => {
      assert.equal(coreServiceIdFromSlug(" Mobile Apps "), "android");
      assert.equal(coreServiceIdFromSlug("AI & Automation"), "automation");
      assert.equal(coreServiceIdFromSlug("web-development"), "web");
      assert.equal(coreServiceIdFromSlug("3D printing"), "printing");
      assert.equal(coreServiceIdFromSlug("code-review"), undefined);
      assert.equal(coreServiceIdFromSlug("prototype"), undefined);
    },
  );
});
