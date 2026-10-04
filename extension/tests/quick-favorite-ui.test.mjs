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

test("content script mounts one collector without a redundant saved-folder summary", async () => {
  const source = await readContentSource();

  assert.doesNotMatch(source, /id: "bl-quick-favorite-layer"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-search"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-list"/);
  assert.doesNotMatch(source, /id: "bl-quick-favorite-save"/);
  assert.doesNotMatch(source, /bl-panel-existing-folders-summary/);
  assert.doesNotMatch(source, /renderExistingFolderSummary/);
});

test("collector shortcut opens the unified collector modal and wires remembered folder storage", async () => {
  const source = await readContentSource();

  assert.match(source, /QUICK_FAVORITE_SHORTCUT_STORAGE_KEY/);
  assert.match(source, /from "\.\/utils\/collector-folder-memory\.js"/);
  assert.match(source, /COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY/);
  assert.match(
    source,
    /let activeQuickFavoriteShortcut = resolveStoredShortcut\(null\);/,
  );
  assert.match(
    source,
    /matchesQuickFavoriteShortcut\(event,\s*activeQuickFavoriteShortcut\)/,
  );
  assert.match(source, /formatShortcutLabel\(activeQuickFavoriteShortcut\)/);
  assert.match(source, /changes\[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\]/);
  assert.match(
    source,
    /window\.addEventListener\("keydown", handleQuickFavoriteShortcut/,
  );
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

test("collector keeps saved state semantic and uses only inline save feedback", async () => {
  const source = await readContentSource();

  assert.match(source, /function setFloatingFavoriteState\(saved\)/);
  assert.match(source, /dataset\.favoriteState = saved \? "saved" : "idle"/);
  assert.match(source, /id: "bl-save-feedback"/);
  assert.match(source, /status\.favoriteAlreadySavedTitle/);
  assert.match(source, /showSaveFeedback\(result, toastMessage, wasSaved\);/);
  assert.doesNotMatch(source, /setStatus\(toastMessage, "ok"\)/);
  assert.match(source, /refreshFloatingFavoriteStateFromPage\(true\)/);
});

test("collector panel keeps motion and shows a filled saved bookmark state", async () => {
  const source = await readContentSource();

  assert.match(source, /"aria-pressed": "false"/);
  assert.match(source, /"aria-expanded": "false"/);
  assert.doesNotMatch(source, /bl-floating-bookmark-fill/);
  assert.doesNotMatch(source, /bl-floating-saved-dot/);
  assert.match(source, /#bl-floating-btn\[data-favorite-state='saved'\]/);
  assert.match(
    source,
    /#bl-floating-btn\[data-favorite-state='saved'\] > svg path/,
  );
  assert.match(source, /fill: currentColor/);
  assert.doesNotMatch(source, /bl-favorite-confirm/);
  assert.match(source, /@keyframes bl-panel-in/);
  assert.match(source, /#bl-floating-panel\.is-closing/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
});

test("collector restores the original full-screen stacking layer", async () => {
  const source = await readContentSource();

  assert.match(
    source,
    /#bl-floating-root\s*\{\s*position:\s*fixed;\s*inset:\s*0;\s*z-index:\s*999998;/,
  );
  assert.match(source, /#bl-floating-btn\s*\{[\s\S]*z-index:\s*999999;/);
  assert.match(source, /\.bl-toast-root\s*\{[\s\S]*z-index:\s*1000001;/);
  assert.match(source, /#bl-playback-overlay\s*\{[\s\S]*z-index:\s*1000000;/);
});

test("collector styles are scoped without injecting a native favorite status button", async () => {
  const source = await readContentSource();

  assert.match(source, /style\.textContent = `[\s\S]*`\.replace\(/);
  assert.match(source, /\"\$1#bl-floating-root \$2\"/);
  assert.doesNotMatch(source, /\n\s*\.bl-hidden\s*\{/);
  assert.doesNotMatch(
    source,
    /nativeFavoriteStatus|NativeFavoriteStatus|bl-native-favorite-status/,
  );
  assert.doesNotMatch(source, /function waitForBilibiliShell\(\)/);
  assert.match(source, /document\.body\.appendChild\(root\)/);
});

test("collector source removes the redundant subtitle and empty saved-folder placeholder copy", async () => {
  const source = await readContentSource();

  assert.doesNotMatch(source, /subtitle\.collector/);
  assert.doesNotMatch(source, /status\.savedFoldersNone/);
});

test("collector modal restores remembered folders on open and saves them only after a successful save", async () => {
  const source = await readContentSource();

  assert.match(
    source,
    /const rememberedFolderIds = articleMode\s*\? \[\]\s*:\s*await readRememberedCollectorFolderIds\(\);/,
  );
  assert.match(source, /\.\.\.currentCollectorFolderIds\(\)/);
  assert.match(source, /selectedFolderIds = new Set\(\[/);
  assert.match(
    source,
    /createRememberedCollectorFolderIdsRecord\(\[\.\.\.folderIds\]\)/,
  );
  assert.match(
    source,
    /const result = await requestLocalApi\("POST", "\/videos", payload\);[\s\S]*createRememberedCollectorFolderIdsRecord\(\[\.\.\.folderIds\]\)/,
  );
});

test("collector custom tags keep comma-separated input while layering suggestion chips on top", async () => {
  const source = await readContentSource();

  assert.match(source, /from "\.\/utils\/custom-tag-suggestions\.js"/);
  assert.match(source, /id: "bl-custom-tag-suggestions"/);
  assert.match(source, /async function fetchAllCustomTags\(\)/);
  assert.match(source, /renderCustomTagSuggestions\(\);/);
  assert.match(
    source,
    /customTagsInput\?\.addEventListener\("input", \(\) => \{/,
  );
  assert.match(source, /appendSuggestedCustomTag\(/);
  assert.match(source, /findMatchingCustomTagSuggestions\(/);
});

test("collector enter handling respects IME and create-folder modal guards before saving", async () => {
  const source = await readContentSource();

  assert.match(source, /if \(event\.isComposing\) return;/);
  assert.match(
    source,
    /if \(event\.key === "Enter"\) \{\s*if \(modal && !modal\.classList\.contains\("bl-hidden"\)\) return;\s*event\.preventDefault\(\);\s*void saveCollectorItem\(\);\s*\}/s,
  );
  assert.doesNotMatch(source, /void saveQuickFavorite\(\)/);
});

test("content script uses compact solid toasts and an independently scrolling collector body", async () => {
  const source = await readContentSource();

  assert.match(source, /toast\.extensionReloadRequired/);
  assert.match(source, /let extensionContextInvalidated = false;/);
  assert.match(source, /extensionContextInvalidated = true;/);
  assert.match(source, /runtimeError\.message/);
  assert.match(
    source,
    /showToast\(t\("toast\.extensionReloadRequired"\), "err"\);/,
  );
  assert.match(
    source,
    /\.Vue-Toastification__toast\s*\{[\s\S]*min-width:\s*280px;[\s\S]*font-size:\s*13px;/,
  );
  assert.match(source, /className: "bl-panel-scroll"/);
  assert.match(source, /\.bl-panel-scroll\s*\{[\s\S]*overflow-y:\s*auto;/);
  assert.match(source, /border-left:\s*3px solid #4ccbbb;/);
  assert.doesNotMatch(source, /linear-gradient\(/);
});
