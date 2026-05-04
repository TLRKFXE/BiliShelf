import test from "node:test";
import assert from "node:assert/strict";
import {
  createPopupToastGate,
  isModifierOnlyShortcutEvent,
} from "../utils/popup-feedback.js";

test("modifier-only shortcut events are ignored until a real key is pressed", () => {
  assert.equal(
    isModifierOnlyShortcutEvent({ key: "Control", code: "ControlLeft" }),
    true,
  );
  assert.equal(
    isModifierOnlyShortcutEvent({ key: "Alt", code: "AltRight" }),
    true,
  );
  assert.equal(
    isModifierOnlyShortcutEvent({ key: "Shift", code: "ShiftLeft" }),
    true,
  );
  assert.equal(
    isModifierOnlyShortcutEvent({
      key: "1",
      code: "Digit1",
      ctrlKey: true,
      altKey: true,
    }),
    false,
  );
});

test("popup toast gate suppresses identical duplicates within the dedupe window", () => {
  const gate = createPopupToastGate(900);

  assert.equal(gate.shouldDisplay("Only supports Alt/Ctrl", "error", 1_000), true);
  assert.equal(gate.shouldDisplay("Only supports Alt/Ctrl", "error", 1_300), false);
  assert.equal(gate.shouldDisplay("Only supports Alt/Ctrl", "info", 1_350), true);
  assert.equal(gate.shouldDisplay("Different message", "error", 1_400), true);
  assert.equal(gate.shouldDisplay("Only supports Alt/Ctrl", "error", 2_200), true);
});
