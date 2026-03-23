import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

async function readRepoText(...relativePath) {
  return readFile(path.join(repoRoot, ...relativePath), "utf8");
}

async function repoPathExists(...relativePath) {
  try {
    await access(path.join(repoRoot, ...relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("repo no longer includes the local backend project", async () => {
  assert.equal(await repoPathExists("backend"), false);
});

test("frontend dev config no longer defaults to the removed local backend proxy", async () => {
  const viteConfigSource = await readRepoText("frontend", "vite.config.ts");

  assert.doesNotMatch(viteConfigSource, /127\.0\.0\.1:4321/);
});

test("current readmes no longer tell contributors to run backend commands", async () => {
  const readmeZh = await readRepoText("README.md");
  const readmeEn = await readRepoText("README.en.md");
  const extensionReadme = await readRepoText("extension", "README.md");

  assert.doesNotMatch(readmeZh, /pnpm --dir backend/);
  assert.doesNotMatch(readmeZh, /backend\/\s+#/);
  assert.doesNotMatch(readmeEn, /pnpm --dir backend/);
  assert.doesNotMatch(readmeEn, /backend\/\s+# API service/);
  assert.doesNotMatch(extensionReadme, /`backend\/`/);
});
