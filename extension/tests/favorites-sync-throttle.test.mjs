import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  createFavoritesSyncThrottleState,
  resolveFavoritesCooldownPolicy,
  resolveFavoritesFolderGapMs,
  resolveFavoritesPageGapMs,
  updateFavoritesSyncThrottleState,
} from "../shared/favorites-sync-throttle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

test("large folders back off more than small folders on page pacing", () => {
  const small = createFavoritesSyncThrottleState({ folderMediaCount: 80 });
  const large = createFavoritesSyncThrottleState({ folderMediaCount: 8000 });

  assert.ok(resolveFavoritesPageGapMs(large) > resolveFavoritesPageGapMs(small));
});

test("slow responses increase the next page gap", () => {
  const base = createFavoritesSyncThrottleState({ folderMediaCount: 600 });
  const slow = updateFavoritesSyncThrottleState(base, {
    responseMs: 2400,
    pageMediaCount: 20,
    totalVideosProcessed: 20,
  });

  assert.ok(resolveFavoritesPageGapMs(slow) > resolveFavoritesPageGapMs(base));
});

test("folder transitions add a non-zero delay", () => {
  const state = createFavoritesSyncThrottleState({ folderMediaCount: 1200 });

  assert.ok(resolveFavoritesFolderGapMs(state) > 0);
});

test("cooldown policy scales with heavier sync pressure", () => {
  const relaxed = resolveFavoritesCooldownPolicy(
    createFavoritesSyncThrottleState({ folderMediaCount: 150 })
  );
  const pressured = resolveFavoritesCooldownPolicy(
    updateFavoritesSyncThrottleState(
      createFavoritesSyncThrottleState({ folderMediaCount: 8000 }),
      {
        responseMs: 2600,
        pageMediaCount: 20,
        totalVideosProcessed: 2400,
      }
    )
  );

  assert.ok(pressured.thresholdVideos < relaxed.thresholdVideos);
  assert.ok(pressured.delayMs > relaxed.delayMs);
});

test("background sync imports the throttle helper instead of fixed favorites pacing constants", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.match(source, /favorites-sync-throttle\.js/);
  assert.doesNotMatch(source, /FAVORITES_COOLDOWN_EVERY_VIDEOS/);
  assert.doesNotMatch(source, /FAVORITES_COOLDOWN_MS/);
  assert.doesNotMatch(source, /FAVORITES_PAGE_GAP_MS/);
  assert.doesNotMatch(source, /FAVORITES_PAGE_GAP_JITTER_MS/);
});

test("background startup does not auto-trigger tag enrichment requests", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.doesNotMatch(source, /triggerTagEnrichment\("startup"\)/);
});

test("background favorites sync completion does not auto-trigger tag enrichment requests", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /result\.summary\.videosProcessed > 0[\s\S]{0,240}scheduleTagEnrichment\(1\)/
  );
  assert.doesNotMatch(
    source,
    /result\.summary\.videosProcessed > 0[\s\S]{0,240}triggerTagEnrichment\("sync"\)/
  );
});

test("background alarm handler does not resume tag enrichment requests", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.doesNotMatch(source, /triggerTagEnrichment\("alarm"\)/);
});

test("background startup clears stale tag enrichment alarms", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  const startupIndex = source.indexOf("export default defineBackground(() => {");
  assert.notEqual(startupIndex, -1);
  const startupBlock = source.slice(startupIndex, startupIndex + 600);

  assert.match(startupBlock, /chrome\.alarms\.clear\(TAG_ENRICH_ALARM\)/);
});
