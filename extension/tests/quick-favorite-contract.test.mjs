import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readBackgroundSource() {
  const fullPath = path.resolve(__dirname, "..", "entrypoints", "background.ts");
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("post videos route delegates to saveVideoSelectionToState and exposes removal-aware result fields", async () => {
  const source = await readBackgroundSource();

  assert.match(source, /export function saveVideoSelectionToState\(/);
  assert.match(source, /const removedFolderIds: number\[\] = \[\];/);
  assert.match(source, /const deleted = finalFolderIds\.length === 0;/);
  assert.match(source, /return saveVideoSelectionToState\(state, body\);/);
  assert.match(
    source,
    /return ok\(\s*\{\s*video: mapVideo\(state, video\),\s*created: !existed,\s*deleted,\s*addedFolderIds,\s*existingFolderIds,\s*removedFolderIds,\s*finalFolderIds,\s*finalFolders,\s*\},\s*existed \? 200 : 201\s*\);/s,
  );
});
