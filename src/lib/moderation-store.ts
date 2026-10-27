import "server-only";
import { isIP } from "node:net";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUploads } from "./storage";
import { boundedJSON } from "./site-content-store";
import type { AdminBlock, SubmissionModeration } from "./moderation-types";

export const BLOCKS_KEY = "private/moderation/blocks.v1.json";
export const MODERATION_MAX_BYTES = 128 * 1024;
const MAX_BLOCKS = 500;
const ENVELOPE_LIMIT = MODERATION_MAX_BYTES * 2;
type SubmissionKind = "comment" | "message";
type StoredSubmission = Omit<SubmissionModeration, "blocked">;
type LocationData = { country?: unknown; region?: unknown; city?: unknown };
type StoredBlocks = { version: 1; blocks: AdminBlock[] };

/** R2 stores encrypted private records even if bucket access is accidentally broadened. */
export interface ModerationBucket {
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number; etag: string } | null>;
  put(key: string, body: string, options: { onlyIf?: Headers; httpMetadata: { contentType: string; cacheControl: string } }): Promise<{ etag: string } | null>;
  delete(key: string): Promise<void>;
}

function secretValue() {
  const secret = process.env.MODERATION_SECRET || "";
  if (secret.length < 32) throw new Error("Moderation secret unavailable.");
  return secret;
}
function bytes64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}
function from64(value: unknown, max: number) {
  if (typeof value !== "string" || value.length > max || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Invalid private record.");
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
async function encryptionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`aboutme:moderation-encryption:v1:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
export function validFingerprint(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
export function canonicalIp(value: string | null): string | null {
  if (!value || value.length > 45 || !isIP(value)) return null;
  return isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname.slice(1, -1) : value;
}
export async function ipFingerprint(ip: string, secret = secretValue()) {
  const normalized = canonicalIp(ip);
  if (!normalized) throw new Error("Invalid IP identifier.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`aboutme:submission-ip:v1:${normalized}`));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}
function locationText(value: unknown, max = 100) {
  return typeof value === "string" && value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : null;
}
/** Only Cloudflare's request context supplies location; caller-supplied location headers are ignored. */
export async function captureSubmission(request: Request, cf?: LocationData): Promise<StoredSubmission | null> {
  const ip = canonicalIp(request.headers.get("cf-connecting-ip"));
  if (!ip) return null;
  let location = cf;
  if (!location) {
    try { location = (await getCloudflareContext({ async: true })).cf; }
    catch { location = undefined; }
  }
  const country = locationText(location?.country, 2);
  return {
    fingerprint: await ipFingerprint(ip),
    country: country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null,
    region: locationText(location?.region), city: locationText(location?.city),
    capturedAt: new Date().toISOString(),
  };
}
export async function encryptPrivateRecord(key: string, value: unknown, secret = secretValue()): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  if (encoded.byteLength > MODERATION_MAX_BYTES) throw new Error("Private record too large.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(key) }, await encryptionKey(secret), encoded);
  return JSON.stringify({ version: 1, iv: bytes64(iv), ciphertext: bytes64(new Uint8Array(encrypted)) });
}
export async function decryptPrivateRecord(key: string, envelope: unknown, secret = secretValue()): Promise<unknown> {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new Error("Invalid private record.");
  const value = envelope as Record<string, unknown>;
  if (value.version !== 1) throw new Error("Unsupported private record.");
  const iv = from64(value.iv, 24), ciphertext = from64(value.ciphertext, ENVELOPE_LIMIT);
  if (iv.byteLength !== 12 || ciphertext.byteLength > MODERATION_MAX_BYTES + 16) throw new Error("Invalid private record size.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(key) }, await encryptionKey(secret), ciphertext);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plain));
}
async function readEncrypted(bucket: ModerationBucket, key: string) {
  const object = await bucket.get(key);
  if (!object) return { value: null, revision: null };
  if (object.size > ENVELOPE_LIMIT) { await object.body.cancel(); throw new Error("Private record too large."); }
  return { value: await decryptPrivateRecord(key, await boundedJSON(object.body, ENVELOPE_LIMIT)), revision: object.etag };
}
function parseBlocks(value: unknown): AdminBlock[] {
  if (value === null) return [];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid block registry.");
  const registry = value as StoredBlocks;
  if (registry.version !== 1 || !Array.isArray(registry.blocks) || registry.blocks.length > MAX_BLOCKS) throw new Error("Invalid block registry.");
  const fingerprints = new Set<string>();
  return registry.blocks.map(block => {
    if (!block || !validFingerprint(block.fingerprint) || fingerprints.has(block.fingerprint) || typeof block.createdAt !== "string" || !Number.isFinite(Date.parse(block.createdAt)) || typeof block.reason !== "string" || block.reason.length > 200) throw new Error("Invalid block registry.");
    fingerprints.add(block.fingerprint);
    return { fingerprint: block.fingerprint, createdAt: block.createdAt, reason: block.reason };
  });
}
export async function moderationBucket(): Promise<ModerationBucket> { return await getUploads(); }
export async function readBlocks(bucket?: ModerationBucket) {
  bucket ??= await moderationBucket();
  const stored = await readEncrypted(bucket, BLOCKS_KEY);
  return { blocks: parseBlocks(stored.value), revision: stored.revision };
}
export async function isSubmissionBlocked(submission: StoredSubmission | null, bucket?: ModerationBucket) {
  bucket ??= await moderationBucket();
  secretValue();
  // Always read the registry, including unknown IPs: an unavailable control store fails closed.
  const { blocks } = await readBlocks(bucket);
  return submission !== null && blocks.some(block => block.fingerprint === submission.fingerprint);
}
export async function setSubmissionBlock(fingerprint: string, blocked: boolean, reason = "", bucket?: ModerationBucket) {
  bucket ??= await moderationBucket();
  if (!validFingerprint(fingerprint) || typeof blocked !== "boolean" || reason.length > 200) throw new Error("Invalid block update.");
  for (let attempt = 0; attempt < 4; attempt++) {
    const { blocks, revision } = await readBlocks(bucket);
    const existing = blocks.find(block => block.fingerprint === fingerprint);
    const next = blocks.filter(block => block.fingerprint !== fingerprint);
    if (blocked) next.unshift({ fingerprint, createdAt: existing?.createdAt || new Date().toISOString(), reason });
    if (next.length > MAX_BLOCKS) throw new Error("Block list is full. Unblock an old entry first.");
    const onlyIf = new Headers(revision ? { "If-Match": `"${revision}"` } : { "If-None-Match": "*" });
    const result = await bucket.put(BLOCKS_KEY, await encryptPrivateRecord(BLOCKS_KEY, { version: 1, blocks: next }), { onlyIf, httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
    if (result) return next;
  }
  throw new Error("Block list changed. Please retry.");
}
export function submissionKey(kind: SubmissionKind, id: number) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid submission ID.");
  return `private/moderation/submissions/${kind}/${id}.json`;
}
export async function storeSubmission(kind: SubmissionKind, id: number, submission: StoredSubmission | null, bucket?: ModerationBucket) {
  bucket ??= await moderationBucket();
  if (!submission) return;
  const key = submissionKey(kind, id);
  await bucket.put(key, await encryptPrivateRecord(key, submission), { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
}
export async function readSubmission(kind: SubmissionKind, id: number, blocks: readonly AdminBlock[], bucket?: ModerationBucket): Promise<SubmissionModeration | null> {
  bucket ??= await moderationBucket();
  const { value } = await readEncrypted(bucket, submissionKey(kind, id));
  if (!value) return null;
  const stored = value as StoredSubmission;
  if (!validFingerprint(stored.fingerprint) || typeof stored.capturedAt !== "string" || !Number.isFinite(Date.parse(stored.capturedAt))) throw new Error("Invalid submission metadata.");
  return { fingerprint: stored.fingerprint, country: locationText(stored.country, 2), region: locationText(stored.region), city: locationText(stored.city), capturedAt: stored.capturedAt, blocked: blocks.some(block => block.fingerprint === stored.fingerprint) };
}
