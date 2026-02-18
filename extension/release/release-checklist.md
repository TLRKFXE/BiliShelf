# Release Checklist

## Pre-check
- Ensure backend API is running at `http://127.0.0.1:4321`
- Confirm extension version in `wxt.config.ts`
- Verify listing and privacy docs are updated:
  - `release/store-listing-template.zh-CN.md`
  - `release/store-listing-template.en.md`
  - `release/submission.chrome-edge.zh-CN.md`
  - `release/submission.chrome-edge.en.md`
  - `release/submission.firefox.zh-CN.md`
  - `release/submission.firefox.en.md`
  - `release/permission-qa-template.md`
  - `release/screenshots-checklist.md`
  - `release/privacy-policy.zh-CN.md`
  - `release/privacy-policy.en.md`

## Build & package
- Run from repo root:
  - `pnpm ext:release:prepare`
- Confirm generated outputs:
  - `.output/bilishelf-extension-0.1.0-chrome.zip`
  - `.output/bilishelf-extension-0.1.0-edge.zip`
  - `.output/bilishelf-extension-0.1.0-firefox.zip`
- Confirm release bundle directory:
  - `release/packages/YYYYMMDD`
  - `release/packages/YYYYMMDD/SHA256SUMS.txt`

## Store submission
- Chrome Web Store: upload Chrome zip
- Edge Add-ons: upload Edge zip
- Firefox AMO: upload Firefox zip (+ source zip if required)
- Fill store listing with template docs
- Add screenshots and update log
