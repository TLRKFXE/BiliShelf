import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readPopupHtmlSource() {
  const fullPath = path.resolve(__dirname, "..", "entrypoints", "popup.html");
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

async function readPopupScriptSource() {
  const fullPath = path.resolve(__dirname, "..", "popup.js");
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("popup includes a dedicated shortcut settings card and recording controls", async () => {
  const source = await readPopupHtmlSource();

  assert.match(source, /id="shortcut-card"/);
  assert.match(source, /id="shortcut-current-label"/);
  assert.match(source, /id="shortcut-recording-hint"/);
  assert.match(source, /id="shortcut-start-recording"/);
  assert.match(source, /id="shortcut-restore-default"/);
  assert.match(source, /id="shortcut-clear"/);
});

test("popup shortcut logic reads storage, writes custom and disabled states, restores defaults, and cancels recording with Esc", async () => {
  const source = await readPopupScriptSource();

  assert.match(source, /QUICK_FAVORITE_SHORTCUT_STORAGE_KEY/);
  assert.match(source, /chrome\.storage\.local\.get\(\[[^\]]*QUICK_FAVORITE_SHORTCUT_STORAGE_KEY[^\]]*\]\)/);
  assert.match(source, /chrome\.storage\.local\.set\(\{\s*\[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\]:/);
  assert.match(source, /mode:\s*"custom"/);
  assert.match(source, /mode:\s*"disabled"/);
  assert.match(source, /chrome\.storage\.local\.remove\(QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\)/);
  assert.match(source, /event\.key === "Escape"/);
});
