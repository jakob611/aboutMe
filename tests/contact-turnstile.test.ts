import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { contactTurnstileHostname, verifyContactTurnstile } from "../src/lib/contact-turnstile";
import { POST as submitInbox } from "../src/app/api/contact/route";
import { neonConfig } from "@neondatabase/serverless";
import { parseContactPayload, submitContact, verifiedInboxDelivery } from "../src/lib/contact-delivery";

const request = new Request("https://jakobtominc.com/api/contact", {
  headers: { "cf-connecting-ip": "2001:db8::1", "x-forwarded-for": "192.0.2.99" },
});
const input = { request, token: "fresh-real-token-fixture", secret: "test-only-secret", hostnames: "jakobtominc.com,www.jakobtominc.com" };
const success = { success: true, action: "contact", hostname: "jakobtominc.com" };

test("contact verification rejects missing, oversized and misconfigured tokens before contacting Cloudflare", async () => {
  let calls = 0;
  const send = (async () => { calls++; return Response.json(success); }) as typeof fetch;
  for (const changes of [{ token: "" }, { token: " " }, { token: null }, { token: 123 }, { token: "x".repeat(2049) }, { secret: "" }, { hostnames: "" }, { hostnames: "other.example" }, { hostnames: "jakobtominc.com,localhost" }, { hostnames: "*.jakobtominc.com" }]) {
    assert.equal(await verifyContactTurnstile({ ...input, ...changes }, send), false);
  }
  assert.equal(calls, 0);
});

test("hostname binding is exact and local hostnames never enter a production allowlist", () => {
  assert.equal(contactTurnstileHostname(request.url, "jakobtominc.com"), "jakobtominc.com");
  assert.equal(contactTurnstileHostname(request.url, "jakobtominc.com,127.0.0.1"), null);
  assert.equal(contactTurnstileHostname("https://jakobtominc.com.evil.test/api/contact", "jakobtominc.com"), null);
  assert.equal(contactTurnstileHostname("http://localhost:8787/api/contact", "localhost,127.0.0.1"), "localhost");
  assert.equal(contactTurnstileHostname("http://127.0.0.1:8787/api/contact", "localhost,127.0.0.1"), "127.0.0.1");
  assert.equal(contactTurnstileHostname(request.url, "https://jakobtominc.com"), null);
});

test("the canonical contact call uses a bounded timeout, trusted Cloudflare IP and no token cache", async () => {
  let calls = 0;
  const send = (async (url, init) => {
    calls++;
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("content-type"), "application/x-www-form-urlencoded");
    assert.ok(init?.signal instanceof AbortSignal);
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get("secret"), input.secret);
    assert.equal(body.get("response"), input.token);
    assert.equal(body.get("remoteip"), "2001:db8::1");
    return Response.json(calls === 1 ? success : { success: false, "error-codes": ["timeout-or-duplicate"] });
  }) as typeof fetch;
  assert.equal(await verifyContactTurnstile(input, send), true);
  assert.equal(await verifyContactTurnstile(input, send), false);
  assert.equal(calls, 2);
});

test("provider rejection, wrong action/hostname, non-JSON and network failures all fail closed", async () => {
  for (const response of [Response.json({ ...success, success: "true" }), Response.json({ ...success, action: "login" }), Response.json({ ...success, hostname: "www.jakobtominc.com" }), Response.json(success, { status: 503 }), new Response("bad JSON"), Response.json(null), Response.json({ success: false })]) {
    assert.equal(await verifyContactTurnstile(input, (async () => response) as typeof fetch), false);
  }
  assert.equal(await verifyContactTurnstile(input, (async () => { throw new Error("offline"); }) as typeof fetch), false);
});

test("forwarded client IP is never substituted for the Cloudflare header", async () => {
  const send = (async (_url, init) => {
    assert.equal(new URLSearchParams(String(init?.body)).has("remoteip"), false);
    return Response.json(success);
  }) as typeof fetch;
  assert.equal(await verifyContactTurnstile({ ...input, request: new Request(request.url, { headers: { "x-forwarded-for": "192.0.2.99" } }) }, send), true);
});

test("verified inbox availability and response handling are explicit", async () => {
  assert.deepEqual(verifiedInboxDelivery(true, true), { mode: "inbox" });
  for (const [database, verification] of [[false, false], [true, false], [false, true]]) {
    assert.deepEqual(verifiedInboxDelivery(database, verification), { mode: "unavailable" });
  }
  const payload = { name: "Visitor", email: "visitor@example.com", subject: "Hello", message: "Message", "cf-turnstile-response": "single-use-token" };
  assert.equal(parseContactPayload({ ...payload, "cf-turnstile-response": "x".repeat(2049) }), null);
  assert.equal(parseContactPayload({ ...payload, "cf-turnstile-response": {} }), null);
  assert.equal(parseContactPayload(payload)?.["cf-turnstile-response"], payload["cf-turnstile-response"]);
  const send = (async (url, options) => {
    assert.equal(url, "/api/contact");
    assert.equal(JSON.parse(String(options?.body))["cf-turnstile-response"], payload["cf-turnstile-response"]);
    return Response.json({ error: "Verification failed" }, { status: 403 });
  }) as typeof fetch;
  assert.equal(await submitContact({ mode: "inbox" }, payload, send), "verification");
});

test("the existing inbox handler verifies every attempt before persisting a message", async t => {
  const keys = ["TURNSTILE_SECRET", "TURNSTILE_HOSTNAMES", "DATABASE_URL", "MODERATION_SECRET"] as const;
  const environment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const originalNeonFetch = neonConfig.fetchFunction;
  const symbol = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previousContext = globals[symbol];
  t.after(() => {
    for (const key of keys) {
      if (environment[key] === undefined) delete process.env[key]; else process.env[key] = environment[key];
    }
    globalThis.fetch = originalFetch;
    neonConfig.fetchFunction = originalNeonFetch;
    if (previousContext === undefined) delete globals[symbol]; else globals[symbol] = previousContext;
  });
  process.env.TURNSTILE_SECRET = "fixture-secret";
  process.env.TURNSTILE_HOSTNAMES = "jakobtominc.com";
  process.env.MODERATION_SECRET = "test-only-stable-moderation-secret-at-least32";
  globals[symbol] = { env: { UPLOADS: { async get() { return null; }, async put() { return { etag: "fixture" }; } } } };
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let verificationCalls = 0, inserts = 0;
  const consumed = new Set<string>();
  globalThis.fetch = (async (url, options) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    verificationCalls++;
    const token = new URLSearchParams(String(options?.body)).get("response")!;
    if (token === "offline") throw new Error("Fixture network failure");
    if (token === "wrong-host") return Response.json({ ...success, hostname: "www.jakobtominc.com" });
    if (token === "wrong-action") return Response.json({ ...success, action: "login" });
    if (consumed.has(token)) return Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
    consumed.add(token);
    return Response.json(success);
  }) as typeof fetch;
  neonConfig.fetchFunction = async (_url: string, options: RequestInit) => {
    const { query } = JSON.parse(String(options.body)) as { query: string };
    assert.match(query, /^insert into "contact_messages"/);
    inserts++;
    return Response.json({ fields: [{ name: "id", dataTypeID: 23 }], rows: [[1]], rowCount: 1 });
  };
  const payload = { name: "Visitor", email: "visitor@example.com", subject: "Hello", message: "A message" };
  const attempt = (token?: string, extra: Record<string, unknown> = {}) => submitInbox(new Request(request.url, {
    method: "POST", headers: { origin: "https://jakobtominc.com", "content-type": "application/json" },
    body: JSON.stringify({ ...payload, ...(token ? { "cf-turnstile-response": token } : {}), ...extra }),
  }));
  assert.equal((await attempt()).status, 403);
  assert.equal(verificationCalls, 0);
  assert.equal(inserts, 0);
  assert.equal((await attempt("one-use")).status, 200);
  assert.equal(inserts, 1);
  assert.equal((await attempt("one-use")).status, 403);
  for (const token of ["wrong-host", "wrong-action", "offline"]) assert.equal((await attempt(token)).status, 403);
  assert.equal(inserts, 1);
  assert.equal((await attempt("unused", { website: "bot.example" })).status, 400);
  assert.equal((await attempt("unused", { "cf-turnstile-response": "x".repeat(2049) })).status, 400);
  assert.equal(verificationCalls, 5);
  delete process.env.DATABASE_URL;
  assert.equal((await attempt("valid-without-database")).status, 503);
  assert.equal(inserts, 1);
  delete process.env.TURNSTILE_SECRET;
  assert.equal((await attempt("valid-without-secret")).status, 403);
  assert.equal(verificationCalls, 6);
});
