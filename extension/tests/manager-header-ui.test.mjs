import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

async function readManagerHeaderSource() {
  const source = await readFile(
    path.join(repoRoot, "frontend", "src", "components", "layout", "ManagerHeader.vue"),
    "utf8",
  );
  return source.replace(/\r\n/g, "\n");
}

async function readFolderSidebarSource() {
  const source = await readFile(
    path.join(repoRoot, "frontend", "src", "components", "FolderSidebar.vue"),
    "utf8",
  );
  return source.replace(/\r\n/g, "\n");
}

async function readManagerAppSource() {
  const source = await readFile(path.join(repoRoot, "frontend", "src", "App.vue"), "utf8");
  return source.replace(/\r\n/g, "\n");
}

async function readManagerI18nSource() {
  const source = await readFile(
    path.join(repoRoot, "frontend", "src", "lib", "manager-i18n.ts"),
    "utf8",
  );
  return source.replace(/\r\n/g, "\n");
}

test("manager header removes the AI placeholder action and keeps the trash toggle icon carrier", async () => {
  const headerSource = await readManagerHeaderSource();
  const appSource = await readManagerAppSource();
  const i18nSource = await readManagerI18nSource();

  assert.doesNotMatch(i18nSource, /"header\.aiPlaceholder"/);
  assert.doesNotMatch(i18nSource, /"toast\.comingSoon"/);
  assert.doesNotMatch(headerSource, /"open-ai-placeholder": \[\];/);
  assert.doesNotMatch(headerSource, /props\.t\("header\.aiPlaceholder"\)/);
  assert.doesNotMatch(headerSource, /@click="emit\('open-ai-placeholder'\)"/);
  assert.match(headerSource, /const topActionButtonClass = "[^"]*border[^"]*shadow/);
  assert.match(headerSource, /const secondaryActionButtonClass = "[^"]*border[^"]*shadow/);
  assert.match(headerSource, /const activeViewButtonClass = "[^"]*border-primary\/35[^"]*bg-primary\/12[^"]*text-primary/);
  assert.match(headerSource, /const trashActionIconClass = "[^"]*rounded[^"]*border[^"]*transition-colors/);
  assert.match(headerSource, /const trashActionIconIdleClass = "[^"]*text-foreground[^"]*dark:text-white/);
  assert.match(headerSource, /const trashActionIconActiveClass = "[^"]*text-primary/);
  assert.match(
    headerSource,
    /<span\s+:class="\[trashActionIconClass, props\.trashMode \? trashActionIconActiveClass : trashActionIconIdleClass\]"\s*>\s*<Trash2 class="h-3\.5 w-3\.5" \/>/,
  );
  assert.doesNotMatch(appSource, /@open-ai-placeholder="handleOpenAiPlaceholder"/);
  assert.doesNotMatch(appSource, /function handleOpenAiPlaceholder\(\)/);
  assert.doesNotMatch(appSource, /notifySuccess\(t\("toast\.comingSoon"\)\)/);
});

test("folder sidebar playback action aligns its trigger to the right", async () => {
  const source = await readFolderSidebarSource();

  assert.match(
    source,
    /<div class="flex justify-end">\s*<Button size="sm" class="gap-1"/,
  );
});
