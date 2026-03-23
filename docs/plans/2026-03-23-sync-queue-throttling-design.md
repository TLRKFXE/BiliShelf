# Sync Queue And Throttling Design

**Date:** 2026-03-23

**Status:** Approved

## Goal

Improve Bilibili favorites sync for large libraries by:

- adding `全选` / `清空` controls to both sync folder pickers
- making the serial queue behavior explicit in the UI
- replacing the misleading chunk-size control with copy that matches real behavior
- introducing adaptive, risk-aware pacing in the extension runtime without adding any backend service

## Product Direction

### Unified Folder Selection UX

Both folder-selection surfaces should behave the same:

- manual sync dialog
- initial auto-init dialog

Each dialog should provide:

- `全选`
- `清空`
- selected folder count
- selected video count
- a short explanation that selected folders are queued and synced one by one

The controls should work on the currently loaded folder list, while still allowing manual deselection of individual folders afterwards.

### Stable Queue Ordering

The actual sync order should be deterministic and follow the folder list order shown in the UI rather than checkbox click order.

That means:

- `全选` queues folders in the same order as the current folder list
- manual multi-select is normalized into the current folder list order before sync starts
- the runtime still syncs one folder at a time

This keeps progress understandable for the user and avoids surprising queue reordering.

### Remove Misleading Chunk-Size UI

The current `每批导入数量` control does not drive the real sync engine, so it creates false expectations.

It should be removed and replaced with copy that reflects the real behavior:

- one folder at a time
- multiple pages are fetched gradually
- the extension adjusts wait times automatically to reduce risk-control probability

## Runtime Sync Strategy

### Keep Serial Processing

The current history-model sync path already processes folders serially. That behavior should stay unchanged.

The approved improvement is not to redesign sync as parallel work. It is to make the existing queue behavior visible and safer.

### Adaptive Throttling

Replace the fixed pacing constants with a small pure helper that derives waits from runtime context.

Signals to consider:

- current folder size
- page number within the current folder
- videos already scanned in the current folder
- total videos scanned in the current run
- recent slow-response streak
- folder transition boundaries

The pacing policy should follow these principles:

- small folders can start slightly faster
- large folders back off earlier and wait longer between pages
- slow page responses increase the next wait
- moving from one folder to the next adds a short transition delay
- longer cooldowns still happen periodically, but are based on runtime context instead of one hardcoded `400 videos -> 30s`

### Risk-Control Handling

The existing `412` / risk-control handling remains the safety boundary:

- stop immediately on detected risk-control
- preserve `resumePageByFolder`
- preserve the remaining folder queue through the existing auto-init state
- allow later resume instead of rescanning from the beginning

The new pacing is meant to reduce probability, not to promise complete avoidance.

## Implementation Shape

### Frontend

Add a small selection helper that can be reused by both dialogs and by `App.vue` queue startup logic.

Recommended file:

- `frontend/src/lib/sync-folder-selection.js`

Responsibilities:

- toggle one folder selection
- select all current folders
- clear selection
- normalize selected ids into current folder-list order
- estimate selected video counts

### Extension

Extract pacing rules into a pure helper that can be unit-tested independently from the WXT background runtime.

Recommended file:

- `extension/shared/favorites-sync-throttle.js`

Responsibilities:

- compute next page gap
- compute inter-folder transition delay
- compute long cooldown thresholds and durations
- track slow-response influence

`extension/entrypoints/background.ts` should consume the helper and keep the sync loop behavior otherwise unchanged.

## Testing

### Frontend

- helper tests for select-all, clear-all, stable ordering, and selected video counting
- source/layout regression tests confirming both dialogs expose bulk-selection controls
- source/layout regression tests confirming the chunk-size UI copy is removed
- `vue-tsc` check

### Extension

- throttle helper unit tests for small-folder vs large-folder pacing
- throttle helper unit tests for slow-response backoff
- source regression test confirming the background sync path imports the throttle helper instead of relying on the old fixed constants
- full extension test suite
- extension type-check and build

## Success Criteria

- users can bulk-select folders in both sync dialogs
- selected folders are synced in a predictable serial queue
- the sync dialog no longer implies a fake chunk-size control
- the extension pacing adapts to folder size and observed slowness
- `412` risk-control still preserves resume progress cleanly
- no backend service is introduced or required
