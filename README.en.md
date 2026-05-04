<p align="right"><a href="./README.md">中文</a></p>

# <p align="center">BiliShelf</p>

<p align="center"><em style="font-size:0.2rem;">Introduction, what I want to say:</em></p>
<p align="center">
Have you ever felt frustrated by Bilibili's favorites limits or the weak search experience? I don't know how many people feel the same way I do, but I kept running into the same problems: I could remember keywords from a video I had watched before, yet still couldn't find it again. And once the favorite-folder limit was reached, people were forced into awkward workarounds: saving things in browser bookmarks on desktop, relying on screenshots on mobile, or even deleting old favorites they still cared about.
</p>

---

> A local-first browser extension for managing Bilibili favorites.
> It stores video metadata, folder relations, and tags locally, solves the limits of native Bilibili favorites and their weak search experience, and provides more flexible organization, search, sync, and backup workflows than the default Bilibili experience.
> Please read all notes carefully.

<img width="1111" height="744" alt="a2bd6a4d-5b3b-4768-aaf0-13a1e18d64fa" src="https://github.com/user-attachments/assets/4c5d155a-9e13-4645-ba23-4dfe993f8939" />

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
- Custom tags: manage tags and use existing tags for autocomplete / selection while favoriting
- Search capabilities:
  - global keyword search
  - filter by title, uploader, description, Bilibili tags, and custom tags
  - filter by date range
- Batch operations: move, copy, and delete videos
- Floating favorite panel: save videos directly from Bilibili video pages into local folders
- Quick favorite shortcut: default is `Ctrl+Alt+1`, then press `Enter` to confirm
- Clear already-favorited feedback: when favoriting the same video again, you can immediately see which folders it is already checked into
- Uncheck to remove: uncheck a folder in the favorite panel and confirm to remove that favorite relation
- Remember the last-used folder: convenient for repeated high-frequency organization
- Folder playlist playback: open playable videos from the current folder in sequence
- Followed UPs: batch import the current account's followed creators and quickly search / jump to their spaces inside the extension
- Sync import:
  - supports selecting Bilibili favorite folders and syncing them into local storage
  - processes folders one by one in the current list order instead of sending all requests at once
  - supports resume, automatic cooldown, and throttling strategies that try to reduce risk-control triggers
- Favorite-action listener: watch favorite actions on Bilibili and reconcile them back into local data
- Video detail cards for saved videos, reducing the "I know I saved something, but I no longer know what it was" problem after invalidation
- Invalid-video recovery: try to recover title, cover, and description for unavailable videos
- Import / export: supports `JSON` / `CSV`
- WebDAV backup: it is recommended to create the target directory in advance; supports configuration, connectivity testing, backup upload, download, and restore
- Management-center experience: supports dark / light themes and CN / EN switching

## Installation

### Method 1: Regular Users

1. Download:
   Store versions usually lag behind GitHub Releases.

   Extension stores:
   - Edge: `https://microsoftedge.microsoft.com/addons/detail/oimbmlmankjoinhkofhjainenmofcena`
   - Firefox: `https://addons.mozilla.org/en-GB/firefox/addon/bilishelf/`

   GitHub Releases:
   - `https://github.com/TLRKFXE/BiliShelf/releases`

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

## License

MIT © TLRK
