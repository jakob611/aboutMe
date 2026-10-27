import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTENT_MAX_BYTES, contentFields } from "../src/lib/site-content";
import { clearSiteContentDraft, readSiteContentDraft, saveSiteContentDraft, SITE_CONTENT_DRAFT_KEY, SITE_CONTENT_DRAFT_TTL, type SiteContentDraft } from "../src/lib/site-content-draft";

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
const base: SiteContentDraft = { version: 1, savedAt: 1000, baseRevision: "a".repeat(32), overrides: { "en.home.titleLine1": "Draft title", "profile.github": "https://", "i18n.en.about.title": "", "section.about.skills": false } };

test("CMS draft recovers incomplete public edits and keeps its original CAS revision", () => {
  const tab = storage();
  assert.equal(saveSiteContentDraft(tab, base), true);
  assert.deepEqual(readSiteContentDraft(tab, 1001), base);
  // Persistence never re-bases edits onto a later published version.
  assert.equal(readSiteContentDraft(tab, 1001)?.baseRevision, "a".repeat(32));
  const separateTab = storage();
  assert.equal(readSiteContentDraft(separateTab, 1001), null);
  clearSiteContentDraft(tab);
  assert.equal(readSiteContentDraft(tab, 1001), null);
});

test("CMS recovery drops expired, future, oversized and non-public storage data", () => {
  const tab = storage();
  for (const value of [
    { ...base, savedAt: 1002 },
    { ...base, savedAt: 1001 - SITE_CONTENT_DRAFT_TTL - 1 },
    { ...base, baseRevision: "invalid" },
    { ...base, secret: "unexpected" },
    { ...base, overrides: { UPLOAD_PASSWORD: "not public" } },
    { ...base, overrides: JSON.parse('{"__proto__":{"admin":true}}') },
    { ...base, overrides: { "section.about.skills": "false" } },
    { ...base, overrides: { "en.home.titleLine1": "x".repeat(6001) } },
  ]) {
    tab.setItem(SITE_CONTENT_DRAFT_KEY, JSON.stringify(value));
    assert.equal(readSiteContentDraft(tab, 1001), null);
    assert.equal(tab.getItem(SITE_CONTENT_DRAFT_KEY), null);
  }
  tab.setItem(SITE_CONTENT_DRAFT_KEY, "x".repeat(CONTENT_MAX_BYTES + 1));
  assert.equal(readSiteContentDraft(tab, 1001), null);
  assert.equal(saveSiteContentDraft(tab, { ...base, overrides: { ADMIN_SESSION_SECRET: "not public" } }), false);
  const multibyte = { ...base, overrides: Object.fromEntries(contentFields.filter(field => field.type === "text" && field.maxLength === 6000).slice(0, 30).map(field => [field.key, "€".repeat(4000)])) };
  const raw = JSON.stringify(multibyte);
  assert.ok(raw.length < CONTENT_MAX_BYTES);
  assert.ok(new TextEncoder().encode(raw).byteLength > CONTENT_MAX_BYTES);
  assert.equal(saveSiteContentDraft(tab, multibyte), false);
  tab.setItem(SITE_CONTENT_DRAFT_KEY, raw);
  assert.equal(readSiteContentDraft(tab, 1001), null);
  const disabled = { getItem() { throw new Error("disabled"); }, setItem() { throw new Error("disabled"); }, removeItem() { throw new Error("disabled"); } };
  assert.equal(saveSiteContentDraft(disabled, base), false);
  assert.equal(readSiteContentDraft(disabled, 1001), null);
  assert.doesNotThrow(() => clearSiteContentDraft(disabled));
});
