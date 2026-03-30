# UI Visible Residue Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the currently visible AI-related UI residue from the manager while preserving playback UI and AI data compatibility.

**Architecture:** This is a front-end-only cleanup. We will remove the rendered AI presentation from the video detail dialog first, then trim any now-unused visible UI bindings in the manager shell/sidebar, and finally verify that the existing playback entry points still render correctly. We will not change backend contracts or stored data fields.

**Tech Stack:** Vue 3 SFCs, TypeScript, Vitest-style node tests, `vue-tsc`

---

### Task 1: Remove AI Presentation From Video Detail Dialog

**Files:**
- Modify: `frontend/src/components/dialogs/VideoDetailDialog.vue`
- Test: `frontend/tests/ui-visible-residue-cleanup.test.mjs`

**Step 1: Write the failing test**

Add a regression test asserting that the video detail dialog source no longer renders the AI detail block or AI-specific translated detail keys.

**Step 2: Run test to verify it fails**

Run: `node --test .\frontend\tests\ui-visible-residue-cleanup.test.mjs`
Expected: FAIL because the dialog still contains the AI detail section.

**Step 3: Write minimal implementation**

Remove the `detailAiAnalysis` computed usage and the rendered AI summary block from `VideoDetailDialog.vue`, keeping the rest of the detail dialog unchanged.

**Step 4: Run test to verify it passes**

Run: `node --test .\frontend\tests\ui-visible-residue-cleanup.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/dialogs/VideoDetailDialog.vue frontend/tests/ui-visible-residue-cleanup.test.mjs
git commit -m "refactor: remove visible ai detail residue"
```

### Task 2: Trim Manager-Level Visible AI UI Wiring

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/FolderSidebar.vue`
- Test: `frontend/tests/ui-visible-residue-cleanup.test.mjs`

**Step 1: Write the failing test**

Extend the cleanup regression test to assert that manager-visible AI action wiring is not rendered as an active user-facing block beyond the currently retained playback section.

**Step 2: Run test to verify it fails**

Run: `node --test .\frontend\tests\ui-visible-residue-cleanup.test.mjs`
Expected: FAIL because the current sources still include visible AI sidebar/action wiring.

**Step 3: Write minimal implementation**

Remove only the now-unnecessary visible AI UI props/events/template bindings from `App.vue` and `FolderSidebar.vue`, while preserving playback props/events and avoiding changes to hidden compatibility paths that are not user-visible.

**Step 4: Run test to verify it passes**

Run: `node --test .\frontend\tests\ui-visible-residue-cleanup.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/App.vue frontend/src/components/FolderSidebar.vue frontend/tests/ui-visible-residue-cleanup.test.mjs
git commit -m "refactor: trim visible ai ui wiring"
```

### Task 3: Verify Frontend and Build Integration

**Files:**
- Test: `frontend/tests/ui-visible-residue-cleanup.test.mjs`
- Verify: `frontend/tests/*.test.mjs`
- Verify: frontend type check
- Verify: extension build

**Step 1: Run targeted cleanup regression**

Run: `node --test .\frontend\tests\ui-visible-residue-cleanup.test.mjs`
Expected: PASS

**Step 2: Run full frontend tests**

Run: `node --test (Get-ChildItem frontend/tests/*.test.mjs | ForEach-Object { $_.FullName })`
Expected: All PASS

**Step 3: Run type checking**

Run: `pnpm --dir frontend run check`
Expected: PASS

**Step 4: Run extension build verification**

Run: `pnpm --dir extension run build:all`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/tests/ui-visible-residue-cleanup.test.mjs frontend/src/App.vue frontend/src/components/FolderSidebar.vue frontend/src/components/dialogs/VideoDetailDialog.vue
git commit -m "test: verify visible ui residue cleanup"
```
