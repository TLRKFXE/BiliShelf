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

  assert.match(source, /id: "bl-quick-favorite-layer"/);
  assert.match(source, /id: "bl-quick-favorite-search"/);
  assert.match(source, /id: "bl-quick-favorite-list"/);
  assert.match(source, /id: "bl-quick-favorite-save"/);
  assert.match(source, /id: "bl-existing-folders-summary"/);
});

test("quick favorite layer resolves its shortcut from storage-backed config and resets transient selection", async () => {
  const source = await readContentSource();

  assert.match(source, /QUICK_FAVORITE_SHORTCUT_STORAGE_KEY/);
  assert.match(source, /let activeQuickFavoriteShortcut = resolveStoredShortcut\(null\);/);
  assert.match(source, /matchesQuickFavoriteShortcut\(event,\s*activeQuickFavoriteShortcut\)/);
  assert.match(source, /formatShortcutLabel\(activeQuickFavoriteShortcut\)/);
  assert.match(source, /changes\[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\]/);
  assert.match(source, /quickSelectedFolderIds = new Set\(\);/);
  assert.match(source, /window\.addEventListener\("keydown", handleQuickFavoriteShortcut/);
  assert.match(source, /quickSelectedFolderIds = new Set\(\);\s*quickActiveFolderId = 0;\s*openQuickFavoriteLayer\(\);/s);
});

test("duplicate save feedback references existing folders instead of only generic saved toast", async () => {
  const source = await readContentSource();

  assert.match(source, /toast\.savedDuplicate/);
  assert.match(source, /toast\.savedAddedFolders/);
  assert.match(source, /toast\.savedMixedFolders/);
  assert.match(source, /buildQuickFavoriteToastMessage\(/);
});
