import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectGallery } from "../src/components/ProjectGallery";
import { ProjectCard } from "../src/components/ProjectCard";

test("gallery preserves authored order, plain captions and language while supporting legacy image URLs", () => {
  const html=renderToStaticMarkup(createElement(ProjectGallery,{title:"Actual project",lang:"en",images:[{url:"/second.webp",captionEn:"Second <script>unsafe</script>",captionSl:"Druga"},{url:"/first.webp",captionEn:"First",captionSl:"Prva"}]}));
  assert.ok(html.indexOf('/second.webp') < html.indexOf('/first.webp'));
  assert.match(html,/figcaption/);
  assert.match(html,/Second &lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  const legacy=renderToStaticMarkup(createElement(ProjectGallery,{title:"Legacy",lang:"sl",images:["/old.webp"]}));
  assert.match(legacy,/Povečaj fotografijo 1: Legacy/);
  assert.doesNotMatch(legacy,/figcaption/);
});

test("explicit closed source is visible in project card without publishing repository URL", () => {
  const html=renderToStaticMarkup(createElement(ProjectCard,{lang:"en",project:{id:1,slug:"actual",titleEn:"Actual",titleSl:"Pravi",summaryEn:"A real record",summarySl:"Opis",category:"web",coverImage:null,linkUrl:null,repoUrl:null,tags:[],sourceVisibility:"closed"}}));
  assert.match(html,/Closed source/);
  assert.match(html,/\/projects\/actual/);
});
