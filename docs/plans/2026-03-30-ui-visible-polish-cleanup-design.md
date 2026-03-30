# UI Visible Polish Cleanup Design

**Date:** 2026-03-30

## Goal

Clean up the remaining user-visible UI rough edges in the popup and manager dialogs without changing sync behavior, data flow, or any backend/runtime capability.

## Scope

This pass only covers the four issues reported from screenshots:

1. Popup button styling and layout feel visually inconsistent.
2. WebDAV dialog shows a duplicated helper/status message block.
3. Bilibili action sync dialog shows a duplicated helper/status message block.
4. Sync import dialog still shows the Stage 2 background tag-enrichment control panel, which competes with the existing outer tag-enrichment entry and adds noise.

Out of scope:

- Any sync logic changes
- Any WebDAV logic changes
- Any action-sync behavior changes
- Any AI behavior changes
- Any playback UI changes
- Any backend changes

## Current Problems

### Popup

The popup mixes three button visual systems in one card stack:

- theme chips
- shortcut action buttons
- footer navigation buttons

The shortcut row currently uses `primary`, `secondary`, and `ghost` styles side by side, while the bottom row uses a different balance and spacing. The result feels visually uneven, especially in Chinese where button copy widths vary more.

### WebDAV Dialog

`WebDavBackupDialog.vue` already explains the feature in the dialog description and in the enable-card description. The status panel repeats the same copy again when there is no error, so the panel spends vertical space on text that adds no new decision-making value.

### Action Sync Dialog

`BidirectionalSyncSettingsDialog.vue` has the same duplication pattern: the dialog description explains the feature, then a bottom info box repeats that explanation almost verbatim.

### Sync Import Dialog

`SyncImportDialog.vue` currently mixes two concerns:

- selecting folders for the primary sync
- operating Stage 2 tag-enrichment controls

The user already has tag-enrichment controls elsewhere, so keeping the Stage 2 control panel here creates competition for attention and makes the folder picker feel heavier than necessary.

## Chosen Approach

### 1. Popup: unify buttons into one visual system

Keep the existing structure, but make the action rows feel intentional:

- use a shared base button style for popup actions
- keep one clear primary emphasis per row
- keep secondary actions visually related instead of mixing three unrelated surfaces
- use a stable grid layout so Chinese labels wrap less awkwardly

This is a CSS/markup cleanup only. No shortcut behavior or popup JS logic changes are needed.

### 2. WebDAV dialog: remove duplicated passive helper block

Keep the status timestamps and error display.
Remove the fallback “safe/info” line that only repeats the dialog description.

This keeps the status card useful because it only shows actual status data or errors.

### 3. Action sync dialog: remove duplicated helper block

Keep the main toggle card and footer actions.
Remove the lower informational card that repeats the dialog description.

This makes the dialog shorter and keeps the toggle as the only focal point.

### 4. Sync import dialog: make it single-purpose again

Keep:

- selected count badges
- reload folders
- select all / clear
- queue hint
- folder list
- cancel / start sync

Remove:

- Stage 2 tag-enrichment status block
- refresh/pause/resume/run buttons inside this dialog
- the extra hint line about Stage 2 auto-enrichment

The sync picker should focus on choosing folders and starting sync. Tag enrichment stays available from the dedicated external entry point.

## Testing Strategy

Add regression tests before implementation:

- popup HTML/CSS test asserts action rows and button classes are normalized
- manager dialog regression test asserts:
  - WebDAV dialog no longer renders the duplicated fallback helper line
  - action sync dialog no longer renders the duplicated helper block
  - sync import dialog no longer renders Stage 2 tag-enrichment controls

Then run the affected targeted tests first, followed by broader frontend/extension verification.

## Risks

### Risk: over-cleaning strings that are still used elsewhere

Mitigation:

- remove only rendered residue from the target components first
- only delete translation keys if search confirms they are now unused

### Risk: popup button refactor accidentally changes behavior

Mitigation:

- do not touch popup event wiring
- keep the same element IDs used by tests and JS hooks

### Risk: sync import dialog loses important status visibility

Mitigation:

- only remove the embedded Stage 2 controls because the user explicitly wants that section gone and there is already another entry point for tag enrichment
- keep all primary sync selection and queue-status cues
