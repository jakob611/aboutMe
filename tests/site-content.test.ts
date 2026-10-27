import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ADMIN_COOKIE, createAdminSession } from "../src/lib/admin-auth";
import { GET, PUT } from "../src/app/api/admin/site-content/route";
import { CONTENT_MAX_BYTES, contentFields, createSiteContent, serializeSiteStructuredData, validateContentOverrides } from "../src/lib/site-content";
import { SITE_CONTENT_KEY, boundedJSON, readSiteContent, type ContentBucket } from "../src/lib/site-content-store";

test("retiring the Latest label preserves other saved wording and its concurrency revision", async () => {
  const snapshot = (overrides: Record<string, unknown>): ContentBucket => ({
    async get() {
      const text = JSON.stringify({ version: 1, overrides });
      return { etag: "legacy-revision", size: new TextEncoder().encode(text).byteLength, body: new Blob([text]).stream() };
    },
    async put() { throw new Error("Reading a migration must not write to storage."); },
  });
  const result = await readSiteContent(snapshot({ "en.workshop.latest": "Recent", "sl.workshop.latest": "Zadnje", "en.home.titleLine1": "Owner's title" }));
  assert.deepEqual(result.overrides, { "en.home.titleLine1": "Owner's title" });
  assert.equal(result.revision, "legacy-revision");
  await assert.rejects(() => readSiteContent(snapshot({ "en.workshop.latest": "Recent", "unknown.content.field": "Unexpected" })));
});
import { SiteContentProvider } from "../src/components/SiteContentProvider";
import { CommentSection } from "../src/components/CommentSection";
import { ProjectsClient } from "../src/components/ProjectsClient";

test("public content registry rejects unsafe fields, URLs and empty labels while preserving plain text", () => {
  assert.equal(new Set(contentFields.map(field => field.key)).size, contentFields.length);
  for (const input of [JSON.parse('{"__proto__":{"admin":true}}'), { "UPLOAD_PASSWORD": "no" }, { "profile.github": "javascript:alert(1)" }, { "profile.github": "https://name:password@example.com/" }, { "i18n.en.nav.home": "" }, { "section.about.skills": "false" }]) assert.throws(() => validateContentOverrides(input));
  const title = '<script>alert("not executable")</script>';
  const valid = validateContentOverrides({ "i18n.en.about.title": title, "en.price.web": "", "section.about.skills": false });
  const content = createSiteContent(valid);
  assert.equal(content.translation("en").about.title, title);
  assert.equal(content.section("about.skills"), false);
  assert.equal(content.translation("sl").about.title, "O meni");
  assert.match(renderToStaticMarkup(createElement("h1", null, content.translation("en").about.title)), /&lt;script&gt;/);
  assert.doesNotMatch(renderToStaticMarkup(createElement("h1", null, content.translation("en").about.title)), /<script>/);
});

test("site content API authenticates before reads/body parsing and atomically refuses stale writes", async t => {
  const before = { UPLOAD_PASSWORD: process.env.UPLOAD_PASSWORD, ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET };
  const contextKey = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previousContext = globals[contextKey];
  t.after(() => { for (const key of ["UPLOAD_PASSWORD", "ADMIN_SESSION_SECRET"] as const) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; } if (previousContext === undefined) delete globals[contextKey]; else globals[contextKey] = previousContext; });
  process.env.UPLOAD_PASSWORD = "site-content-unit-test-password";
  process.env.ADMIN_SESSION_SECRET = "site-content-unit-test-signing-secret-at-least32";
  let object: { text: string; etag: string } | null = null; let writes = 0; let reads = 0;
  const bucket: ContentBucket = {
    async get(key) { assert.equal(key, SITE_CONTENT_KEY); reads++; return object ? { etag: object.etag, size: new TextEncoder().encode(object.text).byteLength, body: new Blob([object.text]).stream() } : null; },
    async put(key, text, options) { assert.equal(key, SITE_CONTENT_KEY); assert.equal(options.httpMetadata.contentType, "application/json"); const condition = options.onlyIf; if (condition.get("if-none-match") === "*" && object || condition.has("if-match") && condition.get("if-match") !== `"${object?.etag}"`) return null; const etag = String(++writes).padStart(32, "0"); object = { text, etag }; return { etag }; },
  };
  globals[contextKey] = { env: { UPLOADS: bucket } };
  const cookie = `${ADMIN_COOKIE}=${(await createAdminSession()).token}`;
  const req = (method: string, body?: string, auth = cookie, origin = "https://example.com") => new Request("https://example.com/api/admin/site-content", { method, headers: { cookie: auth, origin, "content-type": "application/json" }, body });
  for (const method of ["GET", "PUT"]) {
    const request = req(method, method === "PUT" ? "not JSON" : undefined, "");
    assert.equal((await (method === "GET" ? GET(request) : PUT(request))).status, 401);
    assert.equal(request.bodyUsed, false);
    assert.equal((await (method === "GET" ? GET(req(method, undefined, cookie, "https://evil.example")) : PUT(req(method, "not JSON", cookie, "https://evil.example")))).status, 403);
  }
  assert.equal(reads, 0); assert.equal(writes, 0);
  const initial = await GET(req("GET")); assert.equal(initial.headers.get("cache-control"), "private, no-store"); assert.equal((await initial.json()).revision, null);
  const first = await PUT(req("PUT", JSON.stringify({ revision: null, overrides: { "i18n.en.about.title": "A new public heading" } })));
  assert.equal(first.status, 200); const revision = (await first.json()).revision;
  const staleCreate = await PUT(req("PUT", JSON.stringify({ revision: null, overrides: {} }))); assert.equal(staleCreate.status, 409);
  const update = await PUT(req("PUT", JSON.stringify({ revision, overrides: { "section.about.skills": false } }))); assert.equal(update.status, 200);
  const staleUpdate = await PUT(req("PUT", JSON.stringify({ revision, overrides: {} }))); assert.equal(staleUpdate.status, 409);
  const published = await readSiteContent(bucket); assert.deepEqual(published.overrides, { "section.about.skills": false }); assert.equal(writes, 2);
  assert.equal((await PUT(req("PUT", JSON.stringify({ revision: published.revision, overrides: { "unlisted": "no" } })))).status, 400);
  assert.equal((await PUT(req("PUT", 'x'.repeat(CONTENT_MAX_BYTES + 1)))).status, 413);
  assert.equal(writes, 2);
});

test("bounded public content reads cancel oversized streams and reject malformed stored documents", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(CONTENT_MAX_BYTES + 1)); }, cancel() { cancelled = true; } });
  await assert.rejects(() => boundedJSON(stream), /too large/); assert.equal(cancelled, true);
  await assert.rejects(() => readSiteContent({ async get() { return { etag: "0".repeat(32), size: 50, body: new Blob(['{"version":2,"overrides":{}}']).stream() }; }, async put() { throw new Error("No write expected"); } }), /Unsupported/);
  let storedCancelled = false;
  await assert.rejects(() => readSiteContent({ async get() { return { etag: "0".repeat(32), size: CONTENT_MAX_BYTES + 1, body: new ReadableStream({ cancel() { storedCancelled = true; } }) }; }, async put() { throw new Error("No write expected"); } }), /too large/);
  assert.equal(storedCancelled, true);
});

test("editable text remains data in structured metadata and actual public controls", () => {
  const hostile = '</script><script>alert("not executable")</script>';
  const structured = serializeSiteStructuredData({ name: hostile });
  assert.equal(structured.includes("<"), false);
  assert.deepEqual(JSON.parse(structured), { name: hostile });
  const overrides = validateContentOverrides({ "i18n.en.projects.commentName": "Public display name", "en.projects.searchLabel": "Find my work", "en.category.web": "Web applications" });
  const content = createSiteContent(overrides);
  assert.equal(content.categoryLabel("en", "web"), "Web applications");
  assert.equal(content.categoryLabel("sl", "web"), "Splet");
  assert.equal(content.hasPriceOverride("en", "web"), false);
  assert.equal(createSiteContent({ "en.price.web": "" }).hasPriceOverride("en", "web"), true);
  const comments = renderToStaticMarkup(createElement(SiteContentProvider, { values: overrides }, createElement(CommentSection, { slug: "public-test", initialComments: [], lang: "en" })));
  assert.match(comments, /aria-label="Public display name"/);
  const projects = renderToStaticMarkup(createElement(SiteContentProvider, { values: overrides }, createElement(ProjectsClient, { projects: [], lang: "en" })));
  assert.match(projects, /Find my work/);
  assert.match(projects, /Web applications/);
  const hiddenComments = renderToStaticMarkup(createElement(SiteContentProvider, { values: { "section.projects.comments": false } }, createElement(CommentSection, { slug: "public-test", initialComments: [], lang: "en" })));
  assert.equal(hiddenComments, "");
});
