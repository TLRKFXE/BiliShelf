# Export Partition And Folder Count Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist video partition information and export both `partition` and `folderCount` so the export table reflects real Bilibili metadata and duplicate folder membership.

**Architecture:** Extract a small shared export helper that computes per-video export metadata from local state, including folder names, folder count, latest favorite time, and tags. Extend the local video model with a persisted `partition` field, then wire sync/import/manual update paths to keep it filled.

**Tech Stack:** TypeScript background entrypoint, Node test runner, WXT extension build

---

### Task 1: Add export metadata tests

**Files:**
- Create: `extension/shared/export-video-metadata.js`
- Create: `extension/shared/export-video-metadata.d.ts`
- Create: `extension/tests/export-video-metadata.test.mjs`

**Step 1: Write the failing test**

Add a test that builds a tiny local state with:
- one video having `partition: "音乐"`
- two active folder links for the same video
- one custom tag and one system tag

Expect the helper to return:
- `partition` as `"音乐"`
- `folderCount` as `2`
- folder names aggregated once
- latest favorite timestamp as the max linked `addedAt`

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/export-video-metadata.test.mjs`
Expected: FAIL because the helper module does not exist yet

**Step 3: Write minimal implementation**

Implement a pure helper that derives:
- `folderNamesByVideo`
- `folderCountByVideo`
- `latestAddedAtByVideo`
- `customTagsByVideo`
- `systemTagsByVideo`

and a helper that builds export-ready per-video metadata including `partition`.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/export-video-metadata.test.mjs`
Expected: PASS

### Task 2: Persist partition in local videos

**Files:**
- Modify: `extension/entrypoints/background.ts`
- Modify: `frontend/src/types.ts`

**Step 1: Write the failing test contract**

Use the export metadata test as the behavior contract, then extend the background code so `partition` is actually stored and exported instead of being dropped.

**Step 2: Implement minimal storage changes**

Update the local video model and normalization paths so `partition` is preserved across:
- Bilibili sync media rows
- remote detail upsert
- import rows
- manual create / patch flows

**Step 3: Reuse the export helper**

Replace the inline export aggregation logic with the shared helper and add `folderCount` to both JSON and CSV export outputs.

**Step 4: Run focused tests**

Run: `node --test extension/tests/export-video-metadata.test.mjs`
Expected: PASS

### Task 3: Verify the feature

**Files:**
- Verify only

**Step 1: Run extension tests**

Run: `node --test extension/tests/*.test.mjs`
Expected: PASS

**Step 2: Run WXT prepare**

Run: `pnpm --dir extension exec wxt prepare`
Expected: PASS

**Step 3: Run TypeScript check**

Run from `extension/`: `.\node_modules\.bin\tsc --noEmit -p tsconfig.json`
Expected: PASS

**Step 4: Run build**

Run: `pnpm --dir extension run build:all`
Expected: PASS
