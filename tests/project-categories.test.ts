import assert from "node:assert/strict";
import { test } from "node:test";
import { PROJECT_CATEGORY_IDS, getProjectCategoryLabels, isProjectCategory, normalizeProjectCategory, projectCategoryLabel } from "../src/lib/project-categories";
import { projectInputSchema, toProjectRow } from "../src/lib/project-input";

const project = {
  titleEn: "Printed part", titleSl: "Natisnjen kos",
  summaryEn: "A model", summarySl: "Model",
  descriptionEn: "Model notes", descriptionSl: "Opombe modela",
};

test("every public project category is accepted by the editor schema and localized", () => {
  for (const category of PROJECT_CATEGORY_IDS) {
    const input = projectInputSchema.parse({ ...project, category });
    assert.equal(toProjectRow(input).category, category);
    assert.equal(isProjectCategory(category), true);
    assert.ok(getProjectCategoryLabels("en")[category]);
    assert.ok(getProjectCategoryLabels("sl")[category]);
  }
  assert.equal(projectCategoryLabel("3d-printing", "en"), "3D printing");
  assert.equal(projectCategoryLabel("3d-printing", "sl"), "3D-tisk");
});

test("unknown legacy categories stay under Other and retain their display name", () => {
  assert.equal(normalizeProjectCategory("electronics"), "other");
  assert.equal(projectCategoryLabel("electronics", "en"), "electronics");
  assert.equal(normalizeProjectCategory("3d-printing"), "3d-printing");
  assert.equal(normalizeProjectCategory("all"), "other");
  for (const invalid of [null, undefined, ["3d-printing"], "3d", "all"]) {
    assert.equal(isProjectCategory(invalid), false);
    assert.equal(projectInputSchema.safeParse({ ...project, category: invalid }).success, false);
  }
});
