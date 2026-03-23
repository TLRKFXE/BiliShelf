# Remove Local Backend And Bump Version Design

**Date:** 2026-03-23

**Status:** Approved

## Goal

Remove the local `backend/` project from the repository, keep the manager UI working as an extension-embedded page, and bump the shipped extension/frontend version so the release artifacts and manifest reflect the new state.

## Product Direction

- The extension is now the only runtime that owns local data, AI settings, and AI categorization.
- `frontend/` remains in the repository as the source for the manager page UI, but it is no longer described as a standalone app that depends on a local backend service.
- Repository documentation and dev instructions should reflect an "extension + embedded manager frontend" product shape instead of a "frontend + backend + extension" stack.

## Architecture

### Runtime Shape

- Keep `frontend/src/lib/api.ts` and the existing extension-local message bridge unchanged for runtime behavior.
- Treat the browser extension background runtime as the authoritative local API surface.
- Remove the repository-level local backend implementation entirely.

### Frontend Development Config

- Stop implying that local frontend development proxies to `http://127.0.0.1:4321`.
- If a proxy is needed in the future, it must be opt-in through environment configuration rather than a hard-coded default.

### Versioning

- Bump the shipped version away from `0.1.0`.
- Keep `frontend/package.json`, `extension/package.json`, and `extension/wxt.config.ts` aligned.
- Remove hard-coded release artifact version strings from release tooling where practical so future bumps do not require extra manual edits.

## Documentation

- Remove root README instructions that ask contributors to install or run `backend/`.
- Update project-structure and tech-stack descriptions so they no longer list `backend/` as an active project area.
- Update extension release docs to reflect the new version and remove stale backend-only AI wording.

## Error Handling And Safety

- Do not change the extension-local API behavior used by the manager page.
- Keep the fallback/frontend code paths compiling even after the backend directory is gone.
- Prefer targeted documentation cleanup over large risky rewrites, especially in files that show encoding noise in the terminal.

## Testing

### New Regression Coverage

- verify the repository no longer contains a local `backend/` directory
- verify `frontend/vite.config.ts` no longer hard-codes the old backend proxy target
- verify current docs no longer instruct contributors to run `pnpm --dir backend ...`
- verify version metadata is aligned across frontend package, extension package, and extension manifest
- verify extension release tooling no longer hard-codes `0.1.0`

### Final Verification

- `node --test extension/tests/*.test.mjs`
- `pnpm --dir extension exec tsc --noEmit`
- `node --test frontend/tests/*.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir extension run build:all`

## Success Criteria

- `backend/` is removed from the repository
- manager UI still builds into the extension and type-checks cleanly
- extension tests and frontend tests remain green
- shipped version metadata is bumped and consistent
- current documentation no longer tells contributors to start a removed local backend
