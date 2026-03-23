# Bilibili Folder Order Sync Design

**Problem**

After syncing selected Bilibili favorite folders, the local folder sidebar can keep an older reversed order because existing remote-bound folders keep their previous `sortOrder`.

**Decision**

When a sync run has access to the current Bilibili remote folder list, reassign `sortOrder` for local folders that are linked by `remoteMediaId` so they follow that remote list order.

**Scope**

- Reorder only folders linked to Bilibili via `remoteMediaId`
- Keep local-only folders after the remote-linked block
- Preserve the relative order of local-only folders
- Apply the reorder during sync so old reversed orders are repaired automatically

**Why this approach**

This fixes both newly synced folders and previously imported folders without adding UI controls or changing manual local-only folder management.

**Validation**

- Add a focused unit test for the reorder helper
- Run extension tests
- Run extension type-check and build
