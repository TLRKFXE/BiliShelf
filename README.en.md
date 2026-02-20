<p align="right"><a href="./README.md">中文</a></p>

# BiliShelf

<p align="center"><em style="font-size:0.95rem;">Introduction — Why I built this:</em></p>
<p align="center">
Have you ever felt blocked by Bilibili's favorites limit or poor search experience? I had the same pain: failing to find previously watched videos from memory keywords, then being forced to use workarounds when favorites hit the limit—web bookmarks, browser collections, screenshots, or even deleting old favorites.
</p>

---

BiliShelf is a browser extension that replaces the default Bilibili favorite-management workflow. It stores video metadata locally to bypass collection limits and improve search quality, with multi-folder organization, custom tags, full-text/field-aware lookup, and batch operations.

<img width="2460" height="1275" alt="image" src="https://github.com/user-attachments/assets/ff435a0d-3777-48ea-bf60-7217966d4c70" />

## Features

- Dark / Light themes and i18n (CN / EN)
- Floating collector panel on Bilibili video pages
- Folder create/delete/sort/search and custom folder descriptions
- Custom tag management
- Recycle bin workflow
- Bilibili sync import (**==still improving, the user experience may be poor, please use with caution, see the final note for details==**)
- Backup export/import in JSON and CSV
- Video search: default targets title + tags; fielded search supports uploader, description, and custom tags
- Date-range search
- Batch operations (move / copy / delete)
- Video detail cards to reduce metadata loss after link invalidation

## Usage

### Method 1: End users (install-and-use)

1. Go to repository `Releases` and download the package for your browser.
2. Unzip the package.
3. Open your browser extension page and install:
   - Chromium browsers (Chrome / Edge / Brave / Arc, etc.): enable Developer Mode, then `Load unpacked`.
   - Firefox: install via `about:debugging` or `Install Add-on From File`.
4. Open a Bilibili video page and use the floating panel to save videos locally.
5. Open manager page from extension popup for search, batch operations, backup, etc.

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
├─ backend/         # API service (Fastify + Drizzle ORM + SQLite)
├─ frontend/        # Manager frontend (Vue 3 + Vite)
├─ extension/       # Browser extension (WXT, multi-browser)
└─ README.md
```

## Tech Stack

- Frontend (`frontend/`): Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS, shadcn-vue, Inspira UI, vue-toastification
- Backend (`backend/`): Node.js, Fastify, Drizzle ORM, better-sqlite3 (SQLite), Zod, drizzle-kit
- Extension (`extension/`): WXT (Chrome/Edge MV3 + Firefox MV2 builds), Background + IndexedDB local data layer, Content/Popup in TS/JS
- Tooling: pnpm script orchestration, tsup, tsx, Vite, WXT

## Notice

- Local-first architecture: data stays on your machine by default.
- Sync import is still affected by Bilibili anti-abuse controls; reliability may vary in some scenarios.
- **==If you hit a `412` anti-abuse error, or the Bilibili favorites page returns no videos, close and reopen the extension, then try again.==**
- Cloud sync is not integrated yet, so regular backups are strongly recommended.
- Please open an `Issue` for bugs and feel free to contribute a `PR`.
- Extension-store publishing is planned for major browser marketplaces.

## License

MIT © TLRK
