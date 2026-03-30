# UI Visible Polish Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the remaining user-visible duplicated helper UI and normalize popup action-button styling without changing behavior.

**Architecture:** This is a front-end-only cleanup across the extension popup and three Vue dialogs. The work stays behavior-preserving: add failing regression tests first, make the smallest markup/CSS/template changes needed, then run focused and full verification.

**Tech Stack:** Vue 3 SFCs, Node test runner, plain extension HTML/CSS/JS, TypeScript checks, WXT build

---

### Task 1: Document the visible UI cleanup boundaries

**Files:**
- Create: `docs/plans/2026-03-30-ui-visible-polish-cleanup-design.md`
- Create: `docs/plans/2026-03-30-ui-visible-polish-cleanup.md`

**Step 1: Write the design and plan documents**

Write the approved scope:

- popup action buttons get unified styling/layout only
- remove duplicated helper block from `frontend/src/components/dialogs/WebDavBackupDialog.vue`
- remove duplicated helper block from `frontend/src/components/dialogs/BidirectionalSyncSettingsDialog.vue`
- remove Stage 2 tag-enrichment section from `frontend/src/components/dialogs/SyncImportDialog.vue`

**Step 2: Commit the docs**

Run:

```bash
git add -f docs/plans/2026-03-30-ui-visible-polish-cleanup-design.md docs/plans/2026-03-30-ui-visible-polish-cleanup.md
git commit -m "docs: add ui visible polish cleanup plan"
```

### Task 2: Add popup regression coverage first

**Files:**
- Modify: `extension/tests/popup-shortcut-ui.test.mjs`
- Modify: `extension/entrypoints/popup.html`
- Modify: `extension/popup.css`

**Step 1: Write the failing test**

Extend the popup test so it asserts:

- shortcut actions use a shared popup action-row wrapper
- all three shortcut buttons use a shared popup button base class
- the footer actions use the same popup button system
- the popup no longer relies on the old mixed `primary-btn` / `secondary-btn` / `ghost-btn` trio for those visible actions

**Step 2: Run test to verify it fails**

Run:

```bash
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: FAIL because the popup still uses the old button classes and layout.

**Step 3: Write minimal implementation**

Update `extension/entrypoints/popup.html` and `extension/popup.css` to:

- introduce one shared popup action button base class
- keep per-button emphasis through modifier classes instead of unrelated base classes
- use a consistent grid/flex layout for shortcut actions and footer actions
- preserve all existing element IDs for JS behavior

**Step 4: Run test to verify it passes**

Run:

```bash
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add extension/tests/popup-shortcut-ui.test.mjs extension/entrypoints/popup.html extension/popup.css
git commit -m "refactor: polish popup action button layout"
```

### Task 3: Add manager dialog cleanup regression coverage first

**Files:**
- Modify: `frontend/tests/ui-layout-regressions.test.mjs`
- Modify: `frontend/src/components/dialogs/WebDavBackupDialog.vue`
- Modify: `frontend/src/components/dialogs/BidirectionalSyncSettingsDialog.vue`
- Modify: `frontend/src/components/dialogs/SyncImportDialog.vue`

**Step 1: Write the failing tests**

Extend `frontend/tests/ui-layout-regressions.test.mjs` so it asserts:

- `WebDavBackupDialog.vue` no longer renders the fallback `t("webdav.desc")` helper line inside the status card
- `BidirectionalSyncSettingsDialog.vue` no longer renders the lower duplicated helper card
- `SyncImportDialog.vue` no longer renders:
  - `sync.tagEnrichTitle`
  - `sync.reloadTagEnrich`
  - `sync.pauseTagEnrich`
  - `sync.resumeTagEnrich`
  - `sync.runTagEnrichNow`
  - `sync.tagEnrichStatus`
  - `sync.tagEnrichDisabledHint`

**Step 2: Run test to verify it fails**

Run:

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
```

Expected: FAIL because those duplicated sections are still rendered.

**Step 3: Write minimal implementation**

Update the three dialog components:

- in `WebDavBackupDialog.vue`, keep timestamps and error display, remove the non-error duplicated helper row
- in `BidirectionalSyncSettingsDialog.vue`, remove the bottom helper card and any now-unused icon import
- in `SyncImportDialog.vue`, remove the embedded Stage 2 tag-enrichment section and any now-unused props/emits/icon imports

Keep dialog structure, submit buttons, and core sync picker behavior intact.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/tests/ui-layout-regressions.test.mjs frontend/src/components/dialogs/WebDavBackupDialog.vue frontend/src/components/dialogs/BidirectionalSyncSettingsDialog.vue frontend/src/components/dialogs/SyncImportDialog.vue
git commit -m "refactor: remove duplicated dialog helper panels"
```

### Task 4: Run full verification on the isolated branch

**Files:**
- Modify: `frontend/src/components/dialogs/WebDavBackupDialog.vue`
- Modify: `frontend/src/components/dialogs/BidirectionalSyncSettingsDialog.vue`
- Modify: `frontend/src/components/dialogs/SyncImportDialog.vue`
- Modify: `frontend/tests/ui-layout-regressions.test.mjs`
- Modify: `extension/entrypoints/popup.html`
- Modify: `extension/popup.css`
- Modify: `extension/tests/popup-shortcut-ui.test.mjs`

**Step 1: Run focused tests**

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: PASS

**Step 2: Run broader project verification**

```bash
node --test (Get-ChildItem frontend/tests/*.test.mjs | ForEach-Object { $_.FullName })
node --test (Get-ChildItem extension/tests/*.test.mjs | ForEach-Object { $_.FullName })
pnpm --dir frontend run check
pnpm --dir extension run build:all
```

Expected:

- frontend tests all pass
- extension tests all pass
- `vue-tsc --noEmit` passes
- extension build for Chrome / Edge / Firefox succeeds

**Step 3: Commit**

```bash
git add frontend extension
git commit -m "refactor: clean visible popup and dialog residue"
```
