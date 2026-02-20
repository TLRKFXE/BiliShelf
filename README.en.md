<p align="right"><a href="./README.md">中文</a></p>

# BiliShelf

<p align="center"><em style="font-size:0.95rem;">Introduction — Why I built this:</em></p>
<p align="center">
Have you ever felt blocked by Bilibili's favorites limit or poor search experience? I had the same pain: failing to find previously watched videos from memory keywords, then being forced to use workarounds when favorites hit the limit—web bookmarks, browser collections, screenshots, or even deleting old favorites.
</p>

BiliShelf is a browser extension that replaces the default Bilibili favorite-management workflow. It stores video metadata locally to bypass collection limits and improve search quality, with multi-folder organization, custom tags, full-text/field-aware lookup, and batch operations.

## Features

- Dark / Light themes and i18n (CN / EN)
- Floating collector panel on Bilibili video pages
- Folder create/delete/sort/search and custom folder descriptions
- Custom tag management
- Recycle bin workflow
- Bilibili sync import (still improving)
- Backup export/import in JSON and CSV
- Video search: default targets title + tags; fielded search supports uploader, description, and custom tags
- Date-range search
- Batch operations (move / copy / delete)
- Video detail cards to reduce metadata loss after link invalidation

## Usage

### Method 1: End users (install-and-use)

1. Go to repository `Releases` and download the package for your browser.
2. Unzip the package (or keep the single-file installer as-is if provided).
3. Open your browser extension page and install:
   - Chromium browsers (Chrome / Edge / Brave / Arc, etc.): enable Developer Mode, then `Load unpacked`.
   - Firefox: install via `about:debugging` or `Install Add-on From File`.
4. Pin the extension icon, open popup, then open Manager to start saving/searching locally.

### Method 2: Contributors (dev/build)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run web manager (frontend + backend):

   ```bash
   pnpm --dir backend install
   pnpm --dir backend dev
   pnpm --dir frontend install
   pnpm --dir frontend dev
   ```

3. Run extension in dev mode:

   ```bash
   pnpm ext:dev
   ```

4. Build and zip all browser targets:

   ```bash
   pnpm ext:build:all
   pnpm ext:zip:all
   ```

## Project Structure

```text
bili-like/
├─ backend/         # API service (Fastify + Prisma)
├─ frontend/        # Manager frontend (Vue 3 + Vite)
├─ extension/       # Browser extension (WXT, multi-browser)
├─ docs/            # Documentation
└─ README.md
```

## Tech Stack

- Frontend: Vue 3, TypeScript, Vite, Pinia, Vue Router, shadcn-vue, Inspira UI
- Backend: Node.js, Fastify, Prisma, SQLite
- Extension: WXT (Manifest V3 / Firefox)
- Build tooling: pnpm workspace

## Notice

- Local-first architecture: data stays on your machine by default.
- Sync import is still affected by Bilibili anti-abuse controls; reliability may vary in some scenarios.
- Cloud sync is not integrated yet, so regular backups are strongly recommended.
- Please open an `Issue` for bugs and feel free to contribute a `PR`.
- Extension-store publishing is planned for major browser marketplaces.

## License

MIT © TLRK
