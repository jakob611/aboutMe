import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { createAdminSession, ADMIN_COOKIE } from "../src/lib/admin-auth";
import {
  BLOCKS_KEY, canonicalIp, captureSubmission, decryptPrivateRecord, encryptPrivateRecord,
  ipFingerprint, isSubmissionBlocked, readBlocks, readSubmission, setSubmissionBlock,
  storeSubmission, submissionKey,
} from "../src/lib/moderation-store";
import { getCachedComments } from "../src/lib/get-comments";
import { GET as listAdminComments } from "../src/app/api/admin/comments/route";
import { DELETE as removeComment, PATCH as restoreComment } from "../src/app/api/admin/comments/[id]/route";
import { GET as listBlocks, POST as changeBlock } from "../src/app/api/admin/moderation/route";
import { GET as listAdminMessages } from "../src/app/api/admin/messages/route";
import { GET as publicComments, POST as postComment } from "../src/app/api/projects/[slug]/comments/route";
import { POST as postContact } from "../src/app/api/contact/route";
import { GET as media } from "../src/app/api/media/[...key]/route";

const contextSymbol = Symbol.for("__cloudflare-context__");
const globals = globalThis as unknown as Record<symbol, unknown>;
const secret = "test-only-moderation-key-at-least32-characters";
// PostgreSQL timestamp-without-time-zone wire format; Drizzle applies UTC.
const publicDate = "2026-10-27 10:00:00";

class MemoryBucket {
  objects = new Map<string, { text: string; etag: string }>();
  reads = 0;
  writes = 0;
  conflicts = 0;
  failReads = false;
  failCacheWrites = false;
  async get(key: string) {
    this.reads++;
    if (this.failReads) throw new Error("Test storage outage");
    const object = this.objects.get(key);
    return object ? { body: new Blob([object.text]).stream(), size: new TextEncoder().encode(object.text).byteLength, etag: object.etag } : null;
  }
  async put(key: string, value: string | ArrayBuffer, options?: { onlyIf?: Headers }) {
    if (this.failCacheWrites && key.startsWith("private/comment-cache/")) throw new Error("Test cache outage");
    const current = this.objects.get(key);
    const condition = options?.onlyIf;
    if ((condition?.get("if-none-match") === "*" && current) ||
        (condition?.has("if-match") && condition.get("if-match") !== `"${current?.etag}"`)) {
      this.conflicts++;
      return null;
    }
    const etag = String(++this.writes).padStart(32, "0");
    this.objects.set(key, { text: typeof value === "string" ? value : new TextDecoder().decode(value), etag });
    return { etag };
  }
  async delete(key: string) { this.objects.delete(key); }
}

test("private moderation storage protects address/location data and concurrent blocks", async t => {
  const before = process.env.MODERATION_SECRET;
  process.env.MODERATION_SECRET = secret;
  t.after(() => { if (before === undefined) delete process.env.MODERATION_SECRET; else process.env.MODERATION_SECRET = before; });

  await t.test("canonical address identifiers are stable without retaining raw IPs", async () => {
    assert.equal(canonicalIp("not an address"), null);
    assert.equal(canonicalIp("2001:0db8:0:0:0:0:0:1"), "2001:db8::1");
    const id = await ipFingerprint("2001:db8::1");
    assert.equal(id, await ipFingerprint("2001:0db8:0:0:0:0:0:1"));
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.notEqual(id, await ipFingerprint("2001:db8::2"));
    assert.notEqual(id, await ipFingerprint("2001:db8::1", secret + "other"));
  });

  await t.test("encrypted records reject key swaps, ciphertext tampering and wrong secrets", async () => {
    const key = submissionKey("comment", 1);
    const value = { fingerprint: "a".repeat(64), country: "SI", region: "Region fixture", city: "City fixture" };
    const encoded = await encryptPrivateRecord(key, value);
    assert.equal(encoded.includes("City fixture"), false);
    assert.equal(encoded.includes(value.fingerprint), false);
    assert.deepEqual(await decryptPrivateRecord(key, JSON.parse(encoded)), value);
    await assert.rejects(decryptPrivateRecord(submissionKey("comment", 2), JSON.parse(encoded)));
    await assert.rejects(decryptPrivateRecord(key, JSON.parse(encoded), secret + "other"));
    const altered = JSON.parse(encoded);
    altered.ciphertext = (altered.ciphertext[0] === "A" ? "B" : "A") + altered.ciphertext.slice(1);
    await assert.rejects(decryptPrivateRecord(key, altered));
  });

  await t.test("only request context contributes approximate location; private metadata is optional on old records", async () => {
    const request = new Request("https://example.com/api/contact", { headers: {
      "cf-connecting-ip": "192.0.2.44", "x-forwarded-for": "203.0.113.9",
      "cf-ipcountry": "XX", "cf-ipcity": "Forged city",
    } });
    const captured = await captureSubmission(request, { country: "SI", region: "Region fixture", city: "City fixture" });
    assert.ok(captured);
    assert.equal(captured.fingerprint, await ipFingerprint("192.0.2.44"));
    assert.equal(captured.country, "SI"); assert.equal(captured.city, "City fixture");
    assert.equal(JSON.stringify(captured).includes("192.0.2.44"), false);
    assert.equal(JSON.stringify(captured).includes("203.0.113.9"), false);
    const unknown = await captureSubmission(new Request("https://example.com", { headers: { "x-forwarded-for": "192.0.2.44" } }), { country: "SI" });
    assert.equal(unknown, null);
    const bucket = new MemoryBucket();
    assert.equal(await readSubmission("message", 999, [], bucket), null);
    await storeSubmission("comment", 1, captured, bucket);
    const stored = bucket.objects.get(submissionKey("comment", 1))!.text;
    assert.equal(stored.includes("City fixture"), false);
    const loaded = await readSubmission("comment", 1, [], bucket);
    assert.equal(loaded?.city, "City fixture"); assert.equal(loaded?.blocked, false);
  });

  await t.test("simultaneous address blocks preserve both updates and unblock is reversible", async () => {
    const bucket = new MemoryBucket();
    const first = await ipFingerprint("192.0.2.1"), second = await ipFingerprint("192.0.2.2");
    await Promise.all([setSubmissionBlock(first, true, "First fixture", bucket), setSubmissionBlock(second, true, "Second fixture", bucket)]);
    assert.equal((await readBlocks(bucket)).blocks.length, 2);
    assert.ok(bucket.conflicts >= 1, "the competing conditional write must actually lose and retry");
    const envelope = bucket.objects.get(BLOCKS_KEY)!.text;
    assert.equal(envelope.includes(first), false);
    assert.equal(envelope.includes("First fixture"), false);
    const captured = await captureSubmission(new Request("https://example.com", { headers: { "cf-connecting-ip": "192.0.2.1" } }), {});
    assert.equal(await isSubmissionBlocked(captured, bucket), true);
    await setSubmissionBlock(first, false, "", bucket);
    assert.equal(await isSubmissionBlocked(captured, bucket), false);
    assert.deepEqual((await readBlocks(bucket)).blocks.map(block => block.fingerprint), [second]);
    bucket.failReads = true;
    await assert.rejects(isSubmissionBlocked(captured, bucket), /outage/);
  });

  await t.test("a full block registry rejects growth without discarding existing blocks", async () => {
    const bucket = new MemoryBucket();
    const blocks = Array.from({ length: 500 }, (_, index) => ({ fingerprint: index.toString(16).padStart(64, "0"), createdAt: "2026-10-27T10:00:00.000Z", reason: "Fixture" }));
    await bucket.put(BLOCKS_KEY, await encryptPrivateRecord(BLOCKS_KEY, { version: 1, blocks }));
    await assert.rejects(setSubmissionBlock("f".repeat(64), true, "New fixture", bucket), /full/);
    assert.equal((await readBlocks(bucket)).blocks.length, 500);
    await setSubmissionBlock(blocks[0].fingerprint, false, "", bucket);
    assert.equal((await setSubmissionBlock("f".repeat(64), true, "New fixture", bucket)).length, 500);
  });
});

test("moderation and protected submission routes enforce privacy and mutation ordering", async t => {
  const keys = ["UPLOAD_PASSWORD", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "MODERATION_SECRET", "TURNSTILE_SECRET", "TURNSTILE_HOSTNAMES", "DATABASE_URL"] as const;
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const oldContext = globals[contextSymbol], oldNeon = neonConfig.fetchFunction, oldFetch = globalThis.fetch;
  t.after(() => {
    for (const key of keys) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; }
    if (oldContext === undefined) delete globals[contextSymbol]; else globals[contextSymbol] = oldContext;
    neonConfig.fetchFunction = oldNeon; globalThis.fetch = oldFetch;
  });
  process.env.UPLOAD_PASSWORD = "test-only-admin";
  process.env.ADMIN_SESSION_SECRET = "independent-test-admin-signing-secret-at-least32";
  process.env.MODERATION_SECRET = secret;
  process.env.TURNSTILE_SECRET = "test-only-turnstile";
  process.env.TURNSTILE_HOSTNAMES = "example.com";
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  const bucket = new MemoryBucket();
  globals[contextSymbol] = { env: { UPLOADS: bucket }, cf: { country: "SI", region: "Region fixture", city: "City fixture" } };
  const cookie = `${ADMIN_COOKIE}=${(await createAdminSession()).token}`;
  const request = (path: string, method = "GET", body?: unknown, authenticated = false, origin = "https://example.com", ip = "192.0.2.10") => new NextRequest("https://example.com" + path, {
    method, headers: { origin, "content-type": "application/json", "cf-connecting-ip": ip, ...(authenticated ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const projectContext = { params: Promise.resolve({ slug: "fixture-project" }) };
  const commentContext = { params: Promise.resolve({ id: "1" }) };
  let verification = { success: true, hostname: "example.com", action: "comment" };
  let verifications = 0;
  globalThis.fetch = (async url => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    verifications++;
    return Response.json(verification);
  }) as typeof fetch;
  const queries: string[] = [];
  let approved = true, inserted = 0, contactInserted = false;
  const result = (names: string[], values: unknown[][], types?: number[]) => Response.json({
    fields: names.map((name, index) => ({ name, dataTypeID: types?.[index] || 25 })), rows: values, rowCount: values.length,
  });
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const { query, params } = JSON.parse(String(init.body)) as { query: string; params: unknown[] };
    queries.push(query);
    if (query.startsWith('update "comments"')) {
      assert.equal(query.startsWith('delete'), false);
      approved = params[0] === true || params[0] === "true" || params[0] === "t";
      return result(["id", "project_id"], [[1, 7]], [23, 23]);
    }
    if (query.startsWith('insert into "comments"')) {
      inserted++;
      assert.equal(query.split(" returning ")[1].includes('"email"'), false);
      return result(["id", "author", "content", "created_at"], [[1, "Fixture author", "Fixture content", publicDate]], [23, 25, 25, 25]);
    }
    if (query.startsWith('insert into "contact_messages"')) {
      contactInserted = true;
      return result(["id"], [[21]], [23]);
    }
    if (query.includes('from "contact_messages"')) {
      return result(["id", "name", "email", "subject", "message", "created_at"], contactInserted ? [[21, "Fixture sender", "private-sender@example.com", "Private fixture", "Private message", publicDate]] : [], [23, 25, 25, 25, 25, 25]);
    }
    if (query.includes('from "projects"')) return result(["id"], [[7]], [23]);
    if (query.includes('from "comments"')) {
      if (query.includes("inner join")) {
        assert.match(query, /limit \$\d+/);
        const requestedApproved = params[0] === true || params[0] === "true" || params[0] === "t";
        const filtered = !query.includes('"comments"."approved" =') || requestedApproved === approved;
        return result(["id", "project_id", "author", "email", "content", "approved", "created_at", "title_en", "slug"], filtered ? [[1, 7, "Fixture author", "private@example.com", "Fixture content", approved ? "t" : "f", publicDate, "Fixture project", "fixture-project"]] : [], [23, 23, 25, 25, 25, 16, 25, 25, 25]);
      }
      assert.match(query, /"approved" = \$\d+/);
      assert.equal(query.split(" from ")[0].includes('"email"'), false);
      return result(["id", "author", "content", "created_at"], approved ? [[1, "Fixture author", "Fixture content", publicDate]] : [], [23, 25, 25, 25]);
    }
    throw new Error(`Unexpected fixture SQL: ${query}`);
  };

  await t.test("private routes deny missing auth and cross-origin mutations before parsing or I/O", async () => {
    const reads = bucket.reads;
    for (const response of [
      await listAdminComments(request("/api/admin/comments")), await listBlocks(request("/api/admin/moderation")),
      await changeBlock(request("/api/admin/moderation", "POST", { malformed: true })),
      await removeComment(request("/api/admin/comments/1", "DELETE"), commentContext),
      await restoreComment(request("/api/admin/comments/1", "PATCH", { malformed: true }), commentContext),
    ]) { assert.equal(response.status, 401); assert.equal(response.headers.get("cache-control"), "private, no-store"); }
    assert.equal((await changeBlock(request("/api/admin/moderation", "POST", {}, true, "https://evil.test"))).status, 403);
    assert.equal((await removeComment(request("/api/admin/comments/1", "DELETE", undefined, true, "https://evil.test"), commentContext)).status, 403);
    assert.equal(bucket.reads, reads); assert.equal(queries.length, 0);
  });

  await t.test("authenticated pagination and mutation input bounds reject before storage or database work", async () => {
    const reads = bucket.reads, writes = bucket.writes;
    for (const path of ["/api/admin/comments?page=0", "/api/admin/comments?page=100001", "/api/admin/comments?status=unknown"]) {
      assert.equal((await listAdminComments(request(path, "GET", undefined, true))).status, 400);
    }
    for (const path of ["/api/admin/messages?page=0", "/api/admin/messages?page=100001"]) {
      assert.equal((await listAdminMessages(request(path, "GET", undefined, true))).status, 400);
    }
    assert.equal((await removeComment(request("/api/admin/comments/nope", "DELETE", undefined, true), { params: Promise.resolve({ id: "nope" }) })).status, 400);
    assert.equal((await restoreComment(request("/api/admin/comments/1", "PATCH", { approved: true, extra: "x".repeat(2048) }, true), commentContext)).status, 400);
    assert.equal((await changeBlock(request("/api/admin/moderation", "POST", { fingerprint: "bad", blocked: true }, true))).status, 400);
    assert.equal((await changeBlock(request("/api/admin/moderation", "POST", { fingerprint: "a".repeat(64), blocked: true, extra: true }, true))).status, 400);
    assert.equal(bucket.reads, reads); assert.equal(bucket.writes, writes); assert.equal(queries.length, 0);
  });

  await t.test("missing, invalid and wrong-action tokens never query Neon or the block store", async () => {
    const reads = bucket.reads;
    const comment = { author: "Fixture author", content: "Fixture content" };
    assert.equal((await postComment(request("/api/projects/fixture-project/comments", "POST", comment), projectContext)).status, 403);
    assert.equal(verifications, 0);
    for (const response of [{ success: false, hostname: "example.com", action: "comment" }, { success: true, hostname: "example.com", action: "contact" }]) {
      verification = response;
      assert.equal((await postComment(request("/api/projects/fixture-project/comments", "POST", { ...comment, "cf-turnstile-response": "fixture-token" }), projectContext)).status, 403);
    }
    verification = { success: true, hostname: "example.com", action: "comment" };
    assert.equal((await postContact(request("/api/contact", "POST", { name: "Fixture", email: "fixture@example.com", message: "Fixture", "cf-turnstile-response": "fixture-token" }))).status, 403);
    assert.equal(bucket.reads, reads); assert.equal(queries.length, 0);
  });

  await t.test("a valid token from a blocked address is denied on both submission paths before Neon", async () => {
    const fingerprint = await ipFingerprint("192.0.2.10");
    const blocked = await changeBlock(request("/api/admin/moderation", "POST", { fingerprint, blocked: true }, true));
    assert.equal(blocked.status, 200);
    verification = { success: true, hostname: "example.com", action: "comment" };
    assert.equal((await postComment(request("/api/projects/fixture-project/comments", "POST", { author: "Fixture", content: "Fixture", "cf-turnstile-response": "fixture-token" }), projectContext)).status, 403);
    verification = { success: true, hostname: "example.com", action: "contact" };
    assert.equal((await postContact(request("/api/contact", "POST", { name: "Fixture", email: "fixture@example.com", message: "Fixture", "cf-turnstile-response": "fixture-token" }))).status, 403);
    assert.equal(queries.length, 0);
    const unblocked = await changeBlock(request("/api/admin/moderation", "POST", { fingerprint, blocked: false }, true));
    assert.equal(unblocked.status, 200);
    assert.deepEqual((await unblocked.json()).blocks, []);
  });

  await t.test("an unavailable block registry fails closed before either handler queries Neon", async () => {
    const before = queries.length;
    bucket.failReads = true;
    verification = { success: true, hostname: "example.com", action: "comment" };
    assert.equal((await postComment(request("/api/projects/fixture-project/comments", "POST", { author: "Fixture", content: "Fixture", "cf-turnstile-response": "fixture-token" }), projectContext)).status, 503);
    verification = { success: true, hostname: "example.com", action: "contact" };
    assert.equal((await postContact(request("/api/contact", "POST", { name: "Fixture", email: "fixture@example.com", message: "Fixture", "cf-turnstile-response": "fixture-token" }))).status, 503);
    bucket.failReads = false;
    assert.equal(queries.length, before);
  });

  await t.test("new inbox messages attach encrypted sender metadata only to authenticated reads", async () => {
    verification = { success: true, hostname: "example.com", action: "contact" };
    const posted = await postContact(request("/api/contact", "POST", { name: "Fixture sender", email: "private-sender@example.com", subject: "Private fixture", message: "Private message", "cf-turnstile-response": "fixture-token" }));
    assert.equal(posted.status, 200);
    assert.deepEqual(await posted.json(), { ok: true, delivery: "inbox" });
    const stored = bucket.objects.get(submissionKey("message", 21))!.text;
    assert.equal(stored.includes("City fixture"), false);
    assert.equal(stored.includes("192.0.2.10"), false);
    assert.equal((await listAdminMessages(request("/api/admin/messages"))).status, 401);
    const read = await listAdminMessages(request("/api/admin/messages", "GET", undefined, true));
    assert.equal(read.status, 200); assert.equal(read.headers.get("cache-control"), "private, no-store");
    const row = (await read.json()).messages[0];
    assert.equal(row.moderation.city, "City fixture"); assert.equal(row.moderation.fingerprint, await ipFingerprint("192.0.2.10"));
  });

  await t.test("accepted comments store private metadata but public responses/cache contain only public fields", async () => {
    verification = { success: true, hostname: "example.com", action: "comment" };
    const response = await postComment(request("/api/projects/fixture-project/comments", "POST", { author: "Fixture author", email: "private@example.com", content: "Fixture content", "cf-turnstile-response": "fixture-token" }), projectContext);
    assert.equal(response.status, 200);
    const body = await response.json(); assert.equal(body.ok, true); assert.equal(body.cacheRefreshed, true);
    assert.deepEqual(Object.keys(body.comment).sort(), ["author", "content", "createdAt", "id"]);
    assert.equal(JSON.stringify(body).includes("private@example.com"), false);
    assert.ok(bucket.objects.has(submissionKey("comment", 1)));
    const read = await publicComments(request("/api/projects/fixture-project/comments"), projectContext);
    assert.equal(read.status, 200);
    assert.equal(JSON.stringify(await read.json()).includes("fingerprint"), false);
    const cache = [...bucket.objects.entries()].find(([key]) => key.startsWith("private/comment-cache/"))![1].text;
    assert.equal(cache.includes("email"), false); assert.equal(cache.includes("fingerprint"), false); assert.equal(cache.includes("City fixture"), false);
    const admin = await listAdminComments(request("/api/admin/comments", "GET", undefined, true));
    assert.equal(admin.status, 200); assert.equal(admin.headers.get("cache-control"), "private, no-store");
    const row = (await admin.json()).comments[0];
    assert.equal(row.email, "private@example.com"); assert.equal(row.moderation.city, "City fixture");
  });

  await t.test("remove/restore is recoverable through Drizzle and invalidates the persistent public reader", async () => {
    assert.equal((await getCachedComments(7)).length, 1);
    const removed = await removeComment(request("/api/admin/comments/1", "DELETE", undefined, true), commentContext);
    assert.equal(removed.status, 200); assert.equal(approved, false);
    assert.deepEqual(await getCachedComments(7), []);
    const removedView = await listAdminComments(request("/api/admin/comments?status=removed", "GET", undefined, true));
    assert.equal((await removedView.json()).comments[0].approved, false);
    const restored = await restoreComment(request("/api/admin/comments/1", "PATCH", { approved: true }, true), commentContext);
    assert.equal(restored.status, 200); assert.equal(approved, true);
    assert.equal((await getCachedComments(7)).length, 1);
    assert.equal(queries.some(query => query.startsWith('delete from "comments"')), false);
  });

  await t.test("post-commit cache failures distinguish accepted posts from persisted moderation retries", async () => {
    bucket.failCacheWrites = true;
    const removed = await removeComment(request("/api/admin/comments/1", "DELETE", undefined, true), commentContext);
    assert.equal(removed.status, 503); assert.equal((await removed.json()).persisted, true); assert.equal(approved, false);
    const before = inserted;
    const posted = await postComment(request("/api/projects/fixture-project/comments", "POST", { author: "Fixture author", content: "Fixture content", "cf-turnstile-response": "fixture-token" }), projectContext);
    assert.equal(posted.status, 200);
    const accepted = await posted.json(); assert.equal(accepted.ok, true); assert.equal(accepted.cacheRefreshed, false);
    assert.equal(inserted, before + 1, "an accepted write must not be reported as an unsuccessful retryable post");
    bucket.failCacheWrites = false;
    assert.equal((await restoreComment(request("/api/admin/comments/1", "PATCH", { approved: true }, true), commentContext)).status, 200);
  });

  await t.test("private R2 keys cannot be read through public media, even by a signed-in admin", async () => {
    const reads = bucket.reads;
    for (const key of [BLOCKS_KEY, submissionKey("comment", 1), "private/comment-cache/v1/7.json"]) {
      assert.equal((await media(request("/api/media/" + key, "GET", undefined, true), { params: Promise.resolve({ key: key.split("/") }) })).status, 404);
    }
    assert.equal(bucket.reads, reads);
  });
});
