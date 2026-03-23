# Invalid Video Metadata Recovery Design

**Date:** 2026-03-23

**Status:** Approved

## Goal

Improve recognition of invalid Bilibili favorites by letting users manually recover missing presentation metadata from a third-party cache source after sync.

The first version should only recover:

- `title`
- `coverUrl`
- `description`

It must not:

- restore playback
- change `isInvalid` back to `false`
- write third-party tags into the local tag system
- introduce any backend service

## User Need

When a favorite video becomes invalid on Bilibili, the extension can still keep the record, but the list becomes much harder to understand if the original title and cover are gone.

The user need is not "make the dead video playable again". The user need is:

- help users recognize what the invalid item used to be
- preserve memory and organization value in large favorites libraries
- avoid forcing users to open external sites one by one

That makes title and cover the highest-value fields. Description is useful as a best-effort enhancement. Tags are intentionally out of scope because third-party tag data would be much noisier and could pollute the local tag system.

## Product Direction

### Detect During Sync, Recover After Sync

The main Bilibili sync flow should continue to detect invalid videos during import using the existing `isInvalid` flag.

Recovery should not run inline inside the primary sync request. Instead:

- sync records invalid videos as usual
- sync result returns a deduplicated list/count of invalid local video ids discovered in that run
- the manager prompts the user after sync finishes
- recovery starts only if the user explicitly confirms

This keeps the primary sync fast and understandable, and prevents third-party failures from looking like sync failures.

### Explicit, User-Triggered Recovery

After a sync that discovers invalid videos, the UI should present a lightweight follow-up action:

- "Detected X invalid videos"
- "Recover title, cover, and description from a third-party cache source?"
- `Start recovery`
- `Later`

This action should be scoped to the invalid videos found in the current sync result, not the entire library.

### Best-Effort Metadata, Not Canonical Truth

Recovered fields are treated as cached display metadata. They improve readability, but they are not authoritative Bilibili source-of-truth data.

That means:

- a miss is acceptable
- partial recovery is acceptable
- the system should report hit/miss/failure counts clearly
- `isInvalid` remains unchanged

## Architecture

### Background Recovery Job

Add a dedicated extension-side recovery job that is separate from favorites sync and separate from tag enrichment.

Recommended runtime shape:

- `POST /sync/bilibili/invalid-video-recovery/start`
- `GET /sync/bilibili/invalid-video-recovery/status`

The job should:

- accept a list of local video ids from the latest sync result
- load those videos from local state
- process them serially with a low request rate
- update local video records field-by-field when recovery succeeds
- expose progress for polling in the manager UI

This avoids long foreground request timeouts and preserves a clear user-visible progress model.

### Provider Abstraction

Implement recovery through a small provider abstraction even if version 1 only ships with one provider.

Recommended shape:

- one shared parser/normalizer module for recovered metadata
- one provider implementation for a BiliPlus-compatible source
- one orchestration helper in background runtime

Provider result contract should be:

- `ok`
- `not_found`
- `failed`
- recovered payload with optional `title`, `coverUrl`, `description`

This keeps the system extensible if BiliPlus changes or another source becomes more reliable later.

### No Automatic Background Scheduling

Recovery must not create alarms, retries, or hidden startup work.

If the provider is unavailable:

- the current recovery run records the failure
- the UI shows the summary
- the user may manually retry later

This is an explicit guardrail based on the project's recent risk-control and hidden-background-request issues.

## Data Flow

### Sync Phase

During sync:

- invalid videos are still detected using the current logic
- the sync summary additionally returns:
  - `invalidVideosDetected`
  - `invalidVideoIds`

The ids should be deduplicated local video ids from that sync run only.

### Prompt Phase

After sync completes successfully and `invalidVideosDetected > 0`:

- the manager stores the candidate ids from the latest run
- the manager opens a prompt or lightweight dialog
- the user chooses whether to start recovery

If the user dismisses the prompt:

- nothing else runs automatically
- the sync is still considered complete

### Recovery Phase

Once recovery starts:

- the manager calls the background start endpoint with the candidate ids
- the background processes one video at a time
- the manager polls status
- the local list refreshes after completion

Status payload should include:

- `running`
- `total`
- `current`
- `recovered`
- `notFound`
- `failed`
- `lastError`
- `lastRecoveredVideoId` or similar lightweight progress context

## Write Rules

The write policy should stay conservative.

### Title

Update `title` when:

- provider returns a non-empty normalized title
- local title is empty, placeholder-like, or clearly less useful than the recovered value

Version 1 may simplify this to "overwrite only when `isInvalid === true` and provider title is non-empty".

### Cover

Update `coverUrl` when:

- provider returns a valid normalized cover url
- the local cover is empty, placeholder-based, or known-invalid

This is the highest-priority recovered field for list readability.

### Description

Update `description` when:

- provider returns a non-empty description

Do not overwrite an existing non-empty local description with an empty third-party value.

### Explicit Non-Goals

Version 1 must not update:

- `uploader`
- `uploaderSpaceUrl`
- `partition`
- `customTags`
- `systemTags`

## UI Shape

### Sync Follow-Up Prompt

Recommended UI:

- after sync success, show a dedicated follow-up dialog or panel
- summarize how many invalid videos were detected in that run
- explain that recovery uses a third-party cache source
- make the action opt-in

Suggested copy direction:

- "Detected 18 invalid videos in this sync run"
- "Try recovering title, cover, and description from a third-party cache source"

### Progress Feedback

During recovery:

- show a progress line such as `Recovering invalid videos 3/18`
- show result counters for recovered / not found / failed
- disable duplicate starts while a run is active

### Completion Feedback

At the end:

- show a success toast if at least one record was recovered
- show a partial-result toast if some misses or failures occurred
- refresh the visible video list so recovered covers/titles appear immediately

## Error Handling

### Source Failures

Third-party source errors should not fail the whole sync flow because recovery is a separate stage.

Per-video failures should be isolated and counted.

### Misses

`not_found` is a normal outcome, not an error condition.

Examples:

- source has no cached snapshot for the video
- source page exists but contains no recoverable metadata

### Invalid Payloads

Provider payloads should be normalized before writing:

- trim text
- ignore empty strings
- normalize cover url
- reject obviously malformed values

## Testing

### Extension

- unit tests for recovery metadata normalization and conservative merge behavior
- source regression tests for the new recovery routes and the absence of automatic startup/alarm scheduling
- background tests for sync result including invalid video candidate ids

### Frontend

- source/layout regression tests for:
  - showing the post-sync recovery prompt
  - exposing progress and result copy
  - not auto-starting recovery after sync
- API typing for recovery start/status endpoints
- `vue-tsc` and extension build validation

## Success Criteria

- sync still detects invalid videos without slowing the primary happy path
- users are prompted after sync, not surprised by hidden background recovery
- users can recover `title`, `coverUrl`, and `description` for some invalid videos from a third-party cache source
- `isInvalid` remains accurate and unchanged
- local tag quality is not degraded by third-party data
- no backend service is introduced
