import assert from "node:assert/strict";
import { test } from "node:test";
import { contentChanges } from "../src/lib/content-changes";
import { defaultContentValues } from "../src/lib/site-content";

test("publish review includes both languages, shared visibility, and restoring defaults", () => {
  const published = { "en.home.titleLine1": "Published title", "sl.home.titleLine1": "Objavljen naslov", "section.home.playground": false };
  const draft = { "sl.home.titleLine1": "Nov naslov", "section.home.playground": true };
  const changes = contentChanges(published, draft, defaultContentValues);
  assert.equal(changes.length, 3);
  const restored = changes.find(change => change.key === "en.home.titleLine1")!;
  assert.equal(restored.before, "Published title");
  assert.equal(restored.after, defaultContentValues["en.home.titleLine1"]);
  assert.equal(restored.restoresDefault, true);
  assert.equal(changes.find(change => change.lang === "sl")?.after, "Nov naslov");
  assert.equal(changes.find(change => !change.lang)?.after, true);
  assert.deepEqual(contentChanges(draft, { ...draft }, defaultContentValues), []);
});
