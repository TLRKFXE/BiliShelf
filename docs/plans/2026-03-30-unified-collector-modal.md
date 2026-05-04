# Unified Collector Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the duplicate quick-favorite mini panel with a single centered full collector modal that remembers the last successful folder selection and supports `Enter` to save.

**Architecture:** The content script keeps one collector modal and one active folder selection state. The floating button and shortcut both route through the same modal-open path, while remembered folder selection is extracted into a tiny storage helper so it can be unit-tested independently of the DOM-heavy content script.

**Tech Stack:** Plain extension content script, browser storage, Node test runner, WXT build

---

### Task 1: Capture the approved design and implementation handoff

**Files:**
- Create: `docs/plans/2026-03-30-unified-collector-modal-design.md`
- Create: `docs/plans/2026-03-30-unified-collector-modal.md`

**Step 1: Write the approved design and plan**

Capture:

- unified centered collector modal
- removed subtitle and empty existing-folder placeholder copy
- remembered folder selection behavior
- `Enter` submit behavior
- removal of the dedicated quick-favorite mini panel

**Step 2: Commit docs**

```bash
git add -f docs/plans/2026-03-30-unified-collector-modal-design.md docs/plans/2026-03-30-unified-collector-modal.md
git commit -m "docs: plan unified collector modal"
```

### Task 2: Add failing tests for remembered folder selection helpers

**Files:**
- Create: `extension/utils/collector-folder-memory.js`
- Create: `extension/tests/collector-folder-memory.test.mjs`

**Step 1: Write the failing test**

Add tests that assert:

- remembered folder ids are normalized to positive integer ids only
- duplicates are removed
- missing folder ids are filtered out
- the final remembered selection respects the current folder list order

**Step 2: Run test to verify it fails**

```bash
node --test .\extension\tests\collector-folder-memory.test.mjs
```

Expected: FAIL because the helper module does not exist yet.

**Step 3: Write minimal implementation**

Implement small helpers that:

- normalize raw stored ids
- resolve remembered ids against the current folder list

**Step 4: Run test to verify it passes**

```bash
node --test .\extension\tests\collector-folder-memory.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add extension/utils/collector-folder-memory.js extension/tests/collector-folder-memory.test.mjs
git commit -m "test: cover remembered collector folder selection"
```

### Task 3: Add failing content-script regression tests for the unified modal flow

**Files:**
- Modify: `extension/tests/quick-favorite-ui.test.mjs`
- Modify: `extension/tests/quick-favorite-helpers.test.mjs`
- Modify: `extension/content.js`

**Step 1: Write the failing tests**

Extend regression coverage so it asserts:

- the dedicated `bl-quick-favorite-layer` is gone
- the collector subtitle copy is no longer rendered
- the empty existing-folder placeholder copy is no longer rendered
- a remembered-folder storage key is wired into the content script
- shortcut open flow routes through the unified collector modal path
- `Enter` handling targets the unified collector modal save flow

**Step 2: Run tests to verify they fail**

```bash
node --test .\extension\tests\quick-favorite-ui.test.mjs
node --test .\extension\tests\quick-favorite-helpers.test.mjs
```

Expected: FAIL because the current content script still mounts a dedicated quick-favorite layer and does not remember folder selection.

**Step 3: Write minimal implementation**

Update `extension/content.js` to:

- remove dedicated quick-favorite layer state, DOM, and styles
- use one centered collector modal shell
- wire shortcut and button entry through one shared open routine
- remove the two redundant copy lines
- keep create-folder and custom-tag features intact

**Step 4: Run tests to verify they pass**

```bash
node --test .\extension\tests\quick-favorite-ui.test.mjs
node --test .\extension\tests\quick-favorite-helpers.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add extension/content.js extension/tests/quick-favorite-ui.test.mjs extension/tests/quick-favorite-helpers.test.mjs
git commit -m "refactor: unify collector into centered modal"
```

### Task 4: Add remembered selection persistence and enter-to-save behavior

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/utils/collector-folder-memory.js`
- Modify: `extension/tests/quick-favorite-ui.test.mjs`
- Modify: `extension/tests/collector-folder-memory.test.mjs`

**Step 1: Write the failing test**

Add coverage that asserts:

- remembered folder ids are restored on modal open
- remembered folder ids are saved only after successful video save
- `Enter` triggers collector save when the unified collector modal is open
- `Enter` does not bypass the create-folder modal flow

**Step 2: Run tests to verify they fail**

```bash
node --test .\extension\tests\collector-folder-memory.test.mjs
node --test .\extension\tests\quick-favorite-ui.test.mjs
```

Expected: FAIL because remembered selection persistence and unified `Enter` submit logic are not fully wired yet.

**Step 3: Write minimal implementation**

Implement:

- a storage-backed remembered folder id key
- restore-on-open logic filtered against current folders
- save-on-success logic
- unified `Enter` handling with IME and create-folder guards

**Step 4: Run tests to verify they pass**

```bash
node --test .\extension\tests\collector-folder-memory.test.mjs
node --test .\extension\tests\quick-favorite-ui.test.mjs
```

Expected: PASS

**Step 5: Commit**

```bash
git add extension/content.js extension/utils/collector-folder-memory.js extension/tests/collector-folder-memory.test.mjs extension/tests/quick-favorite-ui.test.mjs
git commit -m "feat: remember collector folders and support enter save"
```

### Task 5: Run focused verification and broader extension verification

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/tests/quick-favorite-ui.test.mjs`
- Modify: `extension/tests/quick-favorite-helpers.test.mjs`
- Create: `extension/utils/collector-folder-memory.js`
- Create: `extension/tests/collector-folder-memory.test.mjs`

**Step 1: Run focused verification**

```bash
node --test .\extension\tests\collector-folder-memory.test.mjs
node --test .\extension\tests\quick-favorite-ui.test.mjs
node --test .\extension\tests\quick-favorite-helpers.test.mjs
node --test .\extension\tests\action-sync-coverage.test.mjs
```

Expected: PASS

**Step 2: Run broader verification**

```bash
node --test (Get-ChildItem extension/tests/*.test.mjs | ForEach-Object { $_.FullName })
pnpm --dir extension run build:all
```

Expected:

- extension tests all pass
- extension build passes for chrome / edge / firefox

**Step 3: Commit final verification state**

```bash
git add extension
git commit -m "test: verify unified collector modal flow"
```
