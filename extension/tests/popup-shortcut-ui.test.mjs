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

async function readPopupCssSource() {
  const fullPath = path.resolve(__dirname, "..", "popup.css");
  const source = await readFile(fullPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

test("popup includes a dedicated shortcut settings card and recording controls", async () => {
  const source = await readPopupHtmlSource();

  assert.match(source, /id="shortcut-card"/);
  assert.match(source, /id="shortcut-current-label"/);
  assert.match(source, /Ctrl\+Alt\+1/);
  assert.match(source, /id="shortcut-recording-hint"/);
  assert.match(source, /id="shortcut-start-recording"/);
  assert.match(source, /id="shortcut-restore-default"/);
  assert.match(source, /id="shortcut-clear"/);
});

test("popup shortcut logic reads storage, writes custom and disabled states, restores defaults, and cancels recording with Esc", async () => {
  const source = await readPopupScriptSource();

  assert.match(source, /from "\.\/utils\/popup-feedback\.js"/);
  assert.match(source, /QUICK_FAVORITE_SHORTCUT_STORAGE_KEY/);
  assert.match(source, /chrome\.storage\.local\.get\(\[[^\]]*QUICK_FAVORITE_SHORTCUT_STORAGE_KEY[^\]]*\]\)/);
  assert.match(source, /chrome\.storage\.local\.set\(\{\s*\[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\]:/);
  assert.match(source, /mode:\s*"custom"/);
  assert.match(source, /mode:\s*"disabled"/);
  assert.match(source, /chrome\.storage\.local\.remove\(QUICK_FAVORITE_SHORTCUT_STORAGE_KEY\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /if \(isModifierOnlyShortcutEvent\(event\)\) \{\s*return;\s*\}/s);
  assert.match(source, /const toastGate = createPopupToastGate\(/);
});

test("popup uses one shared action button system for shortcut and footer rows", async () => {
  const htmlSource = await readPopupHtmlSource();
  const cssSource = await readPopupCssSource();

  assert.match(
    htmlSource,
    /<div class="popup-action-grid popup-action-grid--triple shortcut-actions">/,
  );
  assert.match(
    htmlSource,
    /id="shortcut-start-recording" class="popup-btn popup-btn--primary"/,
  );
  assert.match(
    htmlSource,
    /id="shortcut-restore-default" class="popup-btn popup-btn--secondary"/,
  );
  assert.match(
    htmlSource,
    /id="shortcut-clear" class="popup-btn popup-btn--secondary"/,
  );
  assert.match(
    htmlSource,
    /<section class="card actions popup-action-grid popup-action-grid--double">/,
  );
  assert.match(
    htmlSource,
    /id="open-manager" class="popup-btn popup-btn--primary"/,
  );
  assert.match(
    htmlSource,
    /id="open-video" class="popup-btn popup-btn--secondary"/,
  );
  assert.doesNotMatch(htmlSource, /primary-btn|secondary-btn|ghost-btn/);
  assert.match(cssSource, /\.popup-action-grid\s*\{/);
  assert.match(cssSource, /\.popup-btn\s*\{/);
  assert.match(cssSource, /\.Vue-Toastification__toast--info\s*\{/);
  assert.doesNotMatch(cssSource, /background:\s*rgba\(25,\s*183,\s*95,\s*\.14\)/);
  assert.doesNotMatch(cssSource, /background:\s*rgba\(230,\s*38,\s*76,\s*\.14\)/);
});

test("popup exposes an AI placeholder action and strengthens popup chrome", async () => {
  const htmlSource = await readPopupHtmlSource();
  const scriptSource = await readPopupScriptSource();
  const cssSource = await readPopupCssSource();

  assert.match(htmlSource, /id="open-ai-placeholder"/);
  assert.match(scriptSource, /toast\.comingSoon/);
  assert.match(scriptSource, /openAiPlaceholderBtn/);
  assert.match(scriptSource, /openAiPlaceholderBtn\?\.addEventListener\("click"/);
  assert.match(scriptSource, /showToast\(t\("toast\.comingSoon"\), "info"\)/);
  assert.match(cssSource, /body,\s*body\[data-theme="light"\]\s*\{[\s\S]*border-radius:\s*20px;/);
  assert.match(cssSource, /body,\s*body\[data-theme="light"\]\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(cssSource, /\.popup-btn\s*\{[\s\S]*box-shadow:\s*inset/);
  assert.match(cssSource, /\.Vue-Toastification__toast\s*\{[\s\S]*min-width:\s*260px;/);
  assert.doesNotMatch(cssSource, /backdrop-filter:/);
});
