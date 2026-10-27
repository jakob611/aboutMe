import assert from "node:assert/strict";
import { test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { loadWorkshopProjects } from "../src/lib/workshop-projects";
import { workshopSlides, type WorkshopProject } from "../src/lib/workshop-slides";

test("sketchbook queries newest record per category and redacts closed repository before client props", async t => {
  const oldUrl = process.env.DATABASE_URL;
  const oldFetch = neonConfig.fetchFunction;
  t.after(() => { if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl; neonConfig.fetchFunction = oldFetch; });
  process.env.DATABASE_URL = "postgresql://test:test@example.neon.tech/neondb?sslmode=require";
  let query = "";
  neonConfig.fetchFunction = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); query = body.query;
    assert.deepEqual(body.params, ["web", "android", "lego", "3d-printing"]);
    const fields = ["id", "slug", "category", "title_en", "title_sl", "summary_en", "summary_sl", "cover_image", "gallery", "link_url", "repo_url"];
    return Response.json({fields: fields.map(name => ({name, dataTypeID:name === "id" ? 23 : name === "gallery" ? 3802 : 25})), rows: [[9, "real project", "web", "Real website", "Prava stran", "Summary", "Opis", "/cover.webp", JSON.stringify({version:2,images:[{url:"/second.webp",captionEn:"Second",captionSl:"Druga"}],coverCaptionEn:"Cover",coverCaptionSl:"Naslovna",sourceVisibility:"closed"}), "https://example.org", "https://private.example/repository"]], rowCount:1});
  };
  const result = await loadWorkshopProjects("sl");
  assert.match(query, /select distinct on \("projects"\."category"\)/);
  assert.match(query, /where "projects"\."category" in/);
  assert.match(query, /order by "projects"\."category" asc, "projects"\."created_at" desc, "projects"\."id" desc/);
  assert.doesNotMatch(query, /limit|featured/);
  assert.equal(result[0].href, "/projects/real%20project");
  assert.equal(result[0].title, "Prava stran");
  assert.deepEqual(result[0].images, [{url:"/cover.webp",caption:"Naslovna"}]);
  assert.equal(result[0].closed, true);
  assert.equal(result[0].repoUrl, null);
  assert.doesNotMatch(JSON.stringify(result), /private.example/);
});

const project = (id:number, category:string, images:string[]):WorkshopProject => ({id,category,href:"/projects/"+id,title:"Project "+id,summary:"",images:images.map(url=>({url,caption:url})),linkUrl:null,repoUrl:null,closed:false});
test("sketchbook has exactly four category slots, each with one newest project cover", () => {
  const records=[project(3,"android",["cover3","detail3"]),project(2,"web",["cover2","detail2"]),project(1,"other",["other"])];
  const slides = workshopSlides(records);
  assert.deepEqual(slides.map(slide => slide.subject), ["web", "android", "lego", "3d-printing"]);
  assert.deepEqual(slides.map(slide => slide.project?.image?.url), ["cover2", "cover3", undefined, undefined]);
  assert.equal(slides[2].project, undefined);
  assert.equal(slides[3].project, undefined);
  assert.doesNotMatch(JSON.stringify(slides), /detail2|detail3|"category":"other"/);
});

test("a category with a project but no uploaded image retains its real title and destination", () => {
  const slot = workshopSlides([project(7,"lego",[])])[2];
  assert.equal(slot.subject, "lego");
  assert.equal(slot.project?.title, "Project 7");
  assert.equal(slot.project?.href, "/projects/7");
  assert.equal(slot.project?.image, undefined);
});
