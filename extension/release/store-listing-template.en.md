# BiliShelf Helper (Store Listing Template)

## Short Description
Capture Bilibili videos quickly and save them into your local manager with multi-folder and tag support.

## Detailed Description
BiliShelf Helper is a productivity extension for building a searchable and structured Bilibili video collection.

Key features:
- Floating capture panel on `bilibili.com/video/*`
- Auto-read video metadata (BV, title, uploader, cover, description, system tags)
- Save to multiple folders and add custom tags
- Integrates with local manager backend API
- Light / Dark / Auto theme support

Best for:
- Learners and creators organizing reference videos
- Users who need long-term video curation and fast retrieval

## Permissions
- `storage`: store extension theme preference
- `activeTab`: sync theme update to active tab
- `https://www.bilibili.com/*`: inject capture UI on video pages
- `https://api.bilibili.com/*`: fetch video details and tags
- `http://127.0.0.1:4321/*` / `http://localhost:4321/*`: call local manager backend API

## What's New
- Migrated to WXT project structure for maintainability
- Added multi-browser build and zip workflow
