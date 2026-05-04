# Unified Collector Modal Design

**Date:** 2026-03-30

## Goal

Unify the floating button workflow and the quick-favorite shortcut workflow into a single centered collector modal that keeps the original full-featured collector UI while removing the duplicate quick-favorite mini panel.

## User Experience Changes

### 1. The full collector becomes the only save surface

- Clicking the floating button opens the full collector as a centered modal with backdrop.
- Pressing the quick-favorite shortcut opens that same modal instead of the existing dedicated quick-favorite layer.
- The existing floating side panel layout is retired, along with the dedicated quick-favorite overlay.

### 2. The two redundant copy lines are removed

- Remove the collector subtitle under the title.
- Remove the empty-state summary sentence that says the current video has not yet been saved locally.
- When the current video is not yet inside any local folders, the existing-folder summary block is hidden rather than replaced with a placeholder sentence.

### 3. Remember the last successful folder selection

- After a successful save, persist the submitted folder id list to local extension storage.
- On the next open, automatically preselect those remembered folders after filtering out deleted or missing ids.
- The remembered selection is applied for both button-open and shortcut-open flows.
- Remembered selection does not override the “already exists in these folders” summary; the summary remains informational only.

### 4. Enter confirms save

- When the centered collector modal is open, `Enter` triggers save directly.
- `Esc` closes the topmost collector surface.
- If the create-folder modal is open, `Enter` keeps its current create-folder submit behavior instead of saving the video.
- If the user is currently composing text with an IME, `Enter` must not accidentally trigger save.

### 5. Original collector capabilities stay intact

- Keep folder search.
- Keep new-folder creation.
- Keep multi-select folder list.
- Keep custom tags.
- Keep existing-folder summary when the current video is already saved somewhere.
- Keep current save-result toast behavior.

## Chosen Architecture

### Single source of truth for modal state

The collector should use one modal state and one folder-selection state:

- `selectedFolderIds` remains the only active selection set.
- Remove the separate quick-favorite-only selection state and active-row state.
- Introduce one shared open path for button and shortcut entry.

### Shared modal open flow

Add one modal-open routine that:

1. opens the centered collector modal
2. loads current video and folders
3. restores remembered folder selections
4. focuses the folder search field

This keeps the entry logic identical regardless of whether the user came from the floating button or keyboard shortcut.

### Small storage-backed memory helper

Folder-selection memory should be extracted into a tiny helper module instead of being embedded in ad-hoc content-script logic. The helper will:

- normalize stored remembered folder ids
- filter them against the current folder list
- preserve current folder ordering

This gives the behavior a focused unit-test surface and keeps `content.js` from getting even more procedural.

## Rendering and Layout

### Collector shell

- The collector should render as a centered modal panel inside the existing floating root.
- Add a backdrop so the collector feels focused like the current quick-favorite overlay.
- Keep the richer card structure of the original collector instead of the mini-panel layout.

### Content layout

- Keep the original information blocks and controls.
- Adjust spacing so the original collector content still fits comfortably within a centered modal.
- Reuse the existing create-folder modal as a nested surface on top of the collector.

## Keyboard and Input Behavior

### Supported keys

- `Esc`: close create-folder modal first, otherwise close collector modal.
- `Enter`: submit create-folder modal when it is open; otherwise save the current video from the collector modal.

### Safety guards

- Do not save on `Enter` when `event.isComposing` is true.
- Do not intercept `Enter` in a way that breaks the current create-folder text input flow.

## Error Handling

- If current video data cannot be resolved, keep the existing save failure handling and toasts.
- If remembered folder ids are stale, silently drop the missing ids and continue.
- If save fails, do not overwrite the remembered selection.

## Testing Strategy

### Unit coverage

- Add tests for remembered folder id normalization and filtering.

### Content-script regression coverage

- Assert the dedicated quick-favorite layer is removed.
- Assert the collector subtitle copy is removed.
- Assert the empty existing-folder placeholder copy is removed.
- Assert shortcut entry now routes through the unified collector modal flow.
- Assert remembered folder selection storage is wired.
- Assert `Enter` submission is handled by the unified collector modal flow.

### Verification

- Run focused extension tests for the collector, shortcut, and helper logic.
- Run the full extension test suite.
- Run `pnpm --dir extension run build:all`.
