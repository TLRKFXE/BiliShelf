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

test("manager header exposes an AI placeholder action and framed tool button styling", async () => {
  const headerSource = await readManagerHeaderSource();
  const appSource = await readManagerAppSource();
  const i18nSource = await readManagerI18nSource();

  assert.match(i18nSource, /"header\.aiPlaceholder"/);
  assert.match(i18nSource, /"toast\.comingSoon"/);
  assert.match(headerSource, /"open-ai-placeholder": \[\];/);
  assert.match(headerSource, /props\.t\("header\.aiPlaceholder"\)/);
  assert.match(headerSource, /@click="emit\('open-ai-placeholder'\)"/);
  assert.match(headerSource, /const topActionButtonClass = "[^"]*border[^"]*shadow/);
  assert.match(headerSource, /const secondaryActionButtonClass = "[^"]*border[^"]*shadow/);
  assert.match(appSource, /@open-ai-placeholder="handleOpenAiPlaceholder"/);
  assert.match(appSource, /function handleOpenAiPlaceholder\(\)/);
  assert.match(appSource, /notifySuccess\(t\("toast\.comingSoon"\)\)/);
});

test("folder sidebar playback action aligns its trigger to the right", async () => {
  const source = await readFolderSidebarSource();

  assert.match(
    source,
    /<div class="flex justify-end">\s*<Button size="sm" class="gap-1"/,
  );
});
