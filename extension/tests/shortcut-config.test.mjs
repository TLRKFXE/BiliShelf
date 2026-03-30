import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_QUICK_FAVORITE_SHORTCUT,
  QUICK_FAVORITE_SHORTCUT_STORAGE_KEY,
  formatShortcutLabel,
  isValidShortcutRecord,
  matchesShortcutEvent,
  resolveStoredShortcut,
} from "../utils/shortcut-config.js";

test("resolveStoredShortcut falls back to default shortcut when storage is empty", () => {
  const resolved = resolveStoredShortcut(null);

  assert.equal(resolved.mode, "default");
  assert.equal(resolved.disabled, false);
  assert.equal(resolved.altKey, true);
  assert.equal(resolved.ctrlKey, true);
  assert.equal(resolved.shiftKey, false);
  assert.equal(resolved.code, "Digit1");
  assert.equal(formatShortcutLabel(resolved), "Ctrl+Alt+1");
});

test("resolveStoredShortcut keeps explicit disabled state stable", () => {
  const resolved = resolveStoredShortcut({ mode: "disabled" });

  assert.equal(resolved.mode, "disabled");
  assert.equal(resolved.disabled, true);
  assert.equal(formatShortcutLabel(resolved), "Disabled");
});

test("isValidShortcutRecord only accepts Alt/Ctrl plus A-Z or 0-9 primary keys", () => {
  assert.equal(
    isValidShortcutRecord({
      mode: "custom",
      altKey: true,
      ctrlKey: false,
      shiftKey: true,
      code: "KeyS",
      key: "s",
    }),
    true,
  );

  assert.equal(
    isValidShortcutRecord({
      mode: "custom",
      altKey: false,
      ctrlKey: false,
      shiftKey: true,
      code: "KeyS",
      key: "s",
    }),
    false,
  );

  assert.equal(
    isValidShortcutRecord({
      mode: "custom",
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      code: "F5",
      key: "F5",
    }),
    false,
  );
});

test("matchesShortcutEvent uses stored shortcut config instead of a hardcoded key", () => {
  const customShortcut = resolveStoredShortcut({
    mode: "custom",
    altKey: false,
    ctrlKey: true,
    shiftKey: false,
    code: "Digit7",
    key: "7",
  });

  assert.equal(
    matchesShortcutEvent(customShortcut, {
      altKey: false,
      ctrlKey: true,
      shiftKey: false,
      metaKey: false,
      repeat: false,
      code: "Digit7",
      key: "7",
    }),
    true,
  );

  assert.equal(
    matchesShortcutEvent(customShortcut, {
      altKey: true,
      ctrlKey: false,
      shiftKey: true,
      metaKey: false,
      repeat: false,
      code: "KeyS",
      key: "s",
    }),
    false,
  );
});

test("shortcut storage key and default shortcut contract stay stable", () => {
  assert.equal(
    QUICK_FAVORITE_SHORTCUT_STORAGE_KEY,
    "bili_like_quick_favorite_shortcut_v1",
  );
  assert.equal(DEFAULT_QUICK_FAVORITE_SHORTCUT.code, "Digit1");
  assert.equal(DEFAULT_QUICK_FAVORITE_SHORTCUT.altKey, true);
  assert.equal(DEFAULT_QUICK_FAVORITE_SHORTCUT.ctrlKey, true);
  assert.equal(DEFAULT_QUICK_FAVORITE_SHORTCUT.shiftKey, false);
});
