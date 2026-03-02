# Auto Initial Sync (First-Run, Tag-Enforced, Low-412) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically run first-run Bilibili favorites initialization sync (with mandatory tag enrichment) when manager opens, resume on next open after failures, and minimize 412 risk with conservative scheduling.

**Architecture:** Implement a frontend auto-init orchestrator state machine shared by extension manager and web manager. Persist status/cursor/cooldown in local storage, run single-worker with cross-tab lock, and call existing sync APIs in safe small rounds (`maxFolders=1`, `maxPagesPerFolder=1`, `maxVideosPerFolder=20`, `includeTagEnrichment=true`). Add a manager status banner for progress/auth/cooldown and provide web cookie fallback for non-extension runtime.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Pinia store context, existing manager API client (`frontend/src/lib/api.ts`), Vitest + Vue Test Utils for new unit/component tests.

---

### Task 1: Add Frontend Test Harness (Vitest)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/smoke.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/test/smoke.spec.ts
import { describe, expect, it } from 'vitest'

describe('smoke', () => {
  it('runs vitest in frontend workspace', () => {
    expect(true).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test`
Expected: FAIL because test script or vitest config is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```ts
// frontend/src/test/setup.ts
import { afterEach } from 'vitest'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test`
Expected: PASS for `smoke.spec.ts`.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/test/smoke.spec.ts
git commit -m "test(frontend): add vitest harness"
```

### Task 2: Implement Auto-Init Domain Types and Cooldown Policy (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/types.ts`
- Create: `frontend/src/lib/auto-init/cooldown.ts`
- Test: `frontend/src/lib/auto-init/cooldown.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/cooldown.spec.ts
import { describe, expect, it } from 'vitest'
import { getCooldownMsForRiskStreak } from './cooldown'

describe('getCooldownMsForRiskStreak', () => {
  it('uses capped backoff policy', () => {
    expect(getCooldownMsForRiskStreak(1)).toBe(15 * 60_000)
    expect(getCooldownMsForRiskStreak(2)).toBe(45 * 60_000)
    expect(getCooldownMsForRiskStreak(3)).toBe(120 * 60_000)
    expect(getCooldownMsForRiskStreak(4)).toBe(360 * 60_000)
    expect(getCooldownMsForRiskStreak(8)).toBe(360 * 60_000)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/cooldown.spec.ts`
Expected: FAIL because module/functions do not exist.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/cooldown.ts
export function getCooldownMsForRiskStreak(streak: number) {
  if (streak <= 1) return 15 * 60_000
  if (streak === 2) return 45 * 60_000
  if (streak === 3) return 120 * 60_000
  return 360 * 60_000
}
```

```ts
// frontend/src/lib/auto-init/types.ts
export type AutoInitStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'cooldown'
  | 'blocked_auth'
  | 'failed'
  | 'completed'
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/cooldown.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/types.ts frontend/src/lib/auto-init/cooldown.ts frontend/src/lib/auto-init/cooldown.spec.ts
git commit -m "feat(frontend): add auto-init cooldown policy"
```

### Task 3: Implement Auto-Init Persistent Storage (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/storage.ts`
- Test: `frontend/src/lib/auto-init/storage.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/storage.spec.ts
import { describe, expect, it } from 'vitest'
import { loadAutoInitState, saveAutoInitState } from './storage'

describe('auto-init storage', () => {
  it('saves and restores state', () => {
    saveAutoInitState({ status: 'pending', requireTagEnrichment: true })
    const state = loadAutoInitState()
    expect(state.status).toBe('pending')
    expect(state.requireTagEnrichment).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/storage.spec.ts`
Expected: FAIL because storage module is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/storage.ts
const KEY = 'bilishelf-auto-init-v1'

export function loadAutoInitState() {
  const raw = localStorage.getItem(KEY)
  if (!raw) return { status: 'idle', requireTagEnrichment: true as const }
  try {
    return JSON.parse(raw)
  } catch {
    return { status: 'idle', requireTagEnrichment: true as const }
  }
}

export function saveAutoInitState(state: Record<string, unknown>) {
  localStorage.setItem(KEY, JSON.stringify(state))
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/storage.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/storage.ts frontend/src/lib/auto-init/storage.spec.ts
git commit -m "feat(frontend): add auto-init state persistence"
```

### Task 4: Implement Cross-Tab Lock for Single Worker (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/lock.ts`
- Test: `frontend/src/lib/auto-init/lock.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/lock.spec.ts
import { describe, expect, it } from 'vitest'
import { tryAcquireAutoInitLock, releaseAutoInitLock } from './lock'

describe('auto-init lock', () => {
  it('acquires once and blocks second acquire', () => {
    expect(tryAcquireAutoInitLock('tab-a')).toBe(true)
    expect(tryAcquireAutoInitLock('tab-b')).toBe(false)
    releaseAutoInitLock('tab-a')
    expect(tryAcquireAutoInitLock('tab-b')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/lock.spec.ts`
Expected: FAIL because lock module is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/lock.ts
const KEY = 'bilishelf-auto-init-v1.lock'

export function tryAcquireAutoInitLock(owner: string) {
  const current = localStorage.getItem(KEY)
  if (current && current !== owner) return false
  localStorage.setItem(KEY, owner)
  return true
}

export function releaseAutoInitLock(owner: string) {
  if (localStorage.getItem(KEY) === owner) {
    localStorage.removeItem(KEY)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/lock.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/lock.ts frontend/src/lib/auto-init/lock.spec.ts
git commit -m "feat(frontend): add auto-init single-worker lock"
```

### Task 5: Add Web Cookie Fallback Store (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/auth.ts`
- Test: `frontend/src/lib/auto-init/auth.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/auth.spec.ts
import { describe, expect, it } from 'vitest'
import { getUserBiliCookie, setUserBiliCookie } from './auth'

describe('user cookie storage', () => {
  it('persists and restores cookie text', () => {
    setUserBiliCookie('SESSDATA=abc; bili_jct=xyz;')
    expect(getUserBiliCookie()).toContain('SESSDATA=abc')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/auth.spec.ts`
Expected: FAIL because auth module is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/auth.ts
const COOKIE_KEY = 'bilishelf-web-user-cookie-v1'

export function getUserBiliCookie() {
  return (localStorage.getItem(COOKIE_KEY) || '').trim()
}

export function setUserBiliCookie(cookie: string) {
  const next = cookie.trim()
  if (!next) {
    localStorage.removeItem(COOKIE_KEY)
    return
  }
  localStorage.setItem(COOKIE_KEY, next)
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/auth.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/auth.ts frontend/src/lib/auto-init/auth.spec.ts
git commit -m "feat(frontend): add web runtime cookie fallback store"
```

### Task 6: Implement Auto-Init Orchestrator Core (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/orchestrator.ts`
- Test: `frontend/src/lib/auto-init/orchestrator.spec.ts`
- Modify: `frontend/src/lib/api.ts` (export typed sync call options for cookie passthrough)

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/orchestrator.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { runAutoInitRound } from './orchestrator'

it('calls sync API with safe profile and tag enrichment forced', async () => {
  const fetchFolders = vi.fn().mockResolvedValue({ items: [{ remoteId: 1, title: 'A', mediaCount: 100 }], total: 1 })
  const sync = vi.fn().mockResolvedValue({
    ok: true,
    summary: { foldersDetected: 1, foldersSynced: 1, videosProcessed: 20, videosUpserted: 20, folderLinksAdded: 20, tagsBound: 10, errorCount: 0 },
    hasMorePage: true,
    nextPage: 2,
    errors: [],
    syncedAt: Date.now(),
  })

  await runAutoInitRound({ fetchFolders, sync })

  expect(sync).toHaveBeenCalledWith(expect.objectContaining({
    selectedRemoteFolderIds: [1],
    maxFolders: 1,
    maxPagesPerFolder: 1,
    maxVideosPerFolder: 20,
    includeTagEnrichment: true,
  }))
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/orchestrator.spec.ts`
Expected: FAIL because orchestrator function is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/orchestrator.ts
export async function runAutoInitRound(deps: {
  fetchFolders: () => Promise<{ items: Array<{ remoteId: number }>; total: number }>
  sync: (payload: Record<string, unknown>) => Promise<unknown>
}) {
  const folders = await deps.fetchFolders()
  if (!folders.items.length) return { status: 'failed' as const }

  await deps.sync({
    selectedRemoteFolderIds: [folders.items[0].remoteId],
    maxFolders: 1,
    maxPagesPerFolder: 1,
    maxVideosPerFolder: 20,
    includeTagEnrichment: true,
  })

  return { status: 'running' as const }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/orchestrator.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/orchestrator.ts frontend/src/lib/auto-init/orchestrator.spec.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): add auto-init sync orchestrator core"
```

### Task 7: Add Folder Tag-Coverage Validator (TDD)

**Files:**
- Create: `frontend/src/lib/auto-init/tag-coverage.ts`
- Test: `frontend/src/lib/auto-init/tag-coverage.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/lib/auto-init/tag-coverage.spec.ts
import { describe, expect, it } from 'vitest'
import { folderHasCompleteSystemTags } from './tag-coverage'

it('requires every video to have at least one system tag', () => {
  expect(folderHasCompleteSystemTags([
    { id: 1, systemTags: ['tag-a'] },
    { id: 2, systemTags: [] },
  ])).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/tag-coverage.spec.ts`
Expected: FAIL because validator is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/lib/auto-init/tag-coverage.ts
export function folderHasCompleteSystemTags(rows: Array<{ systemTags?: string[] }>) {
  return rows.every((row) => Array.isArray(row.systemTags) && row.systemTags.length > 0)
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/lib/auto-init/tag-coverage.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/lib/auto-init/tag-coverage.ts frontend/src/lib/auto-init/tag-coverage.spec.ts
git commit -m "feat(frontend): add tag coverage validator for completion gating"
```

### Task 8: Build Auto-Init Banner Component (TDD)

**Files:**
- Create: `frontend/src/components/layout/AutoInitSyncBanner.vue`
- Test: `frontend/src/components/layout/AutoInitSyncBanner.spec.ts`
- Modify: `frontend/src/lib/manager-i18n.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/components/layout/AutoInitSyncBanner.spec.ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AutoInitSyncBanner from './AutoInitSyncBanner.vue'

it('renders progress and retry eta in cooldown', () => {
  const wrapper = mount(AutoInitSyncBanner, {
    props: {
      status: 'cooldown',
      foldersDone: 2,
      foldersTotal: 10,
      nextRetryAt: Date.now() + 60_000,
    },
  })

  expect(wrapper.text()).toContain('2')
  expect(wrapper.text()).toContain('10')
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/components/layout/AutoInitSyncBanner.spec.ts`
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

```vue
<!-- frontend/src/components/layout/AutoInitSyncBanner.vue -->
<script setup lang="ts">
defineProps<{
  status: string
  foldersDone: number
  foldersTotal: number
  nextRetryAt?: number | null
}>()
</script>

<template>
  <section class="panel-surface p-4">
    <p>{{ status }}</p>
    <p>{{ foldersDone }} / {{ foldersTotal }}</p>
    <p v-if="nextRetryAt">{{ nextRetryAt }}</p>
  </section>
</template>
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/components/layout/AutoInitSyncBanner.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/layout/AutoInitSyncBanner.vue frontend/src/components/layout/AutoInitSyncBanner.spec.ts frontend/src/lib/manager-i18n.ts
git commit -m "feat(frontend): add auto-init status banner UI"
```

### Task 9: Integrate Auto-Init Into Manager Lifecycle (TDD)

**Files:**
- Create: `frontend/src/composables/use-auto-init-sync.ts`
- Modify: `frontend/src/App.vue`
- Test: `frontend/src/composables/use-auto-init-sync.spec.ts`

**Step 1: Write the failing test**

```ts
// frontend/src/composables/use-auto-init-sync.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { useAutoInitSync } from './use-auto-init-sync'

it('starts auto-init when state is not completed', async () => {
  const run = vi.fn().mockResolvedValue(undefined)
  const api = useAutoInitSync({ runRound: run })
  await api.startIfNeeded()
  expect(run).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/composables/use-auto-init-sync.spec.ts`
Expected: FAIL because composable is missing.

**Step 3: Write minimal implementation**

```ts
// frontend/src/composables/use-auto-init-sync.ts
import { loadAutoInitState } from '@/lib/auto-init/storage'

export function useAutoInitSync(deps: { runRound: () => Promise<void> }) {
  async function startIfNeeded() {
    const state = loadAutoInitState() as { status?: string }
    if (state.status === 'completed') return
    await deps.runRound()
  }

  return { startIfNeeded }
}
```

Then call `startIfNeeded()` from manager bootstrap in `App.vue` after initial store bootstrap.

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/composables/use-auto-init-sync.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/composables/use-auto-init-sync.ts frontend/src/composables/use-auto-init-sync.spec.ts frontend/src/App.vue
git commit -m "feat(frontend): trigger first-run auto-init sync on manager bootstrap"
```

### Task 10: Add Web Cookie Input + Blocked-Auth Recovery Path (TDD)

**Files:**
- Modify: `frontend/src/components/layout/AutoInitSyncBanner.vue`
- Modify: `frontend/src/composables/use-auto-init-sync.ts`
- Modify: `frontend/src/lib/api.ts`
- Test: `frontend/src/composables/use-auto-init-sync.spec.ts`

**Step 1: Write the failing test**

```ts
it('uses user cookie in web runtime when blocked auth', async () => {
  const sync = vi.fn().mockResolvedValue({ ok: true })
  const api = useAutoInitSync({ runRound: () => Promise.resolve(), syncFromBilibili: sync })

  await api.retryWithUserCookie('SESSDATA=abc;')

  expect(sync).toHaveBeenCalledWith(expect.objectContaining({ cookie: 'SESSDATA=abc;' }))
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test frontend/src/composables/use-auto-init-sync.spec.ts`
Expected: FAIL because cookie retry path is missing.

**Step 3: Write minimal implementation**

- Add optional `cookie` passthrough in auto-init sync payload assembly for web runtime.
- Add banner input + save/retry handlers for blocked-auth state.

```ts
await syncFromBilibili({
  ...safePayload,
  cookie: userCookie || undefined,
})
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test frontend/src/composables/use-auto-init-sync.spec.ts`
Expected: PASS with cookie payload assertion.

**Step 5: Commit**

```bash
git add frontend/src/components/layout/AutoInitSyncBanner.vue frontend/src/composables/use-auto-init-sync.ts frontend/src/lib/api.ts frontend/src/composables/use-auto-init-sync.spec.ts
git commit -m "feat(frontend): add blocked-auth recovery via user cookie in web runtime"
```

### Task 11: Full Verification Before Merge Claim

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`

**Step 1: Write the failing verification target**

No code-first step; define acceptance scripts and run order:

```bash
pnpm --dir frontend test
pnpm --dir frontend check
pnpm --dir backend check
```

**Step 2: Run verification and capture failures**

Expected initially: at least one failure if docs/i18n text is stale or test snapshot mismatches.

**Step 3: Minimal fixes**

- Update docs to explain first-run auto-init and web cookie fallback.
- Ensure i18n text matches banner states and button labels.

**Step 4: Re-run verification to all green**

Run:

```bash
pnpm --dir frontend test
pnpm --dir frontend check
pnpm --dir backend check
```

Expected: all PASS, no type errors.

**Step 5: Commit**

```bash
git add README.md README.en.md frontend/src/lib/manager-i18n.ts
git commit -m "docs: describe automatic first-run initialization sync"
```

### Task 12: Final Integration Commit and Branch Hygiene

**Files:**
- Modify: any remaining tracked files from prior tasks

**Step 1: Write a final regression checklist file**

Create temporary checklist:

```md
- Auto-init starts on first manager open
- Cooldown on 412
- Resume on reopen
- Tag gate blocks premature completion
- Web cookie fallback works
```

**Step 2: Run manual sanity pass**

- Extension manager run: open manager and observe banner transitions.
- Web manager run: simulate missing cookie then provide cookie and retry.

**Step 3: Remove temporary checklist artifact**

Delete temporary file after checks.

**Step 4: Run final git integrity checks**

Run:

```bash
git status --short
git log --oneline -n 12
```

Expected: clean tree and clear task-by-task history.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ship first-run auto initialization sync with low-risk retry policy"
```
