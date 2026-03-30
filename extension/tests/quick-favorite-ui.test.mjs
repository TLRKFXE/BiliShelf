import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readContentSource() {
  const fullPath = path.resolve(__dirname, "..", "content.js");
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("content script mounts a dedicated quick favorite layer with existing-folder summary", async () => {
  const source = await readContentSource();

  assert.doesNotMatch(source, /id: "bl-quick-favorite-layer"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-search"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-list"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-save"/);
  assert.match(source, /id: "bl-panel-existing-folders-summary"/);
});

test("collector shortcut opens the unified collector modal and wires remembered folder storage", async () => {
  const source = await readContentSource();

  assert.match(source, /QUICK_FAVORITE_SHORTCUT_STORAGE_KEY/);
  assert.match(source, /from "\.\/utils\/collector-folder-memory\.js"/);
  assert.match(source, /COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY/);
  assert.match(source, /let activeQuickFavoriteShortcut = resolveStoredShortcut\(null\);/);
  assert.match(source, /matchesQuickFavoriteShortcut\(event,\s*activeQuickFavoriteShortcut\)/);
  assert.match(source, /formatShortcutLabel\(activeQuickFavoriteShortcut\)/);
  assert.match(source, /changes\[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\]/);
  assert.match(source, /window\.addEventListener\("keydown", handleQuickFavoriteShortcut/);
  assert.match(source, /void openCollectorModal\(\);/);
  assert.doesNotMatch(source, /quickSelectedFolderIds = new Set\(\);/);
  assert.doesNotMatch(source, /openQuickFavoriteLayer\(\)/);
});

test("duplicate save feedback references existing folders instead of only generic saved toast", async () => {
  const source = await readContentSource();

  assert.match(source, /toast\.savedDuplicate/);
  assert.match(source, /toast\.savedAddedFolders/);
  assert.match(source, /toast\.savedMixedFolders/);
  assert.match(source, /buildQuickFavoriteToastMessage\(/);
});

test("collector source removes the redundant subtitle and empty saved-folder placeholder copy", async () => {
  const source = await readContentSource();

  assert.doesNotMatch(source, /subtitle\.collector/);
  assert.doesNotMatch(source, /status\.savedFoldersNone/);
});

test("collector modal restores remembered folders on open and saves them only after a successful save", async () => {
  const source = await readContentSource();

  assert.match(source, /const rememberedFolderIds = await readRememberedCollectorFolderIds\(\);/);
  assert.match(source, /selectedFolderIds = new Set\(rememberedFolderIds\);/);
  assert.match(source, /createRememberedCollectorFolderIdsRecord\(\[\.\.\.folderIds\]\)/);
  assert.match(
    source,
    /const result = await requestLocalApi\("POST", "\/videos", payload\);[\s\S]*createRememberedCollectorFolderIdsRecord\(\[\.\.\.folderIds\]\)/,
  );
});

test("collector enter handling respects IME and create-folder modal guards before saving", async () => {
  const source = await readContentSource();

  assert.match(source, /if \(event\.isComposing\) return;/);
  assert.match(
    source,
    /if \(event\.key === "Enter"\) \{\s*if \(modal && !modal\.classList\.contains\("bl-hidden"\)\) return;\s*event\.preventDefault\(\);\s*void saveVideo\(\);\s*\}/s,
  );
  assert.doesNotMatch(source, /void saveQuickFavorite\(\)/);
});
