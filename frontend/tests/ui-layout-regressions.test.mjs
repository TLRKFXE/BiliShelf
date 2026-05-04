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
    /<div v-if="!props\.trashMode && !props\.followingUpsMode" class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">/,
  );
  assert.match(
    source,
    /<div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">/,
  );
});

test("manager header keeps the sync import action as a peer outline entry button", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /const topActionButtonClass = "[^"]*h-12[^"]*rounded-2xl[^"]*border[^"]*shadow[^"]*";/,
  );
  assert.match(
    source,
    /const secondaryActionButtonClass = "[^"]*h-12[^"]*rounded-2xl[^"]*border[^"]*shadow[^"]*";/,
  );
  assert.match(
    source,
    /<Button\s+v-if="!props\.trashMode"\s+size="sm"\s+variant="outline"\s+:class="secondaryActionButtonClass"\s+:disabled="props\.syncing \|\| props\.exporting \|\| props\.importing"\s+@click="emit\('sync-import'\)"/s,
  );
});

test("manager header keeps the following-up action visually aligned with peer outline buttons", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /<Button\s+size="sm"\s+variant="outline"\s+:class="topActionButtonClass"\s+@click="emit\('open-following-ups'\)"\s*>[\s\S]*\{\{\s*props\.t\("header\.followingUps"\)\s*\}\}/s,
  );
});

test("manager header uses the same active view style for following-up and trash actions", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /const activeViewButtonClass = "[^"]*border-primary\/35[^"]*bg-primary\/12[^"]*text-primary[^"]*shadow/,
  );
  assert.match(
    source,
    /<Button\s+size="sm"\s+variant="outline"\s+:class="\[\s*topActionButtonClass,\s*props\.followingUpsMode \? activeViewButtonClass : ''\s*\]"\s+@click="emit\('open-following-ups'\)"/s,
  );
  assert.match(
    source,
    /<Button\s+size="sm"\s+variant="outline"\s+:class="\[\s*topActionButtonClass,\s*props\.trashMode \? activeViewButtonClass : ''\s*\]"\s+@click="emit\('toggle-trash'\)"/s,
  );
});

test("manager header gives trash mode a dedicated single-action row instead of the regular four-column action grid", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /<div v-if="!props\.trashMode && !props\.followingUpsMode" class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">/,
  );
  assert.match(
    source,
    /<div v-else class="mt-5 flex justify-start md:justify-end">[\s\S]*@click="emit\('toggle-trash'\)"/s,
  );
  assert.equal((source.match(/@click="emit\('toggle-trash'\)"/g) ?? []).length, 2);
});

test("manager header gives following-up mode a dedicated single-action return row instead of a highlighted entry in the main action grid", async () => {
  const source = await readComponentSource(["components", "layout", "ManagerHeader.vue"]);

  assert.match(
    source,
    /<div v-if="!props\.trashMode && !props\.followingUpsMode" class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">/,
  );
  assert.match(
    source,
    /<div v-else-if="props\.followingUpsMode" class="mt-5 flex justify-start md:justify-end">[\s\S]*@click="emit\('open-following-ups'\)"/s,
  );
  assert.equal((source.match(/@click="emit\('open-following-ups'\)"/g) ?? []).length, 2);
});

test("manager header and app remove the AI placeholder entry wiring", async () => {
  const [headerSource, appSource, i18nSource] = await Promise.all([
    readComponentSource(["components", "layout", "ManagerHeader.vue"]),
    readComponentSource(["App.vue"]),
    readComponentSource(["lib", "manager-i18n.ts"]),
  ]);

  assert.doesNotMatch(headerSource, /open-ai-placeholder/);
  assert.doesNotMatch(appSource, /handleOpenAiPlaceholder/);
  assert.doesNotMatch(appSource, /toast\.comingSoon/);
  assert.doesNotMatch(i18nSource, /header\.aiPlaceholder/);
  assert.doesNotMatch(i18nSource, /toast\.comingSoon/);
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

test("webdav dialog keeps one description source and drops the duplicated helper row", async () => {
  const source = await readComponentSource(["components", "dialogs", "WebDavBackupDialog.vue"]);

  assert.equal((source.match(/t\("webdav\.desc"\)/g) ?? []).length, 1);
  assert.doesNotMatch(source, /ShieldCheck/);
});

test("following-up import dialog removes the redundant safety hint block", async () => {
  const source = await readComponentSource(["components", "dialogs", "FollowingUpImportDialog.vue"]);

  assert.doesNotMatch(source, /followingUps\.dialogReadHint/);
  assert.doesNotMatch(source, /followingUps\.dialogSaveHint/);
  assert.doesNotMatch(source, /followingUps\.dialogSafeHint/);
  assert.doesNotMatch(source, /ShieldCheck/);
});

test("sync settings dialog keeps one description source and drops the duplicated helper card", async () => {
  const source = await readComponentSource([
    "components",
    "dialogs",
    "BidirectionalSyncSettingsDialog.vue",
  ]);

  assert.equal((source.match(/t\("sync\.settings\.desc"\)/g) ?? []).length, 1);
  assert.doesNotMatch(source, /ShieldCheck/);
});

test("sync import dialog no longer embeds the stage 2 tag enrichment control panel", async () => {
  const source = await readComponentSource(["components", "dialogs", "SyncImportDialog.vue"]);

  assert.doesNotMatch(source, /sync\.tagEnrichTitle/);
  assert.doesNotMatch(source, /sync\.reloadTagEnrich/);
  assert.doesNotMatch(source, /sync\.tagEnrichStatus/);
  assert.doesNotMatch(source, /sync\.pauseTagEnrich/);
  assert.doesNotMatch(source, /sync\.resumeTagEnrich/);
  assert.doesNotMatch(source, /sync\.runTagEnrichNow/);
  assert.doesNotMatch(source, /sync\.tagEnrichDisabledHint/);
  assert.doesNotMatch(source, /CirclePause/);
  assert.doesNotMatch(source, /WandSparkles/);
  assert.doesNotMatch(source, /tagEnrichmentStatus/);
  assert.doesNotMatch(source, /tagEnrichmentLoading/);
  assert.doesNotMatch(source, /refresh-tag-enrichment/);
  assert.doesNotMatch(source, /pause-tag-enrichment/);
  assert.doesNotMatch(source, /resume-tag-enrichment/);
  assert.doesNotMatch(source, /run-tag-enrichment/);
});

test("app no longer passes embedded stage 2 tag enrichment wiring into the sync import dialog", async () => {
  const source = await readComponentSource(["App.vue"]);

  assert.doesNotMatch(source, /:tag-enrichment-status=/);
  assert.doesNotMatch(source, /:tag-enrichment-loading=/);
  assert.doesNotMatch(source, /@refresh-tag-enrichment=/);
  assert.doesNotMatch(source, /@pause-tag-enrichment=/);
  assert.doesNotMatch(source, /@resume-tag-enrichment=/);
  assert.doesNotMatch(source, /@run-tag-enrichment=/);
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
