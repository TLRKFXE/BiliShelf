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

test("post videos route returns enriched save result contract for duplicate-aware feedback", async () => {
  const source = await readBackgroundSource();

  assert.match(source, /const addedFolderIds: number\[\] = \[\];/);
  assert.match(source, /const existingFolderIds: number\[\] = \[\];/);
  assert.match(source, /const finalFolders = state\.folderItems/);
  assert.match(
    source,
    /return ok\(\{\s*video: mapVideo\(state, video\),\s*created: !existed,\s*addedFolderIds,\s*existingFolderIds,\s*finalFolderIds:\s*finalFolders\.map\(\(folder\) => folder\.id\),\s*finalFolders,\s*\}, existed \? 200 : 201\);/s,
  );
});
