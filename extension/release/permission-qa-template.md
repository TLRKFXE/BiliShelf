# Permission Q&A Template (Store Review)

Use these answers in Chrome Web Store / Edge Add-ons / Firefox review forms.

## `storage`
Used to persist extension UI preferences (theme mode: light/dark/auto).  
No personal profile data is stored.

## `activeTab`
Used to notify the currently active tab when theme preference changes, so the floating panel updates instantly.

## `https://www.bilibili.com/*`
Required to inject the content script on Bilibili video pages and capture visible video metadata.

## `https://api.bilibili.com/*`
Required to fetch official video details and tags (title/cover/description/tag data quality).

## `http://127.0.0.1:4321/*` and `http://localhost:4321/*`
Required to send captured data to the user’s local backend API for local collection management.

## Privacy statement
- No remote telemetry endpoint is configured by default
- No third-party ad/tracker SDK is included
- Data is processed only for the extension’s declared video-management features
