import { getUploads } from "./storage";
import { siteConfig } from "./site";
import { CONTENT_MAX_BYTES, createSiteContent, migrateRetiredContentFields, validateContentOverrides, type ContentValues } from "./site-content";

export const SITE_CONTENT_KEY = "site/content.v1.json";
type ObjectBody = { body: ReadableStream<Uint8Array>; size: number; etag: string };
export interface ContentBucket {
  get(key: string): Promise<ObjectBody | null>;
  put(key: string, value: string, options: { onlyIf: Headers; httpMetadata: { contentType: string; cacheControl: string } }): Promise<{ etag: string } | null>;
}
export async function boundedJSON(body: ReadableStream<Uint8Array> | null, limit = CONTENT_MAX_BYTES): Promise<unknown> {
  if (!body) throw new Error("Missing JSON body.");
  const reader = body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("Content is too large."); } parts.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export async function readSiteContent(bucket: ContentBucket) {
  const object = await bucket.get(SITE_CONTENT_KEY);
  if (!object) return { overrides: {} as ContentValues, revision: null as string | null };
  if (object.size > CONTENT_MAX_BYTES) { await object.body.cancel(); throw new Error("Stored content is too large."); }
  const parsed = await boundedJSON(object.body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some(key => key !== "version" && key !== "overrides") || (parsed as { version?: unknown }).version !== 1) throw new Error("Unsupported site content document.");
  const saved = (parsed as { overrides?: unknown }).overrides;
  // Removing a UI field must not invalidate the owner's other saved wording.
  // Only these explicitly retired keys migrate; all other unknown keys still fail.
  return { overrides: validateContentOverrides(migrateRetiredContentFields(saved)), revision: object.etag };
}
export async function contentBucket() { return await getUploads() as unknown as ContentBucket; }
export function configuredDefaults(): ContentValues {
  return { "profile.name": siteConfig.name, "profile.tagline": siteConfig.tagline, "profile.email": siteConfig.email, "profile.github": siteConfig.socials.github, "profile.linkedin": siteConfig.socials.linkedin, "profile.instagram": siteConfig.socials.instagram, "profile.twitter": siteConfig.socials.twitter, "profile.buyMeACoffee": siteConfig.buyMeACoffee, "profile.koFi": siteConfig.koFi };
}
export async function adminContentSnapshot() { const snapshot = await readSiteContent(await contentBucket()); return { ...snapshot, values: createSiteContent({ ...configuredDefaults(), ...snapshot.overrides }).values, defaults: createSiteContent(configuredDefaults()).values }; }
