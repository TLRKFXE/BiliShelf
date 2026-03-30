import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function readFrontendSource(relativePath) {
  const fullPath = path.join(repoRoot, "src", ...relativePath);
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("video detail dialog no longer renders the ai summary block", async () => {
  const source = await readFrontendSource([
    "components",
    "dialogs",
    "VideoDetailDialog.vue",
  ]);

  assert.doesNotMatch(source, /const detailAiAnalysis = computed/);
  assert.doesNotMatch(source, /<div v-if="detailAiAnalysis"/);
  assert.doesNotMatch(source, /detail\.aiTitle/);
});
