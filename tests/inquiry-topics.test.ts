import assert from "node:assert/strict";
import { test } from "node:test";
import { inquiryFromQuery, inquirySubject, serviceInquiryHref, validInquiry } from "../src/lib/inquiry-topics";
import { contactDelivery, parseContactPayload, readContactJson, submitContact } from "../src/lib/contact-delivery";

test("categories constrain topics and Other requires meaningful custom text", () => {
  assert.equal(validInquiry({ category: "web", topic: "android", customSubject: "" }), false);
  assert.equal(validInquiry({ category: "web", topic: "maintenance", customSubject: "" }), true);
  assert.equal(validInquiry({ category: "other", topic: "", customSubject: " " }), false);
  assert.equal(validInquiry({ category: "3d", topic: "other", customSubject: "A custom object" }), true);
  assert.equal(validInquiry({ category: "apps", topic: "other", customSubject: "" }), false);
});

test("typed service links and legacy subjects open usable enquiries", () => {
  for (const id of ["android", "web", "automation", "printing"] as const) {
    const url = new URL(serviceInquiryHref(id), "https://example.com");
    assert.equal(validInquiry(inquiryFromQuery(Object.fromEntries(url.searchParams))), true);
  }
  for (const id of ["android", "web", "automation"] as const) {
    const url = new URL(serviceInquiryHref(id, true), "https://example.com");
    const inquiry = inquiryFromQuery(Object.fromEntries(url.searchParams));
    assert.equal(validInquiry(inquiry), true);
    assert.equal(inquiry.topic, "maintenance");
  }
  assert.deepEqual(inquiryFromQuery({ subject: "Spletni razvoj" }), { category: "web", topic: "development", customSubject: "" });
  assert.deepEqual(inquiryFromQuery({ subject: "A specific request" }), { category: "other", topic: "", customSubject: "A specific request" });
  assert.deepEqual(inquiryFromQuery({ subject: "Help with my web shop" }), { category: "other", topic: "", customSubject: "Help with my web shop" });
  assert.equal(inquiryFromQuery({ category: "web", topic: "android" }).topic, "");
  assert.deepEqual(inquiryFromQuery({ category: ["web"], subject: ["ignored"] }), { category: "", topic: "", customSubject: "" });
  assert.match(inquirySubject({ category: "web", topic: "maintenance", customSubject: "" }, "sl"), /Vzdrževanje/);
});

const payload = { name: "Visitor", email: "visitor@example.com", subject: "Hello", message: "An enquiry" };
test("payload parser rejects wrong types, oversized input, invalid hierarchy and header injection", () => {
  assert.deepEqual(parseContactPayload(payload), payload);
  for (const bad of [null, [], { ...payload, name: 123 }, { ...payload, message: "x".repeat(10001) }, { ...payload, email: "bad" }, { ...payload, subject: "Hello\r\nBcc: someone@example.com" }, { ...payload, category: "web", topic: "android" }, { ...payload, category: "other", customSubject: " " }]) {
    assert.equal(parseContactPayload(bad), null);
  }
  assert.match(parseContactPayload({ ...payload, category: "web", topic: "maintenance" })!.subject, /Maintenance/);
});

test("delivery configuration chooses exactly one path and sends Web3Forms from browser directly", async () => {
  assert.deepEqual(contactDelivery(undefined, false), { mode: "unavailable" });
  assert.deepEqual(contactDelivery(" ", true), { mode: "inbox" });
  const delivery = contactDelivery("public-owner-key", true);
  const calls: { url: string; data: Record<string, unknown> }[] = [];
  const request = (async (url, init) => {
    calls.push({ url: String(url), data: JSON.parse(String(init?.body)) });
    return Response.json({ success: true });
  }) as typeof fetch;
  assert.equal(await submitContact(delivery, payload, request), "ok");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.web3forms.com/submit");
  assert.equal(calls[0].data.access_key, "public-owner-key");
  assert.equal(calls[0].data.botcheck, false);
  calls.length = 0;
  assert.equal(await submitContact({ mode: "unavailable" }, payload, request), "unavailable");
  assert.equal(calls.length, 0);
});

test("provider rejection, quota, malformed responses and network failure cannot acknowledge delivery or fall back to a duplicate", async () => {
  for (const [response, expected] of [[Response.json({ success: false }), "err"], [Response.json({ success: true }, { status: 400 }), "err"], [new Response("bad JSON"), "err"], [Response.json({ success: false }, { status: 429 }), "limit"]] as const) {
    let calls = 0;
    const request = (async () => { calls++; return response; }) as typeof fetch;
    assert.equal(await submitContact({ mode: "email", accessKey: "public-key" }, payload, request), expected);
    assert.equal(calls, 1);
    assert.equal(payload.message, "An enquiry");
  }
  const request = (async () => { throw new Error("offline"); }) as typeof fetch;
  assert.equal(await submitContact({ mode: "email", accessKey: "public-key" }, payload, request), "err");
});

test("inbox accepts only an explicit success response", async () => {
  const calls: string[] = [];
  const request = (async (url) => { calls.push(String(url)); return Response.json({ ok: true, delivery: "inbox" }); }) as typeof fetch;
  assert.equal(await submitContact({ mode: "inbox" }, payload, request), "ok");
  assert.deepEqual(calls, ["/api/contact"]);
  assert.equal(await submitContact({ mode: "inbox" }, payload, (async () => Response.json({})) as typeof fetch), "err");
});

test("request JSON is bounded by bytes and malformed input fails without exposing parser errors", async () => {
  assert.deepEqual(await readContactJson(new Request("https://example.com", { method: "POST", body: JSON.stringify(payload) })), { ok: true, value: payload });
  assert.deepEqual(await readContactJson(new Request("https://example.com", { method: "POST", body: "{" })), { ok: false, status: 400 });
  assert.deepEqual(await readContactJson(new Request("https://example.com", { method: "POST", body: "ž".repeat(26000) })), { ok: false, status: 413 });
  assert.deepEqual(await readContactJson(new Request("https://example.com", { method: "POST", headers: { "content-length": "50001" }, body: "{}" })), { ok: false, status: 413 });
});
