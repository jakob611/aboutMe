import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { neonConfig } from "@neondatabase/serverless";
import { POST as login } from "../src/app/api/admin/login/route";
import { POST as uploadImage } from "../src/app/api/admin/upload/route";
import { POST as uploadFile } from "../src/app/api/files/route";
import { createAdminSession } from "../src/lib/admin-auth";
import { readBoundedForm, readBoundedJson } from "../src/lib/request-body";

function streamedRequest(path: string, chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let read = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (read < chunks.length) controller.enqueue(chunks[read++]);
      else controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new NextRequest(`https://example.com${path}`, { method: "POST", body, headers });
  return { request, reads: () => read, cancelled: () => cancelled };
}

const bytes = (value: string) => new TextEncoder().encode(value);

test("bounded request readers reject excess bytes before parsing complete bodies", async t => {
  await t.test("declared oversized bodies are not consumed", async () => {
    const input = streamedRequest("/", [bytes("{}")], { "content-length": "999" });
    assert.deepEqual(await readBoundedJson(input.request, 32), { ok: false, status: 413 });
    assert.equal(input.reads(), 0);
    assert.equal(input.cancelled(), true);
  });
  await t.test("JSON with absent or falsely small length is stopped and cancelled", async () => {
    const variants: Record<string, string>[] = [{}, { "content-length": "1" }];
    for (const headers of variants) {
      const input = streamedRequest("/", [bytes('{"password":"'), bytes("x".repeat(64)), bytes('"}'), bytes("unread")], headers);
      assert.deepEqual(await readBoundedJson(input.request, 32), { ok: false, status: 413 });
      assert.equal(input.cancelled(), true);
      assert.ok(input.reads() < 4);
    }
  });
  await t.test("multipart is bounded while streaming and valid multipart remains usable", async () => {
    const header = bytes('--audit\r\nContent-Disposition: form-data; name="password"\r\n\r\n');
    const input = streamedRequest("/", [header, bytes("x".repeat(1024)), bytes("unread")], { "content-type": "multipart/form-data; boundary=audit" });
    assert.deepEqual(await readBoundedForm(input.request, 256), { ok: false, status: 413 });
    assert.equal(input.cancelled(), true);
    const form = new FormData(); form.set("password", "fixture");
    form.set("file", new File(["sample"], "sample.txt", { type: "text/plain" }));
    const result = await readBoundedForm(new NextRequest("https://example.com/", { method: "POST", body: form }), 2048);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.get("password"), "fixture");
      assert.equal(await (result.value.get("file") as File).text(), "sample");
    }
  });
  await t.test("invalid JSON returns a client error", async () => {
    assert.deepEqual(await readBoundedJson(new Request("https://example.com/", { method: "POST", body: "{" }), 32), { ok: false, status: 400 });
  });
});

test("login and uploads enforce body limits without weakening authorization", async t => {
  const variables = ["UPLOAD_PASSWORD", "ADMIN_SESSION_SECRET", "DATABASE_URL"] as const;
  const prior = Object.fromEntries(variables.map(key => [key, process.env[key]]));
  const symbol = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[symbol];
  const oldFetch = neonConfig.fetchFunction;
  let storageWrites = 0;
  const storedKeys: string[] = [];
  process.env.UPLOAD_PASSWORD = "body-limit-test-password";
  process.env.ADMIN_SESSION_SECRET = "body-limit-test-signing-secret-at-least-32";
  globals[symbol] = { env: {
    ADMIN_LOGIN_LIMITER: { async limit() { return { success: true }; } },
    UPLOADS: { async put(key: string) { storageWrites++; storedKeys.push(key); return { etag: "fixture" }; }, async delete() {} },
  } };
  t.after(() => {
    for (const key of variables) {
      if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
    }
    if (oldContext === undefined) delete globals[symbol]; else globals[symbol] = oldContext;
    neonConfig.fetchFunction = oldFetch;
  });
  const cookie = `admin_session=${(await createAdminSession()).token}`;
  await t.test("login rejects chunked excessive JSON and accepts the existing password", async () => {
    const input = streamedRequest("/api/admin/login", [bytes('{"password":"'), bytes("x".repeat(17 * 1024)), bytes('"}')], { "content-type": "application/json" });
    const rejected = await login(input.request);
    assert.equal(rejected.status, 413);
    assert.equal(rejected.headers.get("set-cookie"), null);
    assert.equal(input.cancelled(), true);
    assert.equal((await login(new NextRequest("https://example.com/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: process.env.UPLOAD_PASSWORD }) }))).status, 200);
  });
  await t.test("legacy file upload rejects declared oversized bodies before consumption", async () => {
    const input = streamedRequest("/api/files", [bytes("not consumed")], { "content-length": String(51 * 1024 * 1024) });
    assert.equal((await uploadFile(input.request)).status, 413);
    assert.equal(input.reads(), 0);
    assert.equal(storageWrites, 0);
    const form = new FormData(); form.set("password", "wrong");
    assert.equal((await uploadFile(new NextRequest("https://example.com/api/files", { method: "POST", body: form }))).status, 401);
  });
  await t.test("image upload rejects oversized streamed multipart with no length", async () => {
    const chunks = [bytes('--audit\r\nContent-Disposition: form-data; name="file"; filename="cover.png"\r\nContent-Type: image/png\r\n\r\n'), ...Array.from({ length: 14 }, () => new Uint8Array(1024 * 1024)), bytes("unread")];
    const input = streamedRequest("/api/admin/upload", chunks, { cookie, "content-type": "multipart/form-data; boundary=audit" });
    assert.equal((await uploadImage(input.request)).status, 413);
    assert.equal(input.cancelled(), true);
    assert.ok(input.reads() < chunks.length);
    assert.equal(storageWrites, 0);
  });
  await t.test("image authorization happens before reading its body; valid images still upload", async () => {
    const denied = streamedRequest("/api/admin/upload", [bytes("unread")]);
    assert.equal((await uploadImage(denied.request)).status, 401);
    assert.equal(denied.reads(), 0);
    const form = new FormData(); form.set("file", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "cover.png", { type: "image/png" }));
    assert.equal((await uploadImage(new NextRequest("https://example.com/api/admin/upload", { method: "POST", headers: { cookie }, body: form }))).status, 200);
    assert.equal(storageWrites, 1);
  });
  await t.test("file metadata outside schema or UI limits is rejected before storage", async () => {
    const writesBefore = storageWrites;
    for (const [name, type, description] of [
      ["x".repeat(256), "text/plain", ""],
      ["sample.txt", `application/${"a".repeat(121)}`, ""],
      ["sample.txt", "text/plain", "x".repeat(501)],
    ]) {
      const form = new FormData();
      form.set("password", process.env.UPLOAD_PASSWORD!);
      form.set("file", new File(["sample"], name, { type }));
      form.set("description", description);
      assert.equal((await uploadFile(new NextRequest("https://example.com/api/files", { method: "POST", body: form }))).status, 400);
    }
    assert.equal(storageWrites, writesBefore);
  });
  await t.test("valid long filenames retain the public name and fit the stored-name column", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
    const filename = `${"x".repeat(251)}.txt`;
    let insertedParameters: unknown[] = [];
    neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
      const parsed = JSON.parse(String(init.body)) as { query: string; params: unknown[] };
      assert.match(parsed.query, /^insert into "files"/);
      insertedParameters = parsed.params;
      return Response.json({ fields: [{ name: "id", dataTypeID: 23 }], rows: [[1]], rowCount: 1 });
    };
    const form = new FormData();
    form.set("password", process.env.UPLOAD_PASSWORD!);
    form.set("file", new File(["sample"], filename, { type: "text/plain" }));
    assert.equal((await uploadFile(new NextRequest("https://example.com/api/files", { method: "POST", body: form }))).status, 200);
    assert.equal(storedKeys.at(-1)?.length, 255);
    assert.ok(insertedParameters.includes(filename));
    assert.ok(insertedParameters.includes(storedKeys.at(-1)));
  });
});
