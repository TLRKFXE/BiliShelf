# UI Polish Follow-up Design

**Date:** 2026-03-30

## Goal

Address the remaining polish issues reported after the first visible UI cleanup pass:

- manager action buttons still feel visually uneven
- the `Sync Import` action still reads like a primary CTA
- popup shortcut recording spams invalid toasts while modifier keys are still being held
- popup toast styling is too translucent and not visually consistent enough

## Scope

This follow-up stays front-end only and branch-local:

- refine `ManagerHeader.vue` button row spacing and hierarchy
- improve popup shortcut recording behavior in `extension/popup.js`
- improve popup toast styling and duplicate suppression in `extension/popup.css`

Out of scope:

- content-script floating panel toast redesign
- manager-page toast redesign
- any sync logic changes
- any shortcut storage contract changes

## Root Causes

### Manager header hierarchy

The second action row mixes one implicit default button with three explicit outline buttons. Because the shared button component defaults to the primary variant, `Sync Import` becomes the only emphasized CTA in that row even though all four buttons are peer entry actions.

### Shortcut recording toast spam

During recording, every `keydown` is sent through shortcut validation. Pure modifier presses like `ControlLeft` and `AltLeft` are not valid completed shortcut records, so they repeatedly trigger the same invalid toast before the actual main key arrives.

### Popup toast readability

The popup toast styles currently use light translucent fills. Against the popup background and the underlying browser UI, the resulting error stack is visually noisy but low-contrast. There is also no duplicate suppression, so repeated invalid events stack aggressively.

## Chosen Approach

### 1. Manager header: make the second row fully peer-level

- change `Sync Import` to `outline`
- tighten grid/button spacing so both rows read as one consistent control surface
- keep row ordering and behavior unchanged

### 2. Popup shortcut recording: ignore incomplete modifier-only steps

- treat pure modifier `keydown` events as an intermediate state, not a validation failure
- only validate once a non-modifier key is pressed
- keep `Esc` cancel behavior unchanged

### 3. Popup toast: stronger cards plus duplicate suppression

- keep popup toast implementation lightweight and non-Vue
- add a small toast gate that suppresses identical repeated messages inside a short dedupe window
- restyle success / info / error cards with stronger contrast and less transparency

This keeps the popup implementation simple while aligning the result more closely with the clarity of `vue-toastification`.

## Testing Strategy

- extend manager layout regression tests to assert the second row uses outline-only peer actions
- add popup helper tests for:
  - ignoring modifier-only key events
  - suppressing duplicate toasts
- extend popup static regression tests to assert:
  - popup script wires the modifier guard and toast gate
  - popup toast CSS no longer relies on the old weak translucent fills
  - popup info toasts have an explicit style
