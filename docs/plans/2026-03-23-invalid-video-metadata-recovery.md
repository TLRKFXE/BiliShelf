# Invalid Video Metadata Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users recover `title`, `coverUrl`, and `description` for invalid Bilibili videos from a third-party cache source after sync, without affecting the primary sync flow or adding backend infrastructure.

**Architecture:** Keep invalid detection inside the existing Bilibili sync path, but return a deduplicated list of invalid local video ids in the sync result. Add a separate extension-side recovery job with explicit start/status endpoints, then let the manager prompt the user after sync and poll progress in a dedicated dialog. Use a small pure helper for metadata normalization and conservative field merging so provider results stay safe and testable.

**Tech Stack:** TypeScript WXT background entrypoint, Vue 3 manager UI, Node test runner, `vue-tsc`, extension builds

---

### Task 1: Add recovery metadata helper tests

**Files:**
- Create: `extension/shared/invalid-video-recovery.js`
- Create: `extension/shared/invalid-video-recovery.d.ts`
- Create: `extension/tests/invalid-video-recovery.test.mjs`

**Step 1: Write the failing test**

Add tests for two pure helpers:

- `normalizeRecoveredInvalidVideoMetadata(input)`
- `mergeRecoveredInvalidVideoFields(video, recovered)`

Use a small in-memory invalid video fixture such as:

```js
const invalidVideo = {
  id: 7,
  title: "已失效视频",
  coverUrl: "https://i0.hdslb.com/bfs/archive/placeholder.jpg",
  description: "",
  uploader: "Existing Uploader",
  uploaderSpaceUrl: "https://space.bilibili.com/123",
  isInvalid: true,
};

const recovered = {
  title: "Original archived title",
  coverUrl: "//i0.hdslb.com/bfs/archive/recovered-cover.jpg",
  description: "Recovered description",
};
```

Expect:

- normalized cover becomes an absolute URL
- empty strings are dropped
- `title`, `coverUrl`, and `description` are updated for invalid videos
- `uploader` and `uploaderSpaceUrl` are untouched
- no tag-related fields are introduced

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: FAIL because the helper module does not exist yet

**Step 3: Write minimal implementation**

Implement:

- metadata normalization for `title`, `coverUrl`, and `description`
- conservative merge logic for invalid videos only
- a lightweight result shape such as:

```js
{
  changed: boolean,
  updates: {
    title?: string,
    coverUrl?: string,
    description?: string,
  },
}
```

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add extension/shared/invalid-video-recovery.js extension/shared/invalid-video-recovery.d.ts extension/tests/invalid-video-recovery.test.mjs
git commit -m "test: add invalid video recovery helpers"
```

### Task 2: Add background recovery job and sync candidate ids

**Files:**
- Modify: `extension/entrypoints/background.ts`
- Modify: `extension/tests/invalid-video-recovery.test.mjs`

**Step 1: Write the failing test**

Extend `extension/tests/invalid-video-recovery.test.mjs` with source-contract regression checks that assert:

- sync results now expose `invalidVideosDetected` and `invalidVideoIds`
- background routes include:
  - `POST /sync/bilibili/invalid-video-recovery/start`
  - `GET /sync/bilibili/invalid-video-recovery/status`
- the recovery job uses explicit start/status flow instead of alarm scheduling

Example source assertions:

```js
assert.match(source, /invalidVideosDetected/);
assert.match(source, /invalidVideoIds/);
assert.match(source, /\/sync\/bilibili\/invalid-video-recovery\/start/);
assert.match(source, /\/sync\/bilibili\/invalid-video-recovery\/status/);
assert.doesNotMatch(source, /chrome\.alarms\.create\(.*invalid-video-recovery/);
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: FAIL because the routes and sync-result fields do not exist yet

**Step 3: Write minimal implementation**

In `extension/entrypoints/background.ts`:

- extend the sync result contract to collect deduplicated invalid local video ids from the current run
- add a small recovery status/task state in memory
- add a third-party fetch helper for a BiliPlus-compatible source
- process videos serially
- use the shared helper from Task 1 to normalize and merge recovered metadata
- update only `title`, `coverUrl`, and `description`
- keep `isInvalid` unchanged
- return status counters:

```ts
{
  running: boolean;
  total: number;
  current: number;
  recovered: number;
  notFound: number;
  failed: number;
  lastError: string | null;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: PASS

**Step 5: Commit**

```bash
git add extension/entrypoints/background.ts extension/tests/invalid-video-recovery.test.mjs
git commit -m "feat: add invalid video metadata recovery job"
```

### Task 3: Add manager prompt, dialog, and recovery API wiring

**Files:**
- Create: `frontend/src/components/dialogs/InvalidVideoRecoveryDialog.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/manager-i18n.ts`
- Modify: `extension/tests/invalid-video-recovery.test.mjs`

**Step 1: Write the failing test**

Extend the existing recovery regression test to assert:

- `frontend/src/lib/api.ts` exports:
  - `startInvalidVideoRecovery`
  - `fetchInvalidVideoRecoveryStatus`
- `frontend/src/App.vue` reacts to sync results that include `invalidVideoIds`
- the new dialog file exists and is wired through i18n keys for:
  - prompt title/description
  - start button
  - later button
  - progress/result copy

Example assertions:

```js
const apiSource = await readFile(path.join(repoRoot, "frontend", "src", "lib", "api.ts"), "utf8");
assert.match(apiSource, /startInvalidVideoRecovery/);
assert.match(apiSource, /fetchInvalidVideoRecoveryStatus/);

const appSource = await readFile(path.join(repoRoot, "frontend", "src", "App.vue"), "utf8");
assert.match(appSource, /invalidVideoIds/);
assert.match(appSource, /InvalidVideoRecoveryDialog/);
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: FAIL because the manager flow and dialog do not exist yet

**Step 3: Write minimal implementation**

Implement the manager flow:

- when sync completes and returns `invalidVideoIds.length > 0`, store the ids for the latest sync run
- open `InvalidVideoRecoveryDialog.vue`
- on confirm, call `startInvalidVideoRecovery({ videoIds })`
- poll `fetchInvalidVideoRecoveryStatus()`
- refresh videos after completion
- show toasts for recovered / partial / failed results

Use i18n keys instead of hardcoded strings and keep the dialog opt-in only.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: PASS

**Step 5: Run focused frontend check**

Run: `pnpm --dir frontend run check`

Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/components/dialogs/InvalidVideoRecoveryDialog.vue frontend/src/App.vue frontend/src/lib/api.ts frontend/src/lib/manager-i18n.ts extension/tests/invalid-video-recovery.test.mjs
git commit -m "feat: prompt invalid video metadata recovery after sync"
```

### Task 4: Verify the feature end-to-end

**Files:**
- Verify only

**Step 1: Run recovery regression tests**

Run: `node --test extension/tests/invalid-video-recovery.test.mjs`

Expected: PASS

**Step 2: Run full extension tests**

Run: `node --test extension/tests/*.test.mjs`

Expected: PASS

**Step 3: Run frontend type check**

Run: `pnpm --dir frontend run check`

Expected: PASS

**Step 4: Run WXT prepare**

Run: `pnpm --dir extension exec wxt prepare`

Expected: PASS

**Step 5: Run extension type check**

Run from `extension/`: `.\node_modules\.bin\tsc --noEmit -p tsconfig.json`

Expected: PASS

**Step 6: Run extension build**

Run: `pnpm --dir extension run build:all`

Expected: PASS
