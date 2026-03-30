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

test("folder sidebar exposes a dedicated playback action section", async () => {
  const source = await readFrontendSource(["components", "FolderSidebar.vue"]);

  assert.match(source, /showPlaybackActions\?: boolean;/);
  assert.match(source, /startPlayback: \[number\];/);
  assert.match(source, /playbackTitle/);
  assert.match(source, /playbackStart/);
});

test("folder playback action stays scoped to the active folder", async () => {
  const source = await readFrontendSource(["components", "FolderSidebar.vue"]);

  assert.match(source, /function triggerPlayback\(\) \{/);
  assert.match(source, /if \(props\.activeFolderId === null\) return;/);
  assert.match(source, /emit\("startPlayback", props\.activeFolderId\);/);
});

test("app wiring calls a folder playback start helper from the sidebar", async () => {
  const source = await readFrontendSource(["App.vue"]);

  assert.match(source, /startFolderPlaybackSession,/);
  assert.match(source, /async function handleStartFolderPlayback\(folderId: number\)/);
  assert.match(source, /const \{ extracted, globalKeyword \} = parseKeywordFromUtils\(keyword\.value\);/);
  assert.match(source, /await startFolderPlaybackSession\(/);
  assert.match(source, /window\.open\(result\.firstItem\.url, "_blank", "noopener,noreferrer"\);/);
  assert.match(source, /@start-playback="handleStartFolderPlayback"/);
});

test("api module exposes a folder playback session start function", async () => {
  const source = await readFrontendSource(["lib", "api.ts"]);

  assert.match(source, /export async function startFolderPlaybackSession\(/);
  assert.match(source, /"\/playback\/folder-session"/);
});
