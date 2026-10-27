import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { publicCommentFields } from "./public-comments";
import { getUploads, type UploadBucket } from "./storage";

export const COMMENT_CACHE_SECONDS = 300;
export const PUBLIC_COMMENT_LIMIT = 200;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;
const KEY_PREFIX = "private/comment-cache/v1/";

export type PublicComment = { id: number; author: string; content: string; createdAt: string };
type CacheBucket = Pick<UploadBucket, "get" | "put">;
type CacheDocument = { version: 1; revision: string; generatedAt: number; comments: PublicComment[] | null };
type ReadOptions = {
  bucket: CacheBucket | null;
  load: () => Promise<unknown>;
  now?: () => number;
};

function cacheKey(projectId: number) {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new Error("Invalid project identifier.");
  return `${KEY_PREFIX}${projectId}.json`;
}

function publicRows(value: unknown, strictStoredFields = false): PublicComment[] {
  if (!Array.isArray(value) || value.length > PUBLIC_COMMENT_LIMIT) throw new Error("Invalid public comments.");
  return value.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid public comment.");
    if (strictStoredFields && Object.keys(row).some(key => !["id", "author", "content", "createdAt"].includes(key))) {
      throw new Error("Unexpected public comment field.");
    }
    if ("approved" in row && row.approved !== true) return null;
    const { id, author, content, createdAt } = row;
    const date = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
    if (!Number.isSafeInteger(id) || id <= 0 || typeof author !== "string" || author.length > 100 ||
        typeof content !== "string" || content.length > 2000 || typeof date !== "string" || !Number.isFinite(Date.parse(date))) {
      throw new Error("Invalid public comment.");
    }
    // Construct a new projection. Even a future broad loader cannot persist or
    // return a commenter's email, IP, location, approval flag or project ID.
    return { id, author, content, createdAt: new Date(date).toISOString() };
  }).filter((row): row is PublicComment => row !== null);
}

async function readDocument(object: NonNullable<Awaited<ReturnType<CacheBucket["get"]>>>) {
  if (object.size > MAX_CACHE_BYTES) { await object.body.cancel(); return null; }
  const reader = object.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0; let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CACHE_BYTES) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).some(key => !["version", "revision", "generatedAt", "comments"].includes(key))) return null;
    const document = value as Partial<CacheDocument>;
    if (document.version !== 1 || typeof document.revision !== "string" ||
        !/^[0-9a-f-]{36}$/.test(document.revision) || typeof document.generatedAt !== "number" ||
        !Number.isFinite(document.generatedAt) || document.generatedAt < 0) return null;
    return {
      version: 1, revision: document.revision, generatedAt: document.generatedAt,
      comments: document.comments === null ? null : publicRows(document.comments, true),
    };
  } finally {
    reader.releaseLock();
  }
}

/** Persistent public-data cache; dependency injection keeps race/expiry tests real. */
export async function readCachedComments(projectId: number, { bucket, load, now = Date.now }: ReadOptions): Promise<PublicComment[]> {
  const key = cacheKey(projectId);
  let previousEtag: string | null = null;
  let canWrite = Boolean(bucket);
  if (bucket) {
    try {
      const object = await bucket.get(key);
      if (object) {
        previousEtag = object.etag;
        const document = await readDocument(object);
        if (document?.comments && document.generatedAt <= now() && now() - document.generatedAt < COMMENT_CACHE_SECONDS * 1000) {
          return document.comments;
        }
      }
    } catch {
      // An unreadable object can be replaced only when its ETag was observed.
      // An R2 outage is a database fallback, never a write with an unknown epoch.
      canWrite = previousEtag !== null;
    }
  }
  const rows = publicRows(await load()); // Never cache a failed database read.
  if (bucket && canWrite) {
    const document: CacheDocument = { version: 1, revision: crypto.randomUUID(), generatedAt: now(), comments: rows };
    const value = JSON.stringify(document);
    if (new TextEncoder().encode(value).byteLength <= MAX_CACHE_BYTES) {
      const onlyIf = new Headers(previousEtag ? { "If-Match": `"${previousEtag}"` } : { "If-None-Match": "*" });
      try {
        // A post or moderation action writes a new tombstone/ETag. Old readers
        // lose this conditional write and cannot resurrect their stale snapshot.
        await bucket.put(key, value, { onlyIf, httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
      } catch {
        // Cache population is optional; an accepted DB read is still usable.
      }
    }
  }
  return rows;
}

export async function invalidateCachedComments(projectId: number, bucket: CacheBucket): Promise<void> {
  const value: CacheDocument = { version: 1, revision: crypto.randomUUID(), generatedAt: 0, comments: null };
  // Do not delete the object: an older reader that observed absence must lose
  // its If-None-Match write. Unique revisions also change ETags on repeat calls.
  const written = await bucket.put(cacheKey(projectId), JSON.stringify(value), {
    httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" },
  });
  if (!written) throw new Error("Comment cache invalidation failed.");
}

async function availableBucket(): Promise<CacheBucket | null> {
  try { return await getUploads(); } catch { return null; }
}

export async function getCachedComments(projectId: number) {
  return readCachedComments(projectId, {
    bucket: await availableBucket(),
    load: () => getDb().select(publicCommentFields).from(comments)
      .where(and(eq(comments.projectId, projectId), eq(comments.approved, true)))
      .orderBy(desc(comments.createdAt), desc(comments.id)).limit(PUBLIC_COMMENT_LIMIT),
  });
}

export async function invalidateProjectComments(projectId: number) {
  await invalidateCachedComments(projectId, await getUploads());
}
