import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidUploadPasswordProbe } from "../src/components/FilesClient";

test("the uploader unlocks only after an explicit valid-password probe response", () => {
  assert.equal(
    isValidUploadPasswordProbe(400, { error: "No file provided" }),
    true,
  );
  for (const status of [200, 201, 401, 403, 429, 500, 502, 503]) {
    assert.equal(
      isValidUploadPasswordProbe(status, { error: "No file provided" }),
      false,
    );
  }
  for (const body of [
    null,
    "No file provided",
    {},
    { error: "Wrong password" },
    { error: "Too many attempts" },
  ]) {
    assert.equal(isValidUploadPasswordProbe(400, body), false);
  }
});
