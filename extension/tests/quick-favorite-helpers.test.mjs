import test from "node:test";
import assert from "node:assert/strict";

import { resolveStoredShortcut } from "../utils/shortcut-config.js";
import {
  QUICK_FAVORITE_SHORTCUT_LABEL,
  buildQuickFavoriteToastMessage,
  isEditableTarget,
  matchesQuickFavoriteShortcut,
} from "../utils/quick-favorite.js";

test("matches quick favorite shortcut only for Alt+Shift+S without control or meta", () => {
  assert.equal(
    matchesQuickFavoriteShortcut({
      key: "S",
      code: "KeyS",
      altKey: true,
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
      repeat: false,
    }),
    true,
  );
  assert.equal(
    matchesQuickFavoriteShortcut({
      key: "s",
      code: "KeyS",
      altKey: false,
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
      repeat: false,
    }),
    false,
  );
  assert.equal(
    matchesQuickFavoriteShortcut({
      key: "s",
      code: "KeyS",
      altKey: true,
      shiftKey: true,
      ctrlKey: true,
      metaKey: false,
      repeat: false,
    }),
    false,
  );
});

test("matches quick favorite shortcut against custom and disabled stored configs", () => {
  const customShortcut = resolveStoredShortcut({
    mode: "custom",
    altKey: false,
    ctrlKey: true,
    shiftKey: false,
    code: "Digit7",
    key: "7",
  });

  assert.equal(
    matchesQuickFavoriteShortcut(
      {
        key: "7",
        code: "Digit7",
        altKey: false,
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        repeat: false,
      },
      customShortcut,
    ),
    true,
  );

  assert.equal(
    matchesQuickFavoriteShortcut(
      {
        key: "S",
        code: "KeyS",
        altKey: true,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        repeat: false,
      },
      resolveStoredShortcut({ mode: "disabled" }),
    ),
    false,
  );
});

test("editable target detection ignores shortcut handling inside text inputs", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT", isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: "TEXTAREA", isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: "BUTTON", isContentEditable: false }), false);
});

test("quick favorite toast message distinguishes added folders from duplicate folders", () => {
  const t = (key, vars = {}) => `${key}:${JSON.stringify(vars)}`;

  assert.equal(
    buildQuickFavoriteToastMessage(
      {
        addedFolderNames: ["稍后重看"],
        existingFolderNames: [],
      },
      t,
    ),
    'toast.savedAddedFolders:{"folders":"稍后重看","count":1}',
  );

  assert.equal(
    buildQuickFavoriteToastMessage(
      {
        addedFolderNames: [],
        existingFolderNames: ["默认收藏夹", "教程"],
      },
      t,
    ),
    'toast.savedDuplicate:{"folders":"默认收藏夹、教程","count":2}',
  );

  assert.equal(
    buildQuickFavoriteToastMessage(
      {
        addedFolderNames: ["稍后重看"],
        existingFolderNames: ["默认收藏夹"],
      },
      t,
    ),
    'toast.savedMixedFolders:{"addedFolders":"稍后重看","addedCount":1,"existingFolders":"默认收藏夹","existingCount":1}',
  );
});

test("quick favorite shortcut label stays stable for copy and UI hints", () => {
  assert.equal(QUICK_FAVORITE_SHORTCUT_LABEL, "Alt+Shift+S");
});
