# Remove Local Backend And Bump Version Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the local backend project, keep the manager usable as an extension-embedded page, and bump all shipped version metadata consistently.

**Architecture:** The extension background runtime remains the only local API implementation. `frontend/` stays as the manager UI source, but local backend assumptions are removed from configs and docs. Version metadata is centralized and release tooling is updated so packaging stays aligned with the shipped extension version.

**Tech Stack:** Node.js, pnpm, Vue 3, Vite, WXT, Node test runner

---

### Task 1: Add failing regression tests for backend removal and version consistency

**Files:**
- Create: `extension/tests/release-version-sync.test.mjs`
- Create: `frontend/tests/repo-structure-regressions.test.mjs`

**Step 1: Write the failing test**

- add a test that reads `frontend/package.json`, `extension/package.json`, and `extension/wxt.config.ts`
- assert frontend and extension versions match
- assert WXT manifest version matches extension package version
- assert the version is no longer `0.1.0`
- add a test that checks `extension/scripts/prepare-release.mjs` no longer hard-codes `0.1.0`
- add a test that checks the repository no longer has `backend/`
- add a test that checks `frontend/vite.config.ts` no longer defaults to `http://127.0.0.1:4321`
- add a test that checks current readmes no longer ask contributors to run `pnpm --dir backend ...`

**Step 2: Run test to verify it fails**

Run:

```bash
node --test extension/tests/release-version-sync.test.mjs frontend/tests/repo-structure-regressions.test.mjs
```

Expected:

- FAIL because the repository still contains `backend/`
- FAIL because versions are still `0.1.0`
- FAIL because release tooling still hard-codes `0.1.0`
- FAIL because docs/config still reference the removed backend workflow

### Task 2: Implement version bump and release-tooling alignment

**Files:**
- Modify: `frontend/package.json`
- Modify: `extension/package.json`
- Modify: `extension/wxt.config.ts`
- Modify: `extension/scripts/prepare-release.mjs`
- Modify: `extension/README.md`

**Step 1: Write minimal implementation**

- bump shipped versions consistently
- update release packaging script to derive zip names from the current package version instead of hard-coding `0.1.0`
- update extension release documentation so the described artifact names/tag guidance match the new versioning approach

**Step 2: Run focused tests**

Run:

```bash
node --test extension/tests/release-version-sync.test.mjs
```

Expected:

- PASS

### Task 3: Remove backend project and clean remaining repo references

**Files:**
- Delete: `backend/`
- Modify: `frontend/vite.config.ts`
- Modify: `README.en.md`
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: `extension/README.md`

**Step 1: Write minimal implementation**

- delete the `backend/` directory
- remove stale backend setup instructions from current docs
- remove stale `backend/` project-structure references from current docs
- change `frontend/vite.config.ts` so backend proxying is opt-in instead of defaulting to `127.0.0.1:4321`
- remove obsolete `backend/data/` ignore rules if they are no longer needed

**Step 2: Run focused tests**

Run:

```bash
node --test frontend/tests/repo-structure-regressions.test.mjs
```

Expected:

- PASS

### Task 4: Run full verification and extension build

**Files:**
- No source changes expected

**Step 1: Run verification**

Run:

```bash
node --test extension/tests/*.test.mjs
pnpm --dir extension exec tsc --noEmit
node --test frontend/tests/*.test.mjs
pnpm --dir frontend check
pnpm --dir extension run build:all
```

Expected:

- all tests pass
- extension type-check passes
- frontend type-check passes
- all extension targets build successfully
