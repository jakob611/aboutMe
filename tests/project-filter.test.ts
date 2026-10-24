import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { GET } from "../src/app/api/projects/route";

test("public project API composes featured and category filters", async (t) => {
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  t.after(() => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    neonConfig.fetchFunction = oldFetch;
  });
  process.env.DATABASE_URL =
    "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let query = "";
  let params: unknown[] = [];
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    query = body.query;
    params = body.params;
    return Response.json({ fields: [], rows: [], rowCount: 0 });
  };
  assert.equal(
    (
      await GET(
        new Request("https://example.com/api/projects?featured=1&category=web"),
      )
    ).status,
    200,
  );
  assert.match(
    query,
    /where \("projects"\."featured" = \$1 and "projects"\."category" = \$2\)/,
  );
  assert.deepEqual(params, ["true", "web"]);
  await GET(new Request("https://example.com/api/projects?category=lego"));
  assert.match(query, /where "projects"\."category" = \$1/);
  assert.deepEqual(params, ["lego"]);
  await GET(new Request("https://example.com/api/projects"));
  assert.doesNotMatch(query, / where /);
  assert.deepEqual(params, []);
});
