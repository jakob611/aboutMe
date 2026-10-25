import assert from "node:assert/strict";
import { test } from "node:test";
import { saveContactDraft, takeContactDraft } from "../src/lib/contact-draft";

function storage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
    entries,
  };
}

const draft = { name: "Test visitor", email: "test@example.com", subject: "Spletni razvoj", message: "Unsent\nmessage" };
const current = "https://example.com/contact?subject=Spletni+razvoj&lang=sl#message";
const switched = "https://example.com/contact?subject=Spletni+razvoj&lang=en#message";

test("language handoff preserves user text once for the same inquiry", () => {
  const tab = storage();
  saveContactDraft(tab, current, draft, 1000);
  assert.deepEqual(takeContactDraft(tab, switched, 1001), draft);
  assert.equal(tab.entries.size, 0);
  assert.equal(takeContactDraft(tab, switched, 1002), null);
});

test("handoff cannot restore unrelated, expired or future drafts", () => {
  for (const [href, now] of [["https://example.com/contact?subject=Other", 1001], [switched, 301001], [switched, 999]] as const) {
    const tab = storage();
    saveContactDraft(tab, current, draft, 1000);
    assert.equal(takeContactDraft(tab, href, now), null);
    assert.equal(tab.entries.size, 0);
  }
});

test("a tab without a handoff never receives another tab's draft", () => {
  const first = storage();
  const second = storage();
  saveContactDraft(first, current, draft);
  assert.equal(takeContactDraft(second, switched), null);
});

test("storage denial and malformed or oversized handoffs fail safely", () => {
  const denied = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
    removeItem() { throw new Error("denied"); },
  };
  assert.doesNotThrow(() => saveContactDraft(denied, current, draft));
  assert.equal(takeContactDraft(denied, switched), null);
  const tab = storage();
  saveContactDraft(tab, current, { ...draft, message: "x".repeat(10001) });
  assert.equal(tab.entries.size, 0);
  tab.setItem("contact-language-handoff", "{");
  assert.equal(takeContactDraft(tab, switched), null);
  assert.equal(tab.entries.size, 0);
});
