export const QUICK_FAVORITE_SHORTCUT_STORAGE_KEY =
  "bili_like_quick_favorite_shortcut_v1";

const DISABLED_SHORTCUT = Object.freeze({
  mode: "disabled",
  disabled: true,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  code: "",
  key: "",
});

export const DEFAULT_QUICK_FAVORITE_SHORTCUT = Object.freeze({
  mode: "default",
  disabled: false,
  altKey: true,
  ctrlKey: true,
  shiftKey: false,
  code: "Digit1",
  key: "1",
});

function normalizeCode(code) {
  const value = String(code || "").trim();
  if (/^Key[A-Z]$/.test(value)) return value;
  if (/^Digit[0-9]$/.test(value)) return value;
  return "";
}

function normalizeKey(key, code) {
  const codeValue = normalizeCode(code);
  if (!codeValue) return "";
  if (codeValue.startsWith("Key")) {
    return codeValue.slice(3).toLowerCase();
  }
  if (codeValue.startsWith("Digit")) {
    return codeValue.slice(5);
  }
  return String(key || "").trim().slice(0, 1).toLowerCase();
}

function normalizeShortcutRecord(record, mode = "custom") {
  const code = normalizeCode(record?.code);
  return {
    mode,
    disabled: false,
    altKey: Boolean(record?.altKey),
    ctrlKey: Boolean(record?.ctrlKey),
    shiftKey: Boolean(record?.shiftKey),
    code,
    key: normalizeKey(record?.key, code),
  };
}

function getShortcutToken(shortcut) {
  const code = normalizeCode(shortcut?.code);
  if (!code) return "";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return "";
}

function toResolvedShortcut(record) {
  if (!isValidShortcutRecord(record)) return { ...DEFAULT_QUICK_FAVORITE_SHORTCUT };
  return normalizeShortcutRecord(record, record?.mode === "default" ? "default" : "custom");
}

export function isValidShortcutRecord(record) {
  if (!record || typeof record !== "object") return false;
  const mode = record.mode;
  if (mode !== "default" && mode !== "custom") return false;
  const altKey = Boolean(record.altKey);
  const ctrlKey = Boolean(record.ctrlKey);
  if (!altKey && !ctrlKey) return false;
  if (Boolean(record.metaKey)) return false;
  return Boolean(normalizeCode(record.code));
}

export function resolveStoredShortcut(raw) {
  if (raw?.mode === "disabled") return { ...DISABLED_SHORTCUT };
  if (raw?.mode === "custom") return toResolvedShortcut(raw);
  if (raw?.mode === "default") return { ...DEFAULT_QUICK_FAVORITE_SHORTCUT };
  return { ...DEFAULT_QUICK_FAVORITE_SHORTCUT };
}

export function formatShortcutLabel(shortcut) {
  const resolved = resolveStoredShortcut(shortcut);
  if (resolved.disabled) return "Disabled";
  const parts = [];
  if (resolved.ctrlKey) parts.push("Ctrl");
  if (resolved.altKey) parts.push("Alt");
  if (resolved.shiftKey) parts.push("Shift");
  const token = getShortcutToken(resolved);
  if (token) parts.push(token);
  return parts.join("+");
}

export function matchesShortcutEvent(shortcut, event) {
  const resolved = resolveStoredShortcut(shortcut);
  if (!event || resolved.disabled) return false;
  if (event.repeat || event.metaKey) return false;
  if (Boolean(event.altKey) !== resolved.altKey) return false;
  if (Boolean(event.ctrlKey) !== resolved.ctrlKey) return false;
  if (Boolean(event.shiftKey) !== resolved.shiftKey) return false;
  return normalizeCode(event.code) === resolved.code;
}
