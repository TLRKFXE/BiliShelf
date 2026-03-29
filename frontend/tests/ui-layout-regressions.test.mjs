import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readComponentSource(relativePath) {
  const fullPath = path.resolve(__dirname, "..", "src", ...relativePath);
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("manager header keeps both action rows in stable four-column grids", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /<div class="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">/,
  );
  assert.match(
    source,
    /<div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">/,
  );
});

test("folder sidebar keeps ai actions above a scrollable folder list", async () => {
  const source = await readComponentSource(["components", "FolderSidebar.vue"]);
  const aiSectionIndex = source.indexOf('<section\n      v-if="props.showAiActions"');
  const folderListIndex = source.indexOf('<div class="mt-4 min-h-0 flex-1 overflow-y-auto">');

  assert.notEqual(aiSectionIndex, -1);
  assert.notEqual(folderListIndex, -1);
  assert.ok(aiSectionIndex < folderListIndex);
  assert.match(source, /<aside class="panel-surface flex h-full min-h-0 flex-col p-5">/);
});

test("ai category browser no longer shows the temporary footer hint", async () => {
  const source = await readComponentSource(["components", "AiCategoryBrowser.vue"]);

  assert.doesNotMatch(source, /ai\.browser\.footerHint/);
  assert.doesNotMatch(source, /Sparkles/);
});

test("ai settings dialog removes the duplicated local-runtime description copy", async () => {
  const source = await readComponentSource(["components", "dialogs", "AiSettingsDialog.vue"]);

  assert.doesNotMatch(source, /DialogDescription/);
  assert.doesNotMatch(source, /ai\.settings\.desc/);
});

test("sync dialogs expose bulk-selection controls for folder queues", async () => {
  const syncSource = await readComponentSource(["components", "dialogs", "SyncImportDialog.vue"]);
  const autoInitSource = await readComponentSource([
    "components",
    "dialogs",
    "AutoInitSetupDialog.vue",
  ]);

  assert.match(syncSource, /t\("common\.selectAll"\)/);
  assert.match(syncSource, /t\("common\.clear"\)/);
  assert.match(autoInitSource, /t\("common\.selectAll"\)/);
  assert.match(autoInitSource, /t\("common\.clear"\)/);
});

test("manual sync dialog no longer renders the misleading chunk-size controls", async () => {
  const source = await readComponentSource(["components", "dialogs", "SyncImportDialog.vue"]);

  assert.doesNotMatch(source, /sync\.chunkSizeTitle/);
  assert.doesNotMatch(source, /sync\.autoChunkHint/);
});

test("app temporarily disables ai category entry points and background fetches", async () => {
  const source = await readComponentSource(["App.vue"]);

  assert.match(source, /const AI_CATEGORIES_ENABLED = false;/);
  assert.match(
    source,
    /:show-ai-actions="AI_CATEGORIES_ENABLED && EXTENSION_LOCAL_API_RUNTIME && !trashMode"/,
  );
  assert.match(
    source,
    /:show-ai-settings="AI_CATEGORIES_ENABLED && EXTENSION_LOCAL_API_RUNTIME"/,
  );
  assert.match(
    source,
    /v-if="AI_CATEGORIES_ENABLED && !trashMode && aiCategoryBrowserOpen"/,
  );
  assert.match(
    source,
    /if \(\s*!AI_CATEGORIES_ENABLED\s*\|\|\s*!EXTENSION_LOCAL_API_RUNTIME\s*\|\|\s*trashMode\.value\s*\|\|\s*folderId === null\s*\) \{/s,
  );
});
