# UI Visible Residue Cleanup Design

**Date:** 2026-03-30

## Goal

Clean only the user-visible AI-related UI residue that still appears in the manager, without removing backend/runtime compatibility or stored AI data fields.

## Scope

### In Scope

- Remove the AI information block from the video detail dialog when viewing a video.
- Remove front-end template bindings and props that only exist to support currently visible AI UI entry points, when those bindings are no longer needed after the visible cleanup.
- Keep playback UI intact.
- Keep all non-UI AI data compatibility intact.

### Out of Scope

- Removing AI routes, API helpers, storage schema, or background runtime behavior.
- Deleting hidden AI code paths that are not user-visible in the current product.
- Reworking the overall manager layout or unrelated dialogs.

## Current Visible Residue

### Video Detail Dialog

`frontend/src/components/dialogs/VideoDetailDialog.vue` still renders a dedicated AI classification summary block when `detailVideo.aiAnalysis` exists. This is a user-visible leftover because AI categorization is currently disabled as a feature direction, but the detail panel still surfaces prior AI metadata.

### Manager Wiring

`frontend/src/App.vue` and `frontend/src/components/FolderSidebar.vue` still carry AI-oriented props/events for the sidebar and AI settings dialog. Most of these are currently hidden behind `AI_CATEGORIES_ENABLED`, but the visible-cleanup pass should also remove any template wiring that becomes unnecessary once the remaining visible residue is removed.

## Design Decisions

### 1. Prefer Compatibility Over Deletion

We will not remove `aiAnalysis` from shared video types or API payload handling. Existing stored data may still contain these fields, and keeping them avoids accidental regression in import/export or legacy data display paths.

### 2. Remove Presentation, Not Data

The cleanup will target rendered UI only. Data may still exist in memory or payloads, but users should no longer see AI-specific presentation in the currently accessible manager flow.

### 3. Minimal Frontend Surface Change

We will update only the components directly involved in visible rendering:

- `frontend/src/components/dialogs/VideoDetailDialog.vue`
- `frontend/src/App.vue`
- `frontend/src/components/FolderSidebar.vue` if visible-only cleanup makes some props/events unnecessary
- relevant front-end tests

## Testing Strategy

- Add or update a front-end regression test proving that the video detail dialog no longer renders the AI section.
- Keep existing playback sidebar coverage passing.
- Run `frontend/tests` and `pnpm --dir frontend run check`.
- If the UI cleanup touches manager build wiring, also run `pnpm --dir extension run build:all`.

## Success Criteria

- Users no longer see AI classification information in the current accessible manager UI.
- Playback entry points remain intact.
- Front-end tests and type checking pass.
- No backend/runtime AI behavior is added or broadened.
