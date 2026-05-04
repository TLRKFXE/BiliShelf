import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

async function readSource(relativePath) {
  const source = await readFile(path.join(repoRoot, relativePath), "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("frontend exposes following-up types, API methods, and App view wiring", async () => {
  const [typesSource, apiSource, appSource] = await Promise.all([
    readSource("frontend/src/types.ts"),
    readSource("frontend/src/lib/api.ts"),
    readSource("frontend/src/App.vue"),
  ]);

  assert.match(typesSource, /export type FollowedUp = \{/);
  assert.match(typesSource, /export type FollowingUpImportStatus = \{/);

  assert.match(apiSource, /export async function fetchFollowingUps\(\)/);
  assert.match(apiSource, /export async function startFollowingUpImport\(/);
  assert.match(apiSource, /export async function fetchFollowingUpImportStatus\(\)/);

  assert.match(appSource, /import FollowingUpPanel from "\.\/components\/panels\/FollowingUpPanel\.vue";/);
  assert.match(appSource, /const followingUps = ref<FollowedUp\[]>\(\[]\);/);
  assert.match(appSource, /const followingUpImportDialogOpen = ref\(false\);/);
  assert.match(appSource, /<FollowingUpPanel/);
});

test("following-up panel, i18n strings, header action, and import dialog are wired", async () => {
  const [panelSource, i18nSource, headerSource, dialogSource, appSource] =
    await Promise.all([
      readSource("frontend/src/components/panels/FollowingUpPanel.vue"),
      readSource("frontend/src/lib/manager-i18n.ts"),
      readSource("frontend/src/components/layout/ManagerHeader.vue"),
      readSource("frontend/src/components/dialogs/FollowingUpImportDialog.vue"),
      readSource("frontend/src/App.vue"),
    ]);

  assert.match(panelSource, /props\.t\("followingUps\.title"\)/);
  assert.match(panelSource, /props\.t\(["']followingUps\.searchPlaceholder["']\)/);
  assert.match(panelSource, /props\.t\("followingUps\.import"\)/);
  assert.match(panelSource, /props\.t\("followingUps\.refresh"\)/);
  assert.match(panelSource, /props\.t\("followingUps\.empty"\)/);
  assert.match(panelSource, /UID \{\{ record\.uid \}\}/);
  assert.match(panelSource, /emit\('open-space', record\)/);
  assert.match(panelSource, /from "@\/lib\/following-up-pagination\.js"/);
  assert.match(panelSource, /props\.t\("common\.page"/);
  assert.match(panelSource, /props\.t\("common\.perPage"/);
  assert.match(panelSource, /@click="goPrevPage"/);
  assert.match(panelSource, /@click="goNextPage"/);
  assert.match(panelSource, /const followingUpPageJump = ref\(""\);/);
  assert.match(panelSource, /function submitFollowingUpPageJump\(\)/);
  assert.match(panelSource, /@keydown\.enter\.prevent="submitFollowingUpPageJump"/);
  assert.match(panelSource, /@click="submitFollowingUpPageJump"/);
  assert.match(panelSource, /props\.t\('common\.pageJumpPlaceholder'\)/);
  assert.match(panelSource, /props\.t\("common\.jump"\)/);
  assert.match(panelSource, /v-for="record in pagedRecords"/);

  assert.match(i18nSource, /"followingUps\.title"/);
  assert.match(i18nSource, /"followingUps\.import"/);
  assert.match(i18nSource, /"followingUps\.refresh"/);
  assert.match(i18nSource, /"followingUps\.empty"/);
  assert.match(i18nSource, /"followingUps\.searchEmpty"/);
  assert.match(i18nSource, /"followingUps\.openSpace"/);
  assert.match(i18nSource, /"followingUps\.dialogTitle"/);
  assert.match(i18nSource, /"followingUps\.dialogDesc"/);

  assert.match(headerSource, /"open-following-ups": \[\];/);
  assert.match(headerSource, /props\.t\("header\.followingUps"\)/);
  assert.match(headerSource, /@click="emit\('open-following-ups'\)"/);

  assert.match(dialogSource, /props\.t\("followingUps\.dialogTitle"\)/);
  assert.match(dialogSource, /props\.t\("followingUps\.dialogDesc"\)/);
  assert.doesNotMatch(dialogSource, /props\.t\("followingUps\.dialogReadHint"\)/);
  assert.doesNotMatch(dialogSource, /props\.t\("followingUps\.dialogSaveHint"\)/);
  assert.doesNotMatch(dialogSource, /props\.t\("followingUps\.dialogSafeHint"\)/);
  assert.match(dialogSource, /props\.t\("followingUps\.startImport"\)/);

  assert.match(appSource, /import FollowingUpImportDialog from "\.\/components\/dialogs\/FollowingUpImportDialog\.vue";/);
  assert.match(appSource, /<FollowingUpImportDialog/);
  assert.match(appSource, /@open-following-ups="toggleFollowingUpsMode\(!followingUpsMode\)"/);
});
