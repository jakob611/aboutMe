import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/admin/login/route";
import { POST as logout } from "../src/app/api/admin/logout/route";
import { GET as list, POST as create } from "../src/app/api/admin/projects/route";
import { PATCH as edit, DELETE as remove } from "../src/app/api/admin/projects/[id]/route";
import { GET as messages } from "../src/app/api/admin/messages/route";
import { POST as contact } from "../src/app/api/contact/route";
import { POST as upload } from "../src/app/api/admin/upload/route";
import { GET as media } from "../src/app/api/media/[...key]/route";
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, verifyAdminSession } from "../src/lib/admin-auth";
import { projectInputSchema } from "../src/lib/project-input";

test("admin security, CRUD, messages, and image regressions", async t => {
  const oldEnv = { ...process.env };
  const oldFetch = neonConfig.fetchFunction;
  const symbol = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[symbol];
  t.after(() => {
    for (const key of ["ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "DATABASE_URL"]) {
      if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
    }
    neonConfig.fetchFunction = oldFetch;
    if (oldContext === undefined) delete globals[symbol]; else globals[symbol] = oldContext;
  });
  process.env.ADMIN_PASSWORD = "test-only-admin";
  process.env.ADMIN_SESSION_SECRET = "test-only-session-secret-at-least-32-characters";
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let blocked = false, storageReads = 0;
  const objects = new Map<string, { bytes: ArrayBuffer; type: string }>();
  globals[symbol] = { env: {
    ADMIN_LOGIN_LIMITER: { async limit() { return { success: !blocked }; } },
    UPLOADS: {
      async put(key: string, bytes: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
        objects.set(key, { bytes, type: options.httpMetadata.contentType });
      },
      async get(key: string) {
        storageReads++;
        const obj = objects.get(key);
        return obj ? { body: new Blob([obj.bytes]).stream(), size: obj.bytes.byteLength, httpMetadata: { contentType: obj.type } } : null;
      },
      async delete(key: string) { objects.delete(key); },
    },
  } };
  const columns = ["id","slug","title_en","title_sl","summary_en","summary_sl","description_en","description_sl","category","tags","cover_image","gallery","link_url","link_label","repo_url","featured","created_at"];
  let stored: string[] | null = null;
  let submitted: string[] | null = null;
  const sql: string[] = [];
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const { query, params } = JSON.parse(String(init.body)) as { query: string; params: unknown[] };
    sql.push(query);
    if (query.includes('"contact_messages"')) {
      if (query.startsWith("insert")) submitted = ["1", ...params.map(String), "2026-10-24 12:00:00"];
      return Response.json({
        fields: ["id","name","email","subject","message","created_at"].map(name => ({ name, dataTypeID: 25 })),
        rows: query.startsWith("select") && submitted ? [submitted] : [], rowCount: submitted ? 1 : 0,
      });
    }
    if (query.startsWith('insert into "projects"')) stored = ["1", ...params.map(String), "2026-10-24 12:00:00"];
    if (query.startsWith('update "projects"') && stored) stored = ["1", ...params.slice(0, -1).map(String), stored[16]];
    if (query.startsWith('delete from "projects"')) stored = null;
    return Response.json({
      fields: columns.map(name => ({ name, dataTypeID: 25 })),
      rows: stored ? [stored] : [], rowCount: stored ? 1 : 0,
    });
  };
  const request = (path: string, method = "GET", body?: unknown, cookie?: string, origin = "https://example.com") =>
    new NextRequest("https://example.com" + path, {
      method, headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const input = { slug: "demo", titleEn: "Demo", titleSl: "Demo", summaryEn: "Summary", summarySl: "Povzetek", descriptionEn: "Description", descriptionSl: "Opis", category: "web" };
  let cookie = "";

  await t.test("login rejects cross-origin, malformed data and excessive attempts", async () => {
    assert.equal((await login(request("/api/admin/login", "POST", { password: "test-only-admin" }, undefined, "https://evil.test"))).status, 403);
    assert.equal((await login(request("/api/admin/login", "POST", { password: {} }))).status, 400);
    blocked = true;
    const res = await login(request("/api/admin/login", "POST", { password: "test-only-admin" }));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("retry-after"), "60");
    blocked = false;
  });
  await t.test("sessions are signed, expire, rotate and use protected cookies", async () => {
    const res = await login(request("/api/admin/login", "POST", { password: "test-only-admin" }));
    assert.equal(res.status, 200);
    cookie = res.headers.get("set-cookie")!.split(";")[0];
    assert.match(res.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(res.headers.get("set-cookie")!, /SameSite=strict/i);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    const token = cookie.slice(ADMIN_COOKIE.length + 1);
    assert.equal(await verifyAdminSession(token), true);
    assert.equal(await verifyAdminSession(token + "x"), false);
    process.env.ADMIN_SESSION_SECRET += "rotated";
    assert.equal(await verifyAdminSession(token), false);
    process.env.ADMIN_SESSION_SECRET = "test-only-session-secret-at-least-32-characters";
    const now = Date.now;
    let expired: string;
    try { Date.now = () => now() - 8 * 86400000; expired = (await createAdminSession()).token; }
    finally { Date.now = now; }
    assert.equal(await verifyAdminSession(expired!), false);
    assert.equal(adminCookieOptions(1).httpOnly, true);
  });
  await t.test("every project mutation requires authentication and same origin", async () => {
    const ctx = { params: Promise.resolve({ id: "1" }) };
    assert.equal((await create(request("/api/admin/projects", "POST", input))).status, 401);
    assert.equal((await edit(request("/api/admin/projects/1", "PATCH", input), ctx)).status, 401);
    assert.equal((await remove(request("/api/admin/projects/1", "DELETE"), ctx)).status, 401);
    assert.equal((await edit(request("/api/admin/projects/1", "PATCH", input, cookie, "https://evil.test"), ctx)).status, 403);
    assert.equal(sql.length, 0);
  });
  await t.test("missing, forged, tampered and expired sessions cannot read or mutate private data", async () => {
    const token = cookie.slice(ADMIN_COOKIE.length + 1);
    const parts = token.split(".");
    parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
    const now = Date.now;
    let expired: string;
    try {
      Date.now = () => now() - 8 * 86400000;
      expired = (await createAdminSession()).token;
    } finally { Date.now = now; }

    for (const invalidToken of [undefined, "forged", parts.join("."), expired!]) {
      const invalidCookie = invalidToken ? `${ADMIN_COOKIE}=${invalidToken}` : undefined;
      const context = { params: Promise.resolve({ id: "1" }) };
      const responses = [
        await list(request("/api/admin/projects", "GET", undefined, invalidCookie)),
        await messages(request("/api/admin/messages", "GET", undefined, invalidCookie)),
        await create(request("/api/admin/projects", "POST", input, invalidCookie)),
        await edit(request("/api/admin/projects/1", "PATCH", input, invalidCookie), context),
        await remove(request("/api/admin/projects/1", "DELETE", undefined, invalidCookie), context),
        await upload(new NextRequest("https://example.com/api/admin/upload", {
          method: "POST",
          headers: { origin: "https://example.com", ...(invalidCookie ? { cookie: invalidCookie } : {}) },
          // No body: authorization must fail before parsing uploads or touching R2.
        })),
      ];
      for (const response of responses) {
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(await response.json(), { error: "Unauthorized" });
      }
    }
    assert.equal(sql.length, 0);
    assert.equal(objects.size, 0);
    assert.equal(storageReads, 0);
  });
  await t.test("production cookies stay Secure, HTTP-only and same-site protected", () => {
    const before = process.env.NODE_ENV;
    try {
      Object.assign(process.env, { NODE_ENV: "production" });
      assert.deepEqual(adminCookieOptions(604800), {
        httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 604800,
      });
      assert.equal(adminCookieOptions(0).maxAge, 0);
    } finally {
      if (before === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
      else Object.assign(process.env, { NODE_ENV: before });
    }
  });
  await t.test("projects can be created, listed, edited and deleted through Drizzle", async () => {
    assert.equal((await create(request("/api/admin/projects", "POST", input, cookie))).status, 200);
    const listed = await list(request("/api/admin/projects", "GET", undefined, cookie));
    assert.equal((await listed.json()).projects[0].slug, "demo");
    const edited = await edit(request("/api/admin/projects/1", "PATCH", { ...input, titleEn: "Updated", gallery: ["/api/media/projects/shared.png"] }, cookie), { params: Promise.resolve({ id: "1" }) });
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).project.titleEn, "Updated");
    const media = { version: 2, images: [
      { url: "/api/media/projects/first.png", captionEn: "First", captionSl: "Prva" },
      { url: "/api/media/projects/second.png", captionEn: "Second", captionSl: "Druga" },
    ], coverCaptionEn: "Cover", coverCaptionSl: "Naslovna", sourceVisibility: "closed" };
    const captioned = await edit(request("/api/admin/projects/1", "PATCH", { ...input, gallery: media, repoUrl: "https://example.com/private", linkUrl: "glowupp.org" }, cookie), { params: Promise.resolve({ id: "1" }) });
    assert.equal(captioned.status, 200);
    const captionedProject = (await captioned.json()).project;
    assert.deepEqual(captionedProject.gallery, media);
    assert.equal(captionedProject.repoUrl, "https://example.com/private", "the authenticated editor retains the private URL");
    assert.equal(captionedProject.linkUrl, "https://glowupp.org/");
    const oldClient = await edit(request("/api/admin/projects/1", "PATCH", { ...input, gallery: [media.images[1].url, media.images[0].url] }, cookie), { params: Promise.resolve({ id: "1" }) });
    assert.equal(oldClient.status, 200);
    const preserved = (await oldClient.json()).project;
    assert.deepEqual(preserved.gallery, { ...media, images: [media.images[1], media.images[0]] });
    assert.equal(preserved.repoUrl, captionedProject.repoUrl);
    assert.equal(preserved.linkUrl, captionedProject.linkUrl);
    assert.equal((await remove(request("/api/admin/projects/1", "DELETE", undefined, cookie), { params: Promise.resolve({ id: "1" }) })).status, 200);
    assert.equal((await remove(request("/api/admin/projects/1", "DELETE", undefined, cookie), { params: Promise.resolve({ id: "1" }) })).status, 404);
    assert.equal((await edit(request("/api/admin/projects/nope", "PATCH", input, cookie), { params: Promise.resolve({ id: "nope" }) })).status, 400);
    assert.ok(sql.some(q => q.startsWith('update "projects"')));
    assert.ok(sql.some(q => q.startsWith('delete from "projects"')));
  });
  await t.test("whitespace-only fields, executable links and invalid gallery URLs are rejected", async () => {
    assert.equal(projectInputSchema.safeParse({ ...input, titleEn: " " }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...input, repoUrl: "javascript:alert(1)" }).success, false);
    assert.equal(projectInputSchema.safeParse({ ...input, gallery: ["/api/media/private.txt"] }).success, false);
    assert.equal((await create(request("/api/admin/projects", "POST", { ...input, linkUrl: "data:text/html,test" }, cookie))).status, 400);
    const malformed = new NextRequest("https://example.com/api/admin/projects", { method: "POST", headers: { cookie, origin: "https://example.com", "content-type": "application/json" }, body: "{" });
    assert.equal((await create(malformed)).status, 400);
  });
  await t.test("contact submissions are visible only to the admin", async () => {
    const before = { secret: process.env.TURNSTILE_SECRET, hosts: process.env.TURNSTILE_HOSTNAMES, fetch: globalThis.fetch };
    try {
      process.env.TURNSTILE_SECRET = "test-only-turnstile-secret";
      process.env.TURNSTILE_HOSTNAMES = "example.com";
      globalThis.fetch = (async url => {
        assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
        return Response.json({ success: true, action: "contact", hostname: "example.com" });
      }) as typeof fetch;
      assert.equal((await contact(request("/api/contact", "POST", { name: "Visitor", email: "visitor@example.com", subject: "Hello", message: "A message", "cf-turnstile-response": "test-only-token" }))).status, 200);
      assert.equal((await messages(request("/api/admin/messages"))).status, 401);
      const res = await messages(request("/api/admin/messages", "GET", undefined, cookie));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).messages[0].message, "A message");
    } finally {
      globalThis.fetch = before.fetch;
      if (before.secret === undefined) delete process.env.TURNSTILE_SECRET; else process.env.TURNSTILE_SECRET = before.secret;
      if (before.hosts === undefined) delete process.env.TURNSTILE_HOSTNAMES; else process.env.TURNSTILE_HOSTNAMES = before.hosts;
    }
  });
  const imageRequest = (value: File | string) => {
    const form = new FormData(); form.set("file", value);
    return new NextRequest("https://example.com/api/admin/upload", { method: "POST", headers: { cookie, origin: "https://example.com" }, body: form });
  };
  await t.test("uploads reject fake images and non-file fields; valid images can be served", async () => {
    assert.equal((await upload(imageRequest("not a file"))).status, 400);
    assert.equal((await upload(imageRequest(new File(["<script>evil</script>"], "fake.png", { type: "image/png" })))).status, 415);
    assert.equal(objects.size, 0);
    const bytes = new Uint8Array([137,80,78,71,13,10,26,10,0]);
    const res = await upload(imageRequest(new File([bytes], "cover.png", { type: "image/png" })));
    assert.equal(res.status, 200);
    const { key } = await res.json();
    const result = await media(request("/api/media/" + key), { params: Promise.resolve({ key: key.split("/") }) });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("content-type"), "image/png");
    assert.equal(result.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), bytes);
    const reads = storageReads;
    assert.equal((await media(request("/api/media/secret.txt"), { params: Promise.resolve({ key: ["secret.txt"] }) })).status, 404);
    assert.equal(storageReads, reads);
  });
  await t.test("logout clears the cookie and rejects cross-origin requests", async () => {
    assert.equal((await logout(request("/api/admin/logout", "POST", undefined, cookie, "https://evil.test"))).status, 403);
    const res = await logout(request("/api/admin/logout", "POST", undefined, cookie));
    assert.match(res.headers.get("set-cookie")!, /Max-Age=0/i);
  });
});

test("the existing upload password remains the admin credential", async t => {
  const keys = ["UPLOAD_PASSWORD", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"] as const;
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  });
  const { getAdminPassword, createAdminSession, verifyAdminSession } = await import("../src/lib/admin-auth");
  process.env.UPLOAD_PASSWORD = "existing-upload-test-password";
  process.env.ADMIN_PASSWORD = "different-unused-admin-password";
  process.env.ADMIN_SESSION_SECRET = "independent-test-signing-secret-at-least-32-characters";
  assert.equal(getAdminPassword(), "existing-upload-test-password");
  const { token } = await createAdminSession();
  assert.equal(await verifyAdminSession(token), true);
  process.env.UPLOAD_PASSWORD = "rotated-upload-test-password";
  assert.equal(await verifyAdminSession(token), false);
  delete process.env.UPLOAD_PASSWORD;
  assert.equal(getAdminPassword(), "different-unused-admin-password");
  delete process.env.ADMIN_PASSWORD;
  assert.equal(getAdminPassword(), "");
});
