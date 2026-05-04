const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift"]);
const MODIFIER_CODES = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
  "ShiftLeft",
  "ShiftRight",
]);

function normalizeToastType(type) {
  return type === "error" ? "error" : type === "info" ? "info" : "success";
}

export function isModifierOnlyShortcutEvent(eventLike) {
  const key = String(eventLike?.key ?? "");
  const code = String(eventLike?.code ?? "");
  return MODIFIER_KEYS.has(key) || MODIFIER_CODES.has(code);
}

export function createPopupToastGate(dedupeWindowMs = 900) {
  let lastToast = null;

  return {
    shouldDisplay(message, type = "success", now = Date.now()) {
      const normalizedMessage = String(message ?? "");
      const normalizedType = normalizeToastType(type);
      if (!normalizedMessage) return false;

      if (
        lastToast &&
        lastToast.message === normalizedMessage &&
        lastToast.type === normalizedType &&
        now - lastToast.timestamp < dedupeWindowMs
      ) {
        return false;
      }

      lastToast = {
        message: normalizedMessage,
        type: normalizedType,
        timestamp: now,
      };
      return true;
    },
  };
}
