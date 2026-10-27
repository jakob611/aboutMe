import "./server-component-runtime";
import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import {
  COMMENT_CACHE_SECONDS, getCachedComments, invalidateCachedComments,
  readCachedComments, type PublicComment,
} from "../src/lib/get-comments";

class MemoryBucket {
  objects = new Map<string, { text: string; etag: string }>();
  reads = 0; writes = 0; rejectedWrites = 0;
  async get(key: string) {
    this.reads++;
    const value = this.objects.get(key);
    return value ? { body: new Blob([value.text]).stream(), size: new TextEncoder().encode(value.text).byteLength, etag: value.etag } : null;
  }
  async put(key: string, text: string | ArrayBuffer, options?: { onlyIf?: Headers }) {
    assert.equal(typeof text, "string");
    const current = this.objects.get(key);
    const condition = options?.onlyIf;
    if (condition?.get("if-none-match") === "*" && current ||
        condition?.has("if-match") && condition.get("if-match") !== `"${current?.etag}"`) {
      this.rejectedWrites++;
      return null;
    }
    const etag = (++this.writes).toString(16).padStart(32, "0");
    this.objects.set(key, { text: String(text), etag });
    return { etag };
  }
}

const sample = (id = 1): PublicComment => ({ id, author: "Reader", content: "Useful project.", createdAt: "2026-10-27T10:00:00.000Z" });

test("persistent per-project snapshots replace repeated public reads with one loader call and strip private fields", async () => {
  const bucket = new MemoryBucket(); let queries = 0;
  const load = async () => { queries++; return [{ ...sample(), email: "private@example.com", ip: "192.0.2.1", location: "Private", approved: true }, { ...sample(2), approved: false }]; };
  for (let count = 0; count < 25; count++) {
    assert.deepEqual(await readCachedComments(1, { bucket, load }), [sample()]);
  }
  assert.equal(queries, 1); assert.equal(bucket.reads, 25); assert.equal(bucket.writes, 1);
  const serialized = [...bucket.objects.values()][0].text;
  assert.doesNotMatch(serialized, /email|private@|192\.0\.2|location|approved|projectId/);
  assert.equal(JSON.parse(serialized).comments.length, 1);
  await readCachedComments(2, { bucket, load });
  assert.equal(queries, 2); assert.equal(bucket.objects.size, 2);
});

test("empty results are cached, finite expiry refills, and invalid project keys never touch storage", async () => {
  const bucket = new MemoryBucket(); let now = 1000; let queries = 0;
  const options = { bucket, now: () => now, load: async () => { queries++; return []; } };
  await readCachedComments(5, options); now += COMMENT_CACHE_SECONDS * 1000 - 1;
  await readCachedComments(5, options); assert.equal(queries, 1);
  now++; await readCachedComments(5, options); assert.equal(queries, 2);
  const before = bucket.reads;
  for (const id of [0, -1, 1.5, NaN, Infinity]) await assert.rejects(() => readCachedComments(id, options));
  assert.equal(bucket.reads, before);
});

test("mutation tombstones invalidate immediately and every invalidation changes the revision", async () => {
  const bucket = new MemoryBucket(); let queries = 0; let rows = [sample()];
  const load = async () => { queries++; return rows; };
  await readCachedComments(1, { bucket, load });
  await invalidateCachedComments(1, bucket);
  const first = JSON.parse([...bucket.objects.values()][0].text);
  await invalidateCachedComments(1, bucket);
  const second = JSON.parse([...bucket.objects.values()][0].text);
  assert.notEqual(first.revision, second.revision); assert.equal(second.comments, null);
  rows = []; assert.deepEqual(await readCachedComments(1, { bucket, load }), []);
  assert.equal(queries, 2);
});

test("in-flight cache misses cannot resurrect old comments after moderation, including originally absent entries", async () => {
  for (const existing of [false, true]) {
    const bucket = new MemoryBucket();
    if (existing) await invalidateCachedComments(1, bucket);
    let release!: (value: PublicComment[]) => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const query = new Promise<PublicComment[]>(resolve => { release = resolve; });
    const pending = readCachedComments(1, { bucket, load: async () => { started(); return query; } });
    await entered;
    await invalidateCachedComments(1, bucket); // The actual mutation commits before acknowledgement.
    release([sample()]);
    await pending;
    assert.equal(bucket.rejectedWrites, 1);
    assert.equal(JSON.parse([...bucket.objects.values()][0].text).comments, null);
    assert.deepEqual(await readCachedComments(1, { bucket, load: async () => [] }), []);
  }
});

test("cache outages fall back without blind writes; database errors never become cached successes", async () => {
  let writes = 0; let queries = 0;
  const broken = { async get() { throw new Error("R2 unavailable"); }, async put() { writes++; return { etag: "unused" }; } };
  assert.deepEqual(await readCachedComments(1, { bucket: broken, load: async () => { queries++; return [sample()]; } }), [sample()]);
  assert.equal(queries, 1); assert.equal(writes, 0);
  const bucket = new MemoryBucket();
  await assert.rejects(() => readCachedComments(1, { bucket, load: async () => { throw new Error("Neon unavailable"); } }));
  assert.equal(bucket.writes, 0);
  await assert.rejects(() => invalidateCachedComments(1, { ...broken, async put() { throw new Error("R2 write unavailable"); } }));
});

test("malformed, private-field, future and oversized stored snapshots are bounded and replaced safely", async () => {
  const bucket = new MemoryBucket(); const key = "private/comment-cache/v1/1.json";
  for (const text of ["not JSON", JSON.stringify({ version: 1, revision: crypto.randomUUID(), generatedAt: Date.now(), comments: [{ ...sample(), email: "must-not-leak@example.com" }] }), JSON.stringify({ version: 1, revision: crypto.randomUUID(), generatedAt: Date.now() + 100000, comments: [sample()] })]) {
    bucket.objects.set(key, { text, etag: "a".repeat(32) });
    let queries = 0;
    assert.deepEqual(await readCachedComments(1, { bucket, load: async () => { queries++; return []; } }), []);
    assert.equal(queries, 1); assert.deepEqual(JSON.parse(bucket.objects.get(key)!.text).comments, []);
  }
  let cancelled = false;
  const oversized = {
    async get() { return { size: 1, etag: "b".repeat(32), body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } }) }; },
    async put() { return { etag: "c".repeat(32) }; },
  };
  assert.deepEqual(await readCachedComments(1, { bucket: oversized, load: async () => [] }), []);
  assert.equal(cancelled, true);
});

test("real Drizzle public loader is filtered/bounded and repeated reads avoid Neon calls", async t => {
  const contextKey = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[contextKey]; const oldUrl = process.env.DATABASE_URL; const oldFetch = neonConfig.fetchFunction;
  t.after(() => { if (oldContext === undefined) delete globals[contextKey]; else globals[contextKey] = oldContext; if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl; neonConfig.fetchFunction = oldFetch; });
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb";
  const bucket = new MemoryBucket(); globals[contextKey] = { env: { UPLOADS: bucket } };
  let queries = 0;
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const { query, params } = JSON.parse(String(init.body)); queries++;
    assert.match(query, /"approved" = \$2/); assert.match(query, /limit \$3/);
    assert.deepEqual(params, ["17", "true", "200"]); assert.doesNotMatch(query, /email|ip|location/);
    return Response.json({ fields: [{ name: "id", dataTypeID: 23 }, { name: "author", dataTypeID: 25 }, { name: "content", dataTypeID: 25 }, { name: "created_at", dataTypeID: 1114 }], rows: [[1, "Reader", "Useful project.", "2026-10-27 10:00:00"]], rowCount: 1 });
  };
  assert.deepEqual(await getCachedComments(17), [sample()]);
  assert.deepEqual(await getCachedComments(17), [sample()]);
  assert.equal(queries, 1);
});
