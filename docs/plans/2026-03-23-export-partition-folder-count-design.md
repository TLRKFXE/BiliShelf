# Export Partition And Folder Count Design

**Problem**

The export table currently leaves `partition` empty because the local video model never persists that field. Users also cannot see how many folders contain the same video when exporting.

**Decision**

Persist `partition` as a first-class video field in local state and export it directly. Add a computed `folderCount` export field derived from the existing folder-video relations so duplicate membership becomes visible in CSV/JSON exports.

**Scope**

- Store `partition` on local videos during sync, import, and manual edits
- Export `partition` in JSON and CSV
- Add `folderCount` to JSON and CSV export output
- Keep the change extension-only with no backend work

**Why this approach**

This fixes the root cause instead of patching the CSV renderer. Once `partition` is stored correctly, every API response and export path can reuse the same data. `folderCount` is already derivable from existing relations, so it is a low-risk additive export field.

**Validation**

- Add focused tests for export metadata helpers
- Run the extension test suite
- Run WXT prepare, local TypeScript check, and build
