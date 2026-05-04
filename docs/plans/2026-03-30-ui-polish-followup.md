# UI Polish Follow-up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the remaining manager button hierarchy issue and popup shortcut/toast polish issues without changing core behavior.

**Architecture:** This pass adds focused regression coverage first, then applies a small manager-header style adjustment and extracts popup helper logic for modifier-key filtering and toast dedupe. The popup remains plain HTML/CSS/JS rather than being migrated to Vue.

**Tech Stack:** Vue 3 SFCs, Node test runner, plain extension HTML/CSS/JS, WXT build

---

### Task 1: Document the follow-up polish scope

**Files:**
- Create: `docs/plans/2026-03-30-ui-polish-followup-design.md`
- Create: `docs/plans/2026-03-30-ui-polish-followup.md`

**Step 1: Write the approved design and plan**

Capture:

- manager second-row buttons become peer-level non-primary actions
- popup recording ignores pure modifier keydown events
- popup toast styling becomes stronger and duplicate-aware

**Step 2: Commit**

```bash
git add -f docs/plans/2026-03-30-ui-polish-followup-design.md docs/plans/2026-03-30-ui-polish-followup.md
git commit -m "docs: add ui polish follow-up plan"
```

### Task 2: Add failing tests for manager header hierarchy

**Files:**
- Modify: `frontend/tests/ui-layout-regressions.test.mjs`
- Modify: `frontend/src/components/layout/ManagerHeader.vue`

**Step 1: Write the failing test**

Assert that:

- both manager action rows use the tightened grid gap
- the `sync-import` button uses `variant="outline"`
- shared row button classes stay consistent

**Step 2: Run test to verify it fails**

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
```

Expected: FAIL because the current manager header still renders `Sync Import` as the implicit primary button and uses the old grid gap.

**Step 3: Write minimal implementation**

Update `ManagerHeader.vue` to:

- make both action rows use the tightened gap
- make `Sync Import` explicitly `outline`
- keep all button labels and actions unchanged

**Step 4: Run test to verify it passes**

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
```

Expected: PASS

### Task 3: Add failing tests for popup recording and toast behavior

**Files:**
- Create: `extension/utils/popup-feedback.js`
- Create: `extension/tests/popup-feedback.test.mjs`
- Modify: `extension/tests/popup-shortcut-ui.test.mjs`
- Modify: `extension/popup.js`
- Modify: `extension/popup.css`

**Step 1: Write the failing tests**

Add tests that assert:

- pure modifier events are treated as incomplete recording steps
- duplicate identical toasts are suppressed inside a short dedupe window
- popup script wires the modifier guard and toast gate helpers
- popup CSS includes an explicit `info` toast style and no longer uses the old weak translucent toast fills

**Step 2: Run tests to verify they fail**

```bash
node --test .\extension\tests\popup-feedback.test.mjs
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: FAIL because the helper module does not exist yet and popup still validates modifier-only events directly.

**Step 3: Write minimal implementation**

Implement:

- a popup helper module for modifier-only detection and toast dedupe
- popup script changes that ignore modifier-only keydown events and use the dedupe gate
- stronger popup toast card styles for success / info / error

**Step 4: Run tests to verify they pass**

```bash
node --test .\extension\tests\popup-feedback.test.mjs
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: PASS

### Task 4: Run full verification and commit

**Files:**
- Modify: `frontend/src/components/layout/ManagerHeader.vue`
- Modify: `frontend/tests/ui-layout-regressions.test.mjs`
- Create: `extension/utils/popup-feedback.js`
- Create: `extension/tests/popup-feedback.test.mjs`
- Modify: `extension/tests/popup-shortcut-ui.test.mjs`
- Modify: `extension/popup.js`
- Modify: `extension/popup.css`

**Step 1: Run focused verification**

```bash
node --test .\frontend\tests\ui-layout-regressions.test.mjs
node --test .\extension\tests\popup-feedback.test.mjs
node --test .\extension\tests\popup-shortcut-ui.test.mjs
```

Expected: PASS

**Step 2: Run broader verification**

```bash
node --test (Get-ChildItem frontend/tests/*.test.mjs | ForEach-Object { $_.FullName })
node --test (Get-ChildItem extension/tests/*.test.mjs | ForEach-Object { $_.FullName })
pnpm --dir frontend run check
pnpm --dir extension run build:all
```

Expected:

- frontend tests all pass
- extension tests all pass
- type check passes
- full extension build passes

**Step 3: Commit**

```bash
git add frontend extension
git commit -m "refactor: polish manager buttons and popup toast behavior"
```
