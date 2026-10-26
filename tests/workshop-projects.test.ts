import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { loadWorkshopProjectLinks } from "../src/lib/workshop-projects";

test("sketch destinations select one newest real project per category, independently of featured cards", async (t) => {
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  t.after(() => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    neonConfig.fetchFunction = oldFetch;
  });
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let query = "";
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    query = body.query;
    assert.deepEqual(body.params, ["web", "android", "lego", "3d-printing"]);
    return Response.json({
      fields: ["category", "slug", "title_en", "title_sl"].map(name => ({ name, dataTypeID: 25 })),
      rows: [["web", "real project", "Real website", "Prava spletna stran"], ["lego", "real-build", "Real build", "Prava stvaritev"]],
      rowCount: 2,
    });
  };
  const links = await loadWorkshopProjectLinks("sl");
  assert.match(query, /select distinct on \("projects"\."category"\)/);
  assert.match(query, /order by "projects"\."category", "projects"\."created_at" desc, "projects"\."id" desc/);
  assert.doesNotMatch(query, /featured|limit/);
  assert.deepEqual(links.web, { href: "/projects/real%20project", title: "Prava spletna stran" });
  assert.equal(links.android, undefined);
  assert.equal(links["3d-printing"], undefined);
});
