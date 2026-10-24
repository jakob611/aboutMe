import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/admin/login/route";
import { GET as listProjects, POST as createProject } from "../src/app/api/admin/projects/route";
import { POST as upload } from "../src/app/api/admin/upload/route";
import { GET as messages } from "../src/app/api/admin/messages/route";
import { ADMIN_COOKIE } from "../src/lib/admin-auth";

test("admin session and protected APIs", async (t) => {
  const oldAdmin = process.env.ADMIN_PASSWORD;
  const oldSecret = process.env.ADMIN_SESSION_SECRET;
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  const contextKey = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[contextKey];
  t.after(() => {
    if (oldAdmin === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = oldAdmin;
    if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = oldSecret;
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    neonConfig.fetchFunction = oldFetch;
    if (oldContext === undefined) delete globals[contextKey];
    else globals[contextKey] = oldContext;
  });

  process.env.ADMIN_PASSWORD = "admin-test-password";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";
  process.env.DATABASE_URL =
    "postgresql://test:test@example.neon.tech/neondb?sslmode=require";

  const objects = new Map<string, ArrayBuffer>();
  globals[contextKey] = {
    env: {
      ADMIN_LOGIN_LIMITER: { async limit() { return { success: true }; } },
      UPLOADS: {
        async put(key: string, value: ArrayBuffer) {
          objects.set(key, value);
        },
        async get(key: string) {
          const value = objects.get(key);
          return value
            ? { body: new Blob([value]).stream(), size: value.byteLength }
            : null;
        },
        async delete(key: string) {
          objects.delete(key);
        },
      },
    },
  };

  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const { query } = JSON.parse(String(init.body)) as { query: string };
    if (query.startsWith('insert into "projects"')) {
      return Response.json({
        fields: [
          "id",
          "slug",
          "title_en",
          "title_sl",
          "summary_en",
          "summary_sl",
          "description_en",
          "description_sl",
          "category",
          "tags",
          "cover_image",
          "gallery",
          "link_url",
          "link_label",
          "repo_url",
          "featured",
          "created_at",
        ].map((name) => ({ name, dataTypeID: 25 })),
        rows: [[
          "1",
          "demo",
          "Demo",
          "Demo",
          "Summary",
          "Povzetek",
          "Description",
          "Opis",
          "web",
          "[]",
          "",
          "[]",
          "",
          "",
          "",
          "false",
          "2026-10-24 12:00:00",
        ]],
        rowCount: 1,
      });
    }
    if (query.includes("contact_messages") || query.includes("projects")) {
      return Response.json({
        fields: [{ name: "id", dataTypeID: 23 }],
        rows: [],
        rowCount: 0,
      });
    }
    return new Response("unexpected query", { status: 500 });
  };

  const jsonRequest = (url: string, body: unknown, cookie?: string) =>
    new NextRequest(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://example.com",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });

  await t.test("wrong password is rejected", async () => {
    const res = await login(
      jsonRequest("https://example.com/api/admin/login", { password: "nope" })
    );
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("set-cookie"), null);
  });

  let cookie = "";
  await t.test("correct password sets an HTTP-only session cookie", async () => {
    const res = await login(
      jsonRequest("https://example.com/api/admin/login", {
        password: "admin-test-password",
      })
    );
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, new RegExp(`${ADMIN_COOKIE}=`));
    assert.match(setCookie, /HttpOnly/i);
    cookie = setCookie.split(";")[0];
  });

  await t.test("admin APIs reject missing sessions", async () => {
    assert.equal(
      (await listProjects(new NextRequest("https://example.com/api/admin/projects"))).status,
      401
    );
    assert.equal(
      (await messages(new NextRequest("https://example.com/api/admin/messages"))).status,
      401
    );
    const form = new FormData();
    form.set("file", new File(["x"], "cover.png", { type: "image/png" }));
    assert.equal(
      (
        await upload(
          new NextRequest("https://example.com/api/admin/upload", {
            method: "POST",
            body: form,
          })
        )
      ).status,
      401
    );
    assert.equal(objects.size, 0);
  });

  await t.test("signed-in admin can create a project and upload to R2", async () => {
    const created = await createProject(
      jsonRequest(
        "https://example.com/api/admin/projects",
        {
          titleEn: "Demo",
          titleSl: "Demo",
          summaryEn: "Summary",
          summarySl: "Povzetek",
          descriptionEn: "Description",
          descriptionSl: "Opis",
          category: "web",
          slug: "demo",
        },
        cookie
      )
    );
    assert.equal(created.status, 200);

    const form = new FormData();
    form.set("file", new File([new Uint8Array([137,80,78,71,13,10,26,10,0])], "cover.png", { type: "image/png" }));
    const uploaded = await upload(
      new NextRequest("https://example.com/api/admin/upload", {
        method: "POST",
        headers: { cookie, origin: "https://example.com" },
        body: form,
      })
    );
    assert.equal(uploaded.status, 200);
    assert.equal(objects.size, 1);
    const body = (await uploaded.json()) as { url: string };
    assert.match(body.url, /^\/api\/media\/projects\//);
  });
});
