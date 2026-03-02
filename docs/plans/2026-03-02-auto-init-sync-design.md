# Auto Initial Sync (Bilibili Favorites) Design

## Context

BiliShelf currently requires users to manually pick folders and start sync from the manager dialog.
The new requirement is to switch to an automatic first-run initialization flow:

- First install + first open manager: start sync automatically.
- Include tag enrichment by default and as a hard requirement.
- If sync fails, auto-retry on next manager open.
- Must work in both extension runtime and normal web runtime.
- Progress must be visible to users.
- Primary priority: reduce risk-control trigger probability (412) and avoid repeated triggering.

## Goals

1. No manual folder selection required for first-run initialization.
2. Initialization includes folder/video sync and tag enrichment.
3. Initialization resumes from persisted cursor after interruption.
4. Initialization retries automatically until fully complete.
5. 412 handling uses conservative throttle + cooldown backoff.
6. UX surfaces transparent status and progress.

## Non-Goals

1. This change does not remove existing manual sync capability for advanced use.
2. This change does not introduce cloud sync.
3. This change does not guarantee zero 412 forever; it minimizes probability and blast radius.

## Architecture Decision

### Chosen approach: Frontend-driven auto-init orchestrator

Use a frontend orchestration state machine (shared by extension manager and web manager) and reuse existing sync APIs:

- `POST /sync/bilibili/folders`
- `POST /sync/bilibili`

Reasons:

- Single orchestration logic for both runtimes.
- Smallest invasive change on existing architecture.
- Fastest path to production while preserving existing sync APIs.

Rejected alternatives:

- Background/backend-only orchestration (requires dual implementations and higher drift risk).
- Full hybrid queue service (highest complexity, not needed for first rollout).

## Runtime and Auth Strategy

### Extension manager runtime

- Use existing local API bridge path (`BILISHELF_LOCAL_API`) through background.
- Keep existing fetch fallback strategy in extension background:
  - extension fetch first
  - fallback to page-context bridge when needed
- If Bilibili auth/session unavailable, state goes to blocked auth and retries on next open.

### Web manager runtime

Auth source priority:

1. `BILIBILI_COOKIE` environment variable in backend.
2. user-provided cookie from manager settings.

If neither is available, state goes to blocked auth and no sync requests are sent until credential is provided.

## Auto-Init State Machine

States:

- `idle`
- `pending`
- `running`
- `cooldown`
- `blocked_auth`
- `failed`
- `completed`

State transitions:

- first manager entry without init record: `idle -> pending -> running`
- transient failure: `running -> failed`
- 412 or risk-control type failure: `running -> cooldown`
- auth missing: `running -> blocked_auth`
- successful full completion: `running -> completed`
- next manager open (non-completed): attempt resume
  - `failed -> pending -> running`
  - `cooldown -> pending -> running` when cooldown expired
  - `blocked_auth -> pending -> running` when auth becomes valid

## Persistent Data Model

Local storage key namespace: `bilishelf-auto-init-v1`

Stored fields:

- `status`
- `cursor`: `{ remoteFolderId, nextPage }`
- `progress`: `{ foldersDone, foldersTotal, videosImported, tagsEnriched }`
- `cooldownUntil`
- `lastError`
- `requireTagEnrichment` (always true)
- `authSource` (`extension_session | env_cookie | user_cookie`)
- `paused` (manual pause switch)
- `completedAt`

Cross-tab lock key:

- `bilishelf-auto-init-v1.lock`

## Sync Execution Policy (412 Risk Minimization)

### Safe profile (forced for auto-init)

- `maxFolders = 1`
- `maxPagesPerFolder = 1`
- `maxVideosPerFolder = 20`
- `includeTagEnrichment = true` (hard-coded)

### Throttle policy

- Base delay per round: `2200ms`
- Jitter per round: `0..1200ms`
- Long break every 5 rounds: `10..18s`
- Single runner via lock (avoid parallel tab requests)

### 412 cooldown backoff

- 1st consecutive 412: 15 minutes
- 2nd consecutive 412: 45 minutes
- 3rd consecutive 412: 2 hours
- 4th+ consecutive 412: 6 hours cap

During cooldown:

- status is `cooldown`
- manager shows next retry time
- no immediate repeated requests

## Tag Enrichment Policy

Hard requirement: initialization is not marked completed unless tag enrichment requirement is satisfied.

Order:

1. Use tags from folder media payload (`media.tags` + `tname`) first.
2. Only if still missing, query archive tags (`x/tag/archive/tags`) with cache per `bvid`.
3. If archive tag fetch fails for some videos, keep init as non-completed and retry later.

## UI and UX

Add a top initialization status card in manager while `status != completed`:

- status label (`running/cooldown/blocked_auth/failed/pending`)
- progress counters
- current action (`folder`, `page`)
- retry ETA in cooldown
- latest error summary

Actions:

- `Pause Auto Retry`
- `Retry Now` (disabled during active cooldown)

After completion:

- show success toast once
- hide initialization card by default
- keep existing manual sync entry for advanced use

## Completion Criteria

Initialization becomes `completed` only when all are true:

1. All discovered syncable folders fully traversed (no pending `hasMore` and no pending `hasMorePage`).
2. Tag enrichment requirement was enforced for every sync round.
3. No unresolved failed/cooldown/blocked-auth pending work.

## Failure Handling

- Auth missing: enter `blocked_auth`, do not send Bilibili requests, wait for next open or credential update.
- 412/risk-control: enter `cooldown` with exponential backoff.
- Other errors: enter `failed`, retry next manager open.

## Testing and Acceptance

### Functional acceptance

1. First install -> first manager open triggers auto init without manual folder selection.
2. Manager reload/close/reopen resumes from persisted cursor.
3. Extension and web runtime both execute auto init flow.
4. Completion requires tag enrichment path enabled and completed.

### Risk-control acceptance

1. Mock 412 causes cooldown transition and no immediate re-hit loop.
2. Consecutive 412 increases cooldown duration correctly.
3. Cooldown expiry resumes automatically on next manager open.
4. Multi-tab manager only runs one active auto-init worker.

### Quality gate

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- New unit/integration tests for state machine and retry policy

## Rollout Notes

1. Keep manual sync dialog available as fallback.
2. Add docs updates for web cookie configuration (`env cookie` + `user cookie` path).
3. Monitor early 412 telemetry (local logs) to tune delay/backoff constants if needed.
