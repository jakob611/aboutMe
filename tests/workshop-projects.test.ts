import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { loadWorkshopProjects } from "../src/lib/workshop-projects";
import { workshopSlides, type WorkshopProject } from "../src/lib/workshop-slides";

test("sketchbook queries newest bounded real records and redacts closed repository before client props", async t => {
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  t.after(() => { if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl; neonConfig.fetchFunction = oldFetch; });
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let query = "";
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); query = body.query;
    assert.deepEqual(body.params.map(Number), [12]);
    const fields = ["id", "slug", "category", "title_en", "title_sl", "summary_en", "summary_sl", "cover_image", "gallery", "link_url", "repo_url"];
    return Response.json({fields: fields.map(name => ({name, dataTypeID:name === "id" ? 23 : name === "gallery" ? 3802 : 25})), rows: [[9, "real project", "web", "Real website", "Prava stran", "Summary", "Opis", "/cover.webp", JSON.stringify({version:2,images:[{url:"/second.webp",captionEn:"Second",captionSl:"Druga"}],coverCaptionEn:"Cover",coverCaptionSl:"Naslovna",sourceVisibility:"closed"}), "https://example.org", "https://private.example/repository"]], rowCount:1});
  };
  const result = await loadWorkshopProjects("sl");
  assert.match(query, /order by "projects"\."created_at" desc, "projects"\."id" desc limit/);
  assert.doesNotMatch(query, /distinct|featured/);
  assert.equal(result[0].href, "/projects/real%20project");
  assert.equal(result[0].title, "Prava stran");
  assert.deepEqual(result[0].images, [{url:"/cover.webp",caption:"Naslovna"},{url:"/second.webp",caption:"Druga"}]);
  assert.equal(result[0].closed, true);
  assert.equal(result[0].repoUrl, null);
  assert.doesNotMatch(JSON.stringify(result), /private.example/);
});

const project = (id:number, category:string, images:string[]):WorkshopProject => ({id,category,href:"/projects/"+id,title:"Project "+id,summary:"",images:images.map(url=>({url,caption:url})),linkUrl:null,repoUrl:null,closed:false});
test("latest collection keeps record order and one cover per project; a single project cycles ordered images", () => {
  const records=[project(3,"android",["cover3","detail3"]),project(2,"web",["cover2","detail2"])];
  assert.deepEqual(workshopSlides(records,"all").map(slide=>slide.image?.url),["cover3","cover2"]);
  assert.deepEqual(workshopSlides(records,"android").map(slide=>slide.image?.url),["cover3","detail3"]);
  assert.equal(workshopSlides(records,"lego").length,0);
  assert.deepEqual(workshopSlides([project(1,"other",[])],"all").map(slide=>slide.subject),["web"]);
});
