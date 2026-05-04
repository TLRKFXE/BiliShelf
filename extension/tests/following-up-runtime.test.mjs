import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

test("background exposes following-up list and import status routes", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.match(source, /type FollowingUpImportStatus = \{/);
  assert.match(source, /function defaultFollowingUpImportStatus\(\)/);
  assert.match(source, /let followingUpImportTask: Promise<void> \| null = null;/);
  assert.match(source, /let followingUpImportStatus: FollowingUpImportStatus =/);
  assert.match(source, /function getFollowingUpImportStatus\(\)/);
  assert.match(source, /if \(method === "GET" && path === "\/following-ups"\)/);
  assert.match(source, /if \(method === "POST" && path === "\/sync\/bilibili\/following-ups\/start"\)/);
  assert.match(
    source,
    /if \(method === "GET" && path === "\/sync\/bilibili\/following-ups\/status"\) \{[\s\S]*return ok\(getFollowingUpImportStatus\(\)\);/
  );
  assert.match(source, /running: boolean;/);
  assert.match(source, /total: number;/);
  assert.match(source, /current: number;/);
  assert.match(source, /created: number;/);
  assert.match(source, /updated: number;/);
  assert.match(source, /failed: number;/);
  assert.match(source, /lastError: string \| null;/);
});

test("background implements sequential following-up import with partial preservation", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.match(
    source,
    /const BILI_FOLLOWING_UPS_API = "https:\/\/api\.bilibili\.com\/x\/relation\/followings";/
  );
  assert.match(source, /const BILI_FOLLOWING_UPS_PAGE_GAP_MS = \d+;/);
  assert.match(source, /type SyncFetchStage = "nav" \| "folders" \| "folderVideos" \| "followings";/);
  assert.match(source, /const baseFollowedUps = \[\.\.\.initialState\.followedUps\];/);
  assert.match(source, /const importedRecords: NormalizedFollowedUpRecord\[] = \[];/);
  assert.match(
    source,
    /while \(true\) \{[\s\S]*pn: String\(page\)[\s\S]*fetchBiliJson<[\s\S]*>\(\s*`\$\{BILI_FOLLOWING_UPS_API\}\?\$\{query\.toString\(\)\}`,\s*"followings"\s*\)/
  );
  assert.match(source, /const normalizedPageRecords = rows[\s\S]*normalizeFollowedUpRecord\(item\)/);
  assert.match(source, /mergeFollowedUpRecords\(baseFollowedUps, importedRecords, now\(\)\)/);
  assert.match(source, /state\.followedUps = merged\.records;/);
  assert.match(source, /await sleep\(BILI_FOLLOWING_UPS_PAGE_GAP_MS\);/);
  assert.match(source, /if \(isRisk\) \{[\s\S]*break;/);
});
