import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as download, HEAD as head } from "../src/app/api/cv/route";
import { GET as status, POST as publish } from "../src/app/api/admin/cv/route";
import { ADMIN_COOKIE, createAdminSession } from "../src/lib/admin-auth";
import { CV_MAX_SIZE, CV_OBJECT_KEY, getCVMetadata, pdfBytesMatch } from "../src/lib/cv";

test("CV publishing is authenticated, PDF-only, independent of the database, and replaces one known object", async t => {
  const keys = ["UPLOAD_PASSWORD", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "DATABASE_URL"] as const;
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const contextKey = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previousContext = globals[contextKey];
  t.after(() => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
    if (previousContext === undefined) delete globals[contextKey]; else globals[contextKey] = previousContext;
  });
  process.env.UPLOAD_PASSWORD = "test-cv-upload-password";
  process.env.ADMIN_SESSION_SECRET = "test-cv-session-secret-at-least-32-characters";
  delete process.env.DATABASE_URL;
  const objects = new Map<string, { bytes: ArrayBuffer; type: string; uploaded: Date }>();
  const reads: string[] = [];
  let writes = 0;
  const metadata = (key: string) => {
    reads.push(key);
    const object = objects.get(key);
    return object ? { size: object.bytes.byteLength, uploaded: object.uploaded, httpMetadata: { contentType: object.type } } : null;
  };
  globals[contextKey] = { env: { UPLOADS: {
    async put(key: string, bytes: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
      writes++;
      objects.set(key, { bytes, type: options.httpMetadata.contentType, uploaded: new Date("2026-10-25T12:00:00Z") });
    },
    async head(key: string) { return metadata(key); },
    async get(key: string) {
      const info = metadata(key);
      return info ? { ...info, body: new Blob([objects.get(key)!.bytes]).stream() } : null;
    },
  } } };
  const cookie = `${ADMIN_COOKIE}=${(await createAdminSession()).token}`;
  const request = (value?: File | string, auth = cookie, origin = "https://example.com") => {
    const form = new FormData();
    if (value !== undefined) form.set("file", value);
    return new Request("https://example.com/api/admin/cv", { method: "POST", headers: { cookie: auth, origin }, body: form });
  };
  const statusRequest = (auth = cookie) => new Request("https://example.com/api/admin/cv", { headers: { cookie: auth } });
  // Disposable in-memory PDF fixture. This never touches a real R2 bucket or CV.
  const fixture = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n";
  const pdf = () => new File([fixture], "local-test.pdf", { type: "application/pdf" });
  const assertPrivate = (response: Response) => assert.equal(response.headers.get("cache-control"), "private, no-store");

  await t.test("missing and invalid sessions and cross-origin mutations fail before storage", async () => {
    for (const auth of ["", `${ADMIN_COOKIE}=forged`]) {
      const result = await publish(request(pdf(), auth));
      assert.equal(result.status, 401);
      assertPrivate(result);
      const resultStatus = await status(statusRequest(auth));
      assert.equal(resultStatus.status, 401);
      assertPrivate(resultStatus);
    }
    const result = await publish(request(pdf(), cookie, "https://other.example"));
    assert.equal(result.status, 403);
    assertPrivate(result);
    assert.equal(writes, 0);
    assert.equal(reads.length, 0);
  });

  await t.test("absent PDF has no published metadata or public download", async () => {
    assert.deepEqual(await getCVMetadata(), { published: false, fileSize: null, updatedAt: null });
    const response = await status(statusRequest());
    assert.equal(response.status, 200);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { published: false, fileSize: null, updatedAt: null });
    assert.equal((await download()).status, 404);
    const result = await head();
    assert.equal(result.status, 404);
    assert.equal(await result.text(), "");
  });

  await t.test("malformed, empty, non-PDF, forged PDF and oversized uploads are rejected", async () => {
    const cases: [File | string | undefined, number][] = [
      [undefined, 400], ["not a file", 400],
      [new File([], "empty.pdf", { type: "application/pdf" }), 400],
      [new File([fixture], "file.html", { type: "text/html" }), 415],
      [new File(["<html>not a pdf</html>"], "fake.pdf", { type: "application/pdf" }), 415],
      [new File([new Uint8Array(CV_MAX_SIZE + 1)], "large.pdf", { type: "application/pdf" }), 413],
    ];
    for (const [file, expected] of cases) {
      const response = await publish(request(file));
      assert.equal(response.status, expected);
      assertPrivate(response);
    }
    const malformed = await publish(new Request("https://example.com/api/admin/cv", { method: "POST", headers: { cookie }, body: "not multipart" }));
    assert.equal(malformed.status, 400);
    assertPrivate(malformed);
    const oversized = request(pdf());
    oversized.headers.set("content-length", String(CV_MAX_SIZE + 65537));
    assert.equal((await publish(oversized)).status, 413);
    assert.equal(writes, 0);
    assert.equal(pdfBytesMatch(new TextEncoder().encode(fixture)), true);
    assert.equal(pdfBytesMatch(new TextEncoder().encode("x%PDF-1.7\n")), false);
  });

  await t.test("undeclared oversized streams stop before multipart parsing or storage, and denied sessions do not read them", async () => {
    let reads = 0;
    let cancelled = false;
    const oversizedStream = () => new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(512 * 1024));
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const streamedRequest = (auth: string) => new Request("https://example.com/api/admin/cv", {
      method: "POST", headers: { cookie: auth, "content-type": "multipart/form-data; boundary=fixture" },
      body: oversizedStream(), duplex: "half",
    } as RequestInit & { duplex: "half" });
    const denied = await publish(streamedRequest(""));
    assert.equal(denied.status, 401);
    assert.equal(reads, 0);
    const request = streamedRequest(cookie);
    assert.equal(request.headers.has("content-length"), false);
    const response = await publish(request);
    assert.equal(response.status, 413);
    assertPrivate(response);
    assert.equal(cancelled, true);
    assert.equal(reads, 21);
    assert.equal(writes, 0);
  });

  await t.test("publishing reveals only safe metadata and serves an attachment from the fixed key", async () => {
    objects.set("private/secret.pdf", { bytes: new TextEncoder().encode("private").buffer, type: "application/pdf", uploaded: new Date() });
    const result = await publish(request(pdf()));
    assert.equal(result.status, 200);
    assertPrivate(result);
    assert.deepEqual(await result.json(), { ok: true, published: true, fileSize: fixture.length, updatedAt: "2026-10-25T12:00:00.000Z" });
    const resultStatus = await status(statusRequest());
    assert.deepEqual(Object.keys(await resultStatus.json()).sort(), ["fileSize", "published", "updatedAt"]);
    const response = await download();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="Jakob-Tominc-CV.pdf"');
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("content-length"), String(fixture.length));
    assert.equal(await response.text(), fixture);
    assert.equal(reads.every(key => key === CV_OBJECT_KEY), true);
    const resultHead = await head();
    assert.equal(resultHead.status, 200);
    assert.equal(await resultHead.text(), "");
  });

  await t.test("replacement immediately returns new bytes and leaves other objects intact", async () => {
    const replacement = fixture.replace("1.7", "2.0") + "% second version\n";
    assert.equal((await publish(request(new File([replacement], "different-name.pdf", { type: "application/pdf" })))).status, 200);
    const response = await download();
    assert.equal(await response.text(), replacement);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(objects.size, 2);
    assert.equal(objects.has("private/secret.pdf"), true);
    assert.equal(writes, 2);
  });

  await t.test("wrong storage type and storage outages fail closed", async () => {
    objects.get(CV_OBJECT_KEY)!.type = "text/html";
    assert.equal((await download()).status, 404);
    assert.equal((await getCVMetadata()).published, false);
    globals[contextKey] = { env: {} };
    assert.equal((await download()).status, 503);
    assert.equal((await head()).status, 503);
    const result = await status(statusRequest());
    assert.equal(result.status, 503);
    assertPrivate(result);
    const resultUpload = await publish(request(pdf()));
    assert.equal(resultUpload.status, 503);
    assertPrivate(resultUpload);
  });
});
