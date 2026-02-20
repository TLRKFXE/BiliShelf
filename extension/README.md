# BiliShelf Extension (WXT)

This extension is the install-and-use edition of BiliShelf.

## What users get

- Floating collector panel on Bilibili video pages
- Local data storage in extension `IndexedDB`
- Full manager UI (same frontend app as web manager)
- Sync import from Bilibili favorites
- Export library to JSON/CSV

## Build/Dev Commands

```bash
cd extension
pnpm install
pnpm dev:chrome
```

Build:

```bash
pnpm build:all
```

Zip packages:

```bash
pnpm zip:all
```

Generated zips:
- `.output/bilishelf-extension-0.1.0-chrome.zip`
- `.output/bilishelf-extension-0.1.0-edge.zip`
- `.output/bilishelf-extension-0.1.0-firefox.zip`

## Packaging pipeline

Before WXT builds extension artifacts, scripts run:

1. `frontend` manager build in extension mode (`build:extension`)
2. Output to `extension/public/manager`
3. WXT build/zip for target browsers

This guarantees the extension manager page uses the same UI logic as `frontend/`.

## Key Files

- `entrypoints/background.ts`: local API, IndexedDB state, sync/export routes
- `content.js`: floating capture panel on Bilibili pages
- `popup.js`: popup settings + open manager
- `wxt.config.ts`: manifest and build config
