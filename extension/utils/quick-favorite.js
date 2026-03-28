import {
  DEFAULT_QUICK_FAVORITE_SHORTCUT,
  formatShortcutLabel,
  matchesShortcutEvent,
} from "./shortcut-config.js";

export const QUICK_FAVORITE_SHORTCUT_LABEL = formatShortcutLabel(
  DEFAULT_QUICK_FAVORITE_SHORTCUT,
);

function joinFolderNames(names) {
  return names.map((name) => String(name || "").trim()).filter(Boolean).join("、");
}

export function matchesQuickFavoriteShortcut(
  event,
  shortcut = DEFAULT_QUICK_FAVORITE_SHORTCUT,
) {
  return matchesShortcutEvent(shortcut, event);
}

export function isEditableTarget(target) {
  const element = target?.nodeType === 3 ? target.parentElement : target;
  if (!element) return false;
  const tagName = String(element.tagName || "").toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }
  if (element.isContentEditable) return true;
  if (typeof element.closest === "function") {
    return Boolean(element.closest("[contenteditable=''], [contenteditable='true']"));
  }
  return false;
}

export function buildQuickFavoriteToastMessage(result, t) {
  const addedFolderNames = Array.isArray(result?.addedFolderNames)
    ? result.addedFolderNames.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  const existingFolderNames = Array.isArray(result?.existingFolderNames)
    ? result.existingFolderNames.map((name) => String(name || "").trim()).filter(Boolean)
    : [];

  if (addedFolderNames.length > 0 && existingFolderNames.length > 0) {
    return t("toast.savedMixedFolders", {
      addedFolders: joinFolderNames(addedFolderNames),
      addedCount: addedFolderNames.length,
      existingFolders: joinFolderNames(existingFolderNames),
      existingCount: existingFolderNames.length,
    });
  }

  if (addedFolderNames.length > 0) {
    return t("toast.savedAddedFolders", {
      folders: joinFolderNames(addedFolderNames),
      count: addedFolderNames.length,
    });
  }

  return t("toast.savedDuplicate", {
    folders: joinFolderNames(existingFolderNames),
    count: existingFolderNames.length,
  });
}
