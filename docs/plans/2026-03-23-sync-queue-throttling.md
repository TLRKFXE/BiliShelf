# Sync Queue And Throttling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bulk folder selection for sync, make serial queue behavior explicit, and replace fixed sync pacing with adaptive throttling in the extension runtime.

**Architecture:** The frontend keeps using the extension-local history-model sync flow, but both folder pickers are refactored to share a small pure selection helper and stable queue ordering. The extension background sync loop remains serial per folder, while a new pure throttle helper decides page gaps, inter-folder delays, and cooldowns based on folder size and observed response slowness.

**Tech Stack:** Node.js, pnpm, Vue 3, WXT, TypeScript, Node test runner

---

### Task 1: Add failing frontend tests for bulk selection and queue UX

**Files:**
- Create: `frontend/tests/sync-folder-selection.test.mjs`
- Modify: `frontend/tests/ui-layout-regressions.test.mjs`

**Step 1: Write the failing test**

- add a pure helper test for:
  - selecting all remote folder ids from the loaded list
  - clearing the selection
  - toggling one folder on and off without duplicates
  - normalizing selected folder ids to the current folder-list order
  - estimating selected video counts from the selected folders
- extend UI regression coverage so:
  - `SyncImportDialog.vue` includes `t("common.selectAll")`
  - `AutoInitSetupDialog.vue` includes `t("common.selectAll")`
  - `SyncImportDialog.vue` no longer includes `sync.chunkSizeTitle`
  - `SyncImportDialog.vue` no longer includes `sync.autoChunkHint`

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/tests/sync-folder-selection.test.mjs frontend/tests/ui-layout-regressions.test.mjs
```

Expected:

- FAIL because the new helper does not exist yet
- FAIL because the dialogs do not expose bulk selection controls yet
- FAIL because the manual sync dialog still renders chunk-size copy

### Task 2: Implement frontend bulk-selection helpers and dialog wiring

**Files:**
- Create: `frontend/src/lib/sync-folder-selection.js`
- Create: `frontend/src/lib/sync-folder-selection.d.ts`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/dialogs/SyncImportDialog.vue`
- Modify: `frontend/src/components/dialogs/AutoInitSetupDialog.vue`
- Modify: `frontend/src/lib/manager-i18n.ts`

**Step 1: Write minimal implementation**

- add reusable helper functions for:
  - selecting all current folders
  - clearing all current folders
  - toggling a single folder
  - ordering selected ids by the visible folder list
  - estimating selected video totals
- wire both dialogs to expose `全选` and `清空`
- remove the unused chunk-size prop, select UI, and obsolete local state from `App.vue`
- replace the old chunk-size copy with queue-focused copy that explains serial folder sync and automatic pacing
- normalize selected folder ids into folder-list order before `startUnifiedFavoritesSync(...)` writes auto-init state

**Step 2: Run focused tests**

Run:

```bash
node --test frontend/tests/sync-folder-selection.test.mjs frontend/tests/ui-layout-regressions.test.mjs
pnpm --dir frontend check
```

Expected:

- PASS

### Task 3: Add failing extension tests for adaptive sync throttling

**Files:**
- Create: `extension/tests/favorites-sync-throttle.test.mjs`

**Step 1: Write the failing test**

- add pure helper tests covering:
  - small folders get shorter page gaps than very large folders
  - repeated slow responses increase the next page gap
  - folder transitions add a non-zero inter-folder delay
  - long cooldown thresholds/durations scale with runtime context rather than one fixed threshold
- add a source regression assertion that `extension/entrypoints/background.ts` imports the new throttle helper and no longer depends on the old fixed favorites pacing constants for its main loop behavior

**Step 2: Run test to verify it fails**

Run:

```bash
node --test extension/tests/favorites-sync-throttle.test.mjs
```

Expected:

- FAIL because the throttle helper does not exist yet
- FAIL because the background entrypoint has not been migrated yet

### Task 4: Implement adaptive throttle helper and integrate it into background sync

**Files:**
- Create: `extension/shared/favorites-sync-throttle.js`
- Create: `extension/shared/favorites-sync-throttle.d.ts`
- Modify: `extension/entrypoints/background.ts`

**Step 1: Write minimal implementation**

- extract a pure throttle helper that can:
  - create and update sync pacing state
  - resolve next page gap from folder size, page count, and recent slow responses
  - resolve inter-folder transition delay
  - resolve periodic cooldown threshold and cooldown duration
- update the favorites sync loop to:
  - keep folders serial
  - measure page fetch duration
  - ask the helper for page-gap / folder-gap / cooldown decisions
  - preserve resume cursors and stop immediately on risk-control just as before
- keep the API contract unchanged for the frontend

**Step 2: Run focused tests**

Run:

```bash
node --test extension/tests/favorites-sync-throttle.test.mjs
pnpm --dir extension exec wxt prepare
pnpm --dir extension exec tsc --noEmit
```

Expected:

- PASS

### Task 5: Run full verification and packaging build

**Files:**
- No source changes expected

**Step 1: Run verification**

Run:

```bash
node --test frontend/tests/*.test.mjs
pnpm --dir frontend check
node --test extension/tests/*.test.mjs
pnpm --dir extension exec wxt prepare
pnpm --dir extension exec tsc --noEmit
pnpm --dir extension run build:all
```

Expected:

- all frontend tests pass
- frontend type-check passes
- all extension tests pass
- extension type-check passes
- chrome / edge / firefox builds all succeed
