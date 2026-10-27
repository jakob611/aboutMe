import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeProjectMedia, moveProjectImage, projectGalleryForUpdate, projectSourceVisibility, serializePublicProject } from "../src/lib/project-media";
import { normalizeProjectLink, projectInputSchema, projectFieldErrors, readProjectJson, toProjectRow } from "../src/lib/project-input";
import { clearProjectDraft, emptyProjectForm, PROJECT_DRAFT_KEY, readProjectDraft, saveProjectDraft, updateProjectForm } from "../src/lib/project-editor";

const input = { slug: "upp", titleEn: "Upp", titleSl: "Upp", summaryEn: "Real project notes", summarySl: "Opis projekta", descriptionEn: "Details", descriptionSl: "Podrobnosti", category: "web" };
const media = { version: 2 as const, images: [{ url: "/gallery/first.png", captionEn: "First image", captionSl: "Prva slika" }, { url: "/gallery/second.png", captionEn: "Second image", captionSl: "Druga slika" }], coverCaptionEn: "Cover", coverCaptionSl: "Naslovna slika", sourceVisibility: "closed" as const };

test("legacy gallery order and captions survive versioned edits without implying closed source", () => {
  const legacy = ["/gallery/second.png", "/gallery/first.png"];
  assert.deepEqual(normalizeProjectMedia(legacy).images.map(image => image.url), legacy);
  assert.equal(projectSourceVisibility(legacy, null), "unspecified");
  assert.equal(projectSourceVisibility(legacy, "https://github.com/example/project"), "public");
  const reordered = moveProjectImage(media.images, 0, 1);
  assert.deepEqual(reordered.map(image => image.captionEn), ["Second image", "First image"]);
  assert.equal(media.images[0].captionEn, "First image");
  assert.equal(moveProjectImage(media.images, -1, 0), media.images);
  const olderClientEdit = projectGalleryForUpdate(["/gallery/second.png", "/gallery/first.png"], media);
  assert.deepEqual(olderClientEdit, { ...media, images: reordered });
  assert.deepEqual(projectGalleryForUpdate(undefined, media), media);
});

test("public DTOs retain legacy gallery URLs and captions, redact private repo URLs, and are idempotent", () => {
  const raw = { id: 42, gallery: media, repoUrl: "https://private.example.com/real-repository" };
  const dto = serializePublicProject(raw);
  assert.equal(dto.sourceVisibility, "closed");
  assert.equal(dto.repoUrl, null);
  assert.deepEqual(dto.gallery, media.images.map(image => image.url));
  assert.deepEqual(dto.galleryImages, media.images);
  assert.equal(dto.coverCaptionSl, "Naslovna slika");
  assert.equal(JSON.stringify(dto).includes("private.example.com"), false);
  assert.equal(raw.repoUrl, "https://private.example.com/real-repository");
  assert.deepEqual(serializePublicProject(dto), dto);
  const legacy = serializePublicProject({ gallery: ["/gallery/first.png"], repoUrl: null });
  assert.deepEqual(serializePublicProject(legacy), legacy);
});

test("bare glowupp.org is normalized while executable, credentialed and malformed links get field issues", () => {
  assert.equal(normalizeProjectLink(" glowupp.org "), "https://glowupp.org/");
  assert.equal(normalizeProjectLink("www.glowupp.org/project?q=1#notes"), "https://www.glowupp.org/project?q=1#notes");
  assert.equal(normalizeProjectLink("http://glowupp.org"), "http://glowupp.org/");
  const row = toProjectRow(projectInputSchema.parse({ ...input, linkUrl: "glowupp.org", gallery: media }));
  assert.equal(row.linkUrl, "https://glowupp.org/");
  assert.deepEqual(row.gallery, media);
  for (const linkUrl of ["javascript:alert(1)", "data:text/html,test", "https://user:password@example.com", "example", "//example.com", "https://", "example.com\\evil", "bad domain.org"]) {
    assert.equal(normalizeProjectLink(linkUrl), null, linkUrl);
    const result = projectInputSchema.safeParse({ ...input, linkUrl });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(projectFieldErrors(result.error.issues).linkUrl);
  }
  const invalidCaption = projectInputSchema.safeParse({ ...input, gallery: { ...media, images: [{ ...media.images[0], captionSl: "x".repeat(241) }] } });
  assert.equal(invalidCaption.success, false);
  if (!invalidCaption.success) assert.ok(projectFieldErrors(invalidCaption.error.issues)["gallery.images.0.captionSl"]);
  const normalizedTooLong = projectInputSchema.safeParse({ ...input, linkUrl: `example.com/${"x".repeat(488)}` });
  assert.equal(normalizedTooLong.success, false, "adding https:// must not overflow the database URL column");
  if (!normalizedTooLong.success) assert.ok(projectFieldErrors(normalizedTooLong.error.issues).linkUrl);
});

test("project JSON parser rejects malformed and oversized streamed input before parsing", async () => {
  assert.deepEqual(await readProjectJson(new Request("https://example.com", { method: "POST", body: "{" })), { ok: false, status: 400 });
  assert.deepEqual(await readProjectJson(new Request("https://example.com", { method: "POST", body: "x".repeat(1024 * 1024 + 1) })), { ok: false, status: 413 });
  assert.deepEqual(await readProjectJson(new Request("https://example.com", { method: "POST", body: JSON.stringify({ linkUrl: "glowupp.org" }) })), { ok: true, value: { linkUrl: "glowupp.org" } });
});

test("one-tab project draft recovery preserves invalid unsaved fields but expires and clears explicitly", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const draft = { projectId: "new" as const, savedAt: 1000, form: { ...emptyProjectForm(), linkUrl: "glowupp.org", gallery: media } };
  assert.equal(saveProjectDraft(storage, draft), true);
  assert.deepEqual(readProjectDraft(storage, 1001), draft);
  clearProjectDraft(storage); assert.equal(readProjectDraft(storage, 1002), null);
  saveProjectDraft(storage, draft);
  assert.equal(readProjectDraft(storage, 1000 + 2 * 60 * 60 * 1000 + 1), null);
  assert.equal(values.has(PROJECT_DRAFT_KEY), false);
  const denied = { getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); }, removeItem() { throw Error("denied"); } };
  assert.equal(saveProjectDraft(denied, draft), false);
  assert.equal(readProjectDraft(denied), null);
});

test("new-title slug suggestions do not overwrite an owner's custom slug", () => {
  const titled = updateProjectForm(emptyProjectForm(), "titleEn", "A new project", true);
  assert.equal(titled.slug, "a-new-project");
  assert.equal(updateProjectForm(titled, "titleEn", "Another title", true).slug, "another-title");
  const custom = updateProjectForm(titled, "slug", "chosen-link", true);
  assert.equal(updateProjectForm(custom, "titleEn", "Another title", true).slug, "chosen-link");
  assert.equal(updateProjectForm(titled, "titleEn", "Existing project renamed", false).slug, "a-new-project");
});
