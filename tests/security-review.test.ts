import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/admin/login/route";
import { POST as upload, DELETE as deleteFile } from "../src/app/api/files/route";
import { GET as listComments, POST as postComment } from "../src/app/api/projects/[slug]/comments/route";
import { createAdminSession, verifyAdminSession } from "../src/lib/admin-auth";

test("security review regressions", async t => {
  const keys = ["UPLOAD_PASSWORD", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "DATABASE_URL"] as const;
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const symbol = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const oldContext = globals[symbol];
  const oldFetch = neonConfig.fetchFunction;
  t.after(() => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    if (oldContext === undefined) delete globals[symbol];
    else globals[symbol] = oldContext;
    neonConfig.fetchFunction = oldFetch;
  });
  process.env.UPLOAD_PASSWORD = "test-password-not-a-real-secret";
  delete process.env.ADMIN_PASSWORD;
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";

  await t.test("missing signing secret fails closed when creating a session", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    await assert.rejects(createAdminSession(), /ADMIN_SESSION_SECRET/);
    assert.equal(await verifyAdminSession("123.fake.signature"), false);
  });

  await t.test("login and legacy file endpoints share one password-attempt budget", async () => {
    const attemptedKeys: string[] = [];
    globals[symbol] = { env: { ADMIN_LOGIN_LIMITER: {
      async limit({ key }: { key: string }) {
        attemptedKeys.push(key);
        return { success: attemptedKeys.length <= 2 };
      },
    } } };
    const headers = { origin: "https://example.com", "cf-connecting-ip": "192.0.2.1" };
    assert.equal((await login(new NextRequest("https://example.com/api/admin/login", {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    }))).status, 401);
    const form = new FormData();
    form.set("password", "wrong");
    assert.equal((await upload(new NextRequest("https://example.com/api/files", {
      method: "POST", headers, body: form,
    }))).status, 401);
    const denied = await deleteFile(new NextRequest("https://example.com/api/files?id=1", {
      method: "DELETE", headers: { ...headers, authorization: "Bearer wrong" },
    }));
    assert.equal(denied.status, 429);
    assert.equal(denied.headers.get("retry-after"), "60");
    assert.equal(new Set(attemptedKeys).size, 1);
    // The authenticated upload parser and storage are never reached after the limit.
    assert.equal((await upload(new NextRequest("https://example.com/api/files", {
      method: "POST", headers, body: "not multipart",
    }))).status, 429);
  });

  await t.test("public comment responses do not expose email addresses", async () => {
    const queries: string[] = [];
    neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
      const { query } = JSON.parse(String(init.body)) as { query: string };
      if (query.includes('from "projects"')) {
        return Response.json({ fields: [{ name: "id", dataTypeID: 23 }], rows: [[1]], rowCount: 1 });
      }
      queries.push(query);
      const projection = query.startsWith("insert") ? query.split(" returning ")[1] : query.split(" from ")[0];
      assert.ok(projection);
      assert.equal(projection.includes('"email"'), false);
      return Response.json({
        fields: ["id", "author", "content", "created_at"].map(name => ({ name, dataTypeID: 25 })),
        rows: [["1", "Visitor", "Hello", "2026-10-24 12:00:00"]], rowCount: 1,
      });
    };
    const ctx = { params: Promise.resolve({ slug: "test" }) };
    const listed = await listComments(new NextRequest("https://example.com/api/projects/test/comments"), ctx);
    assert.equal(listed.status, 200);
    assert.equal("email" in (await listed.json()).comments[0], false);
    const posted = await postComment(new NextRequest("https://example.com/api/projects/test/comments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ author: "Visitor", email: "private@example.com", content: "Hello" }),
    }), ctx);
    assert.equal(posted.status, 200);
    const body = await posted.json();
    assert.equal("email" in body.comment, false);
    assert.equal(JSON.stringify(body).includes("private@example.com"), false);
    assert.equal(queries.length, 2);
  });
});
