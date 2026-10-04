<p align="right"><a href="./README.md">中文</a></p>

# <p align="center">BiliShelf</p>

<p align="center"><em style="font-size:0.2rem;">Introduction, what I want to say:</em></p>
<p align="center">
Have you ever felt frustrated by Bilibili's favorites limits or the weak search experience? I don't know how many people feel the same way I do, but I kept running into the same problems: I could remember keywords from a video I had watched before, yet still couldn't find it again. And once the favorite-folder limit was reached, people were forced into awkward workarounds: saving things in browser bookmarks on desktop, relying on screenshots on mobile, or even deleting old favorites they still cared about.
</p>

---

- A local-first browser extension for managing Bilibili favorites.
- It stores video metadata, folder relations, and tags locally, solves the limits of native Bilibili favorites and their weak search experience, and provides more flexible organization, search, sync, and backup workflows than the default Bilibili experience.
- Please read all notes carefully.

<img width="2226" height="1244" alt="81ff08f39016bb45b874f38d14e1dff8" src="https://github.com/user-attachments/assets/f1a1cd67-65ab-4caf-8ad0-a23bb4ca7d27" />

## What It Solves

BiliShelf is mainly built to solve these common problems:

- Native Bilibili favorites have limited quantity, hierarchy, and management flexibility
- You may want to search videos more precisely by title, uploader, description, tags, or date range
- A single video may belong to multiple organization dimensions and needs to be managed across folders
- When a video becomes unavailable, you may be left with only a dead link and no title, cover, or context
- You may want to keep your favorite data locally for the long term, with export, backup, and restore support

## Current Features

- Local-first: data is stored locally in the browser by default
- Folder management: create, rename, sort, describe, delete, and restore from trash
- Folder groups: assign group names to folders, collapse / expand groups, and keep Ungrouped separate
- AI organization: generate a classification plan for a selected scope from natural-language requirements, review it before applying, and retain snapshots for undo
- Article favorites: save content from Bilibili article pages and organize it with article folders that are separate from video folders
- Comment favorites: save comments from video pages, Watch Later pages, and article pages, including comment images and original-comment links
- Custom tags: manage tags and use existing tags for autocomplete / selection while favoriting
- Tag management: search tags and sort them by name, usage count, or creation time in either direction
- Search capabilities:
  - global keyword search
  - filter by title, uploader, description, Bilibili tags, and custom tags
  - filter by date range
- Batch operations: move, copy, and delete videos
- Floating favorite panel: save videos directly from Bilibili video pages into local folders
- Quick favorite shortcut: default is `Ctrl+Alt+1`, then press `Enter` to confirm
- Folder playlist playback: open playable videos from the current folder in sequence
- Followed UPs: batch import the current account's followed creators and quickly search / jump to their spaces inside the extension
- Sync import:
  - supports selecting Bilibili favorite folders and syncing them into local storage
  - processes folders one by one in the current list order instead of sending all requests at once
  - supports resume, automatic cooldown, and throttling strategies that try to reduce risk-control triggers
- Favorite-action listener: enabled by default; watches favorite actions on Bilibili and reconciles them back into local data
- Video detail cards for saved videos, reducing the "I know I saved something, but I no longer know what it was" problem after invalidation
- Import / export: supports `JSON` / `CSV`
- WebDAV backup: it is recommended to create the target directory in advance; supports configuration, connectivity testing, backup upload, download, and restore
- Management-center experience: supports dark / light themes and CN / EN switching

## Installation

### Method 1: Regular Users

1. Download:
   Store versions usually lag behind GitHub Releases.

   Extension stores:
   - Edge: `[https://microsoftedge.microsoft.com/addons/detail/bilishelf-manager/](https://microsoftedge.microsoft.com/addons/detail/bilishelf-manager/cnenidkjccfkjjbkcmkkbgjilhohpjbi)`
   - Firefox: `https://addons.mozilla.org/en-GB/firefox/addon/bilishelf/`

   GitHub Releases:
   - `https://github.com/TLRKFXE/BiliShelf/releases`
   <!-- bilishelf-store-version: edge=1.0.1; firefox=1.0.1 -->
   - Current store versions: Edge v1.0.1; Firefox v1.0.1

   After downloading the package, unzip it and install it from your browser's extension manager:
   - Chromium-based browsers (Chrome / Edge / Brave / Arc, etc.): enable Developer Mode, then choose `Load unpacked` and point it to the extension directory
   - Firefox: install it through `about:debugging` or `Install Add-on From File`

2. Open any Bilibili video page and start saving with the floating panel or shortcut
3. Click the extension entry in the browser toolbar to open the management center

### Method 2: Development / Build

Install root dependencies:

```bash
pnpm install
```

Install frontend and extension dependencies:

```bash
pnpm --dir frontend install
pnpm --dir extension install
```

Start extension dev mode:

```bash
pnpm ext:dev
```

Build all three browser targets:

```bash
pnpm ext:build:all
```

Package all three browser targets:

```bash
pnpm ext:zip:all
```

## Release Summary

### v1.0.1

Added:

1. Favorite-folder groups: folders can be assigned a group name and managed by group.
2. Collapsible/expandable favorite-folder groups: each group can be collapsed or expanded independently, and newly created groups appear above Ungrouped.
3. Custom-tag management with search and ascending/descending sorting by name, usage count, or creation time; clicking the same sort button again toggles its direction.
4. Support for more Bilibili content pages, including Bangumi, audio, AV-number videos, dynamic videos, and more.
5. Support for Firefox browser Multi-Account Containers and identity tabs.
6. A sponsor thanks list on the About page.

Improved:

1. The floating favorite button now uses a saved-state style and shows the BiliShelf favorite folders containing the current content.
2. Special content pages use their corresponding metadata APIs to identify titles, covers, authors, and dates, and remain searchable and manageable after saving.
3. Update checks now read store versions from the README and the GitHub version from the latest Release, with a GitHub Atom feed fallback.
4. The extension build reads the manifest version from `extension/package.json`, preventing version drift between the package, manifest, and UI.

Fixed:

1. Fixed the issue where the current version was shown as an older version or an outdated hard-coded version triggered a false update notification.
2. Fixed the issue where the favorite date `favoriteAt` property was overwritten.
3. Fixed the DeepSeek official API provider configuration.

### v1.0

Added:

1. Custom card sizes
2. AI organization
3. Article favorites
4. Comment favorites on video, Watch Later, and article pages
5. Scheduled backup reminders
6. Check for updates

Improved:

1. Runtime performance and the efficiency of video and tag synchronization
2. Overall UI/UX
3. Favorite-action listening is now enabled by default

Fixed:

1. Folder navigation and video content now scroll independently instead of moving together

### v0.1.5

- Added batch import for followed UPs and a dedicated "Followed UPs" page
- Fixed the issue where tags from deleted videos still remained in exports
- Fixed some basic WebDAV issues
- Improved the base styling of the management center
- Improved custom-tag selection when favoriting

### v0.1.4

- Added select-all support for sync import
- After syncing, folder lists now follow the original Bilibili folder order
- Added `folderCount` to exports
- Added invalid-video lookup / recovery support
- Added a quick favorite shortcut
- Added playlist playback for folders
- Added the ability to remove favorite relations by unchecking and confirming
- Added last-used folder memory
- Optimized export field order and kept compatibility with older imports
- Improved Toast feedback, favorite feedback, and overall UI/UX
- Removed the standalone backend and kept only the extension-embedded implementation

### v0.1.3

- Fixed the unusable unbranded Firefox build
- Releases started expanding to more browser channels

### v0.1.2

- Improved sync strategies for very large favorite libraries and reduced the chance of triggering risk control
- Added page-number jump input
- Added WebDAV support
- Added Bilibili favorite-action listening with automatic sync into the management center
- Fixed floating-panel position memory
- Fixed overlap between the batch bar and pagination bar
- Fixed fullscreen layering issues
- Fixed the missing floating button on Watch Later pages

### v0.1.1

- Improved exported information, including upload date and favorite date
- Video detail cards added:
  - uploader space links
  - manual completion / editing of video details

### v0.1.0

- First public release

## ⚠️ Notes

- Sync import can still be affected by Bilibili risk control, so a 100% trigger-free experience cannot be guaranteed
- If you encounter `412`:
  - first make sure you do not have duplicate manager tabs, multiple browser profiles, or stale extension instances still running
  - close those related pages, wait a moment, then reopen the extension and try again
- If WebDAV connectivity testing returns `409`:
  - it usually means the target path already exists but is not the expected directory structure, or the server does not allow the current write pattern
  - make sure you entered a directory path rather than a file path, and confirm that the account has permission to create and delete probe files in that location
- Regular exports are recommended to avoid accidental local data loss
- Pure local storage: personal favorite data is not uploaded, so privacy risk is relatively low
- If you run into problems, please open an `Issue`. Contributions through `PR`s are also welcome

## Project Structure

```text
bili-like/
├─ frontend/                 # Management center frontend (Vue 3 + Vite)
├─ extension/                # Browser extension (WXT)
├─ README.md
└─ README.en.md
```

## Tech Stack

- Frontend (`frontend/`): Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS, shadcn-vue, vue-toastification
- Extension (`extension/`): WXT (Chrome / Edge MV3 + Firefox MV2 builds), Background + IndexedDB local data layer, Content / Popup (TS / JS)
- Build and tooling: pnpm, tsup, tsx, Vite, WXT

## Thank you for your support

<img width="360" height="540" alt="3fe7edd8edbedf9cd0bd527376cf265e" src="https://github.com/user-attachments/assets/fe14c07b-8a25-4a8f-9872-7e2d8cb547a6" />
<img width="371" height="505" alt="41e01d51624c86f8b998a15284a7ed48" src="https://github.com/user-attachments/assets/61db8e6c-4f8d-4259-8349-dbcb50a870a3" />

## License

MIT © TLRK
