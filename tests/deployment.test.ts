import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { getDb } from "../src/db";
import { POST, DELETE } from "../src/app/api/files/route";
import { GET as download } from "../src/app/api/files/download/route";

// No live database or Cloudflare account is used by these regression tests.
test("deployment and file storage", async (t) => {
  const oldUrl = process.env.DATABASE_URL;
  const oldPassword = process.env.UPLOAD_PASSWORD;
  const oldFetch = neonConfig.fetchFunction;
  const contextKey = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[contextKey];
  t.after(() => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    if (oldPassword === undefined) delete process.env.UPLOAD_PASSWORD;
    else process.env.UPLOAD_PASSWORD = oldPassword;
    neonConfig.fetchFunction = oldFetch;
    if (oldContext === undefined) delete globals[contextKey];
    else globals[contextKey] = oldContext;
  });

  await t.test("database credentials are checked at request time", () => {
    delete process.env.DATABASE_URL;
    assert.throws(() => getDb(), /runtime secrets/);
    process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
    assert.doesNotThrow(() => getDb());
  });

  process.env.UPLOAD_PASSWORD = "test-only-password";
  const objects = new Map<string, ArrayBuffer>();
  globals[contextKey] = { env: {
    ADMIN_LOGIN_LIMITER: { async limit() { return { success: true }; } },
    UPLOADS: {
    async put(key: string, value: ArrayBuffer) { objects.set(key, value); },
    async get(key: string) {
      const value = objects.get(key);
      return value ? { body: new Blob([value]).stream(), size: value.byteLength } : null;
    },
    async delete(key: string) { objects.delete(key); },
  } } };
  let savedName = "";
  let failDatabase = false;
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    if (failDatabase) return new Response("Database unavailable", { status: 503 });
    const { query, params } = JSON.parse(String(init.body));
    if (query.startsWith('insert into "files"')) savedName = params[0];
    return Response.json({
      fields: ["id", "name", "original_name", "mime_type", "size", "description", "created_at"].map(name => ({ name, dataTypeID: 25 })),
      rows: query.startsWith("delete") ? [] : [["1", savedName, "test.txt", "text/plain", "5", "", "2026-10-24 12:00:00"]],
      rowCount: 1,
    });
  };
  const uploadRequest = (password: string) => {
    const form = new FormData();
    form.set("password", password);
    form.set("file", new File(["hello"], "test.txt", { type: "text/plain" }));
    return new NextRequest("https://example.com/api/files", { method: "POST", body: form });
  };
  await t.test("unauthorized uploads never reach storage", async () => {
    assert.equal((await POST(uploadRequest("wrong"))).status, 401);
    assert.equal(objects.size, 0);
  });
  await t.test("upload and download use persistent storage binding", async () => {
    assert.equal((await POST(uploadRequest("test-only-password"))).status, 200);
    assert.equal(objects.size, 1);
    const response = await download(new NextRequest("https://example.com/api/files/download?id=1"));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "hello");
    assert.match(response.headers.get("Content-Disposition")!, /attachment/);
  });
  await t.test("failed database insert cleans up the uploaded object", async () => {
    failDatabase = true;
    try {
      assert.equal((await POST(uploadRequest("test-only-password"))).status, 500);
      assert.equal(objects.size, 1);
    } finally { failDatabase = false; }
  });
  await t.test("delete accepts authorization header, not URL passwords", async () => {
    assert.equal((await DELETE(new NextRequest("https://example.com/api/files?id=1&password=test-only-password", { method: "DELETE" }))).status, 401);
    assert.equal((await DELETE(new NextRequest("https://example.com/api/files?id=1", {
      method: "DELETE", headers: { Authorization: "Bearer test-only-password" },
    }))).status, 200);
    assert.equal(objects.size, 0);
  });
});
