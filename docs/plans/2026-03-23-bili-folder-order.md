# Bilibili Folder Order Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make synced local folders follow the current Bilibili folder order instead of preserving stale reversed remote folder positions.

**Architecture:** Extract a small pure helper that rewrites `sortOrder` for local folders linked by `remoteMediaId`, based on the current remote folder list. Call it from the favorites sync flow after remote folders are loaded so old imports are repaired automatically while local-only folders remain stable.

**Tech Stack:** TypeScript background entrypoint, Node test runner, WXT extension build

---

### Task 1: Add a reorder helper test

**Files:**
- Create: `extension/tests/remote-folder-order.test.mjs`
- Create: `extension/shared/remote-folder-order.js`
- Create: `extension/shared/remote-folder-order.d.ts`

**Step 1: Write the failing test**

Add a test that starts with:
- one local-only folder at `sortOrder = 1`
- three remote-linked folders in reversed local order
- one remote folder missing locally

Expect:
- remote-linked local folders are reassigned to the current remote order
- the local-only folder keeps its relative position after the remote-linked block

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/remote-folder-order.test.mjs`
Expected: FAIL because the helper module does not exist yet

**Step 3: Write minimal implementation**

Implement a pure helper that:
- reads active local folders with `remoteMediaId`
- orders them by current Bilibili remote folder ids
- rewrites `sortOrder` sequentially
- appends untouched local-only folders after the remote-linked set while preserving their relative order

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/remote-folder-order.test.mjs`
Expected: PASS

### Task 2: Wire the helper into sync

**Files:**
- Modify: `extension/entrypoints/background.ts`

**Step 1: Write the failing integration-facing test expectation**

Use the helper test from Task 1 as the contract for sync ordering behavior, then add a small source-level or focused behavior assertion only if needed.

**Step 2: Implement the minimal sync change**

After remote folders are loaded for favorites sync, call the helper before per-folder media syncing starts so existing linked folders get corrected immediately.

**Step 3: Run focused tests**

Run: `node --test extension/tests/remote-folder-order.test.mjs`
Expected: PASS

### Task 3: Verify end to end

**Files:**
- Verify only

**Step 1: Run extension test suite**

Run: `node --test extension/tests/*.test.mjs`
Expected: PASS

**Step 2: Run type check**

Run: `pnpm --dir extension exec wxt prepare`
Expected: PASS

Run: `pnpm --dir extension exec tsc --noEmit`
Expected: PASS

**Step 3: Run build**

Run: `pnpm --dir extension run build:all`
Expected: PASS
