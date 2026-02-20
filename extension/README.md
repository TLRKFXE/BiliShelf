# BiliShelf Extension (WXT)

<p align="right"><a href="#english">English</a> | <a href="#中文">中文</a></p>

## 中文

这是 BiliShelf 的即装即用浏览器插件版本。

### 用户可获得

- 在 Bilibili 视频页使用悬浮收藏面板
- 数据本地存储于插件 `IndexedDB`
- 与 Web 管理端一致的完整管理页面 UI
- 从 Bilibili 收藏夹同步导入
- 导出 JSON/CSV 备份

### 开发与构建命令

```bash
cd extension
pnpm install
pnpm dev:chrome
```

构建三端：

```bash
pnpm build:all
```

打包三端：

```bash
pnpm zip:all
```

产物：

- `.output/bilishelf-extension-0.1.0-chrome.zip`
- `.output/bilishelf-extension-0.1.0-edge.zip`
- `.output/bilishelf-extension-0.1.0-firefox.zip`

### Release 发布（GitHub）

1. 先在仓库根目录运行：

```bash
pnpm ext:build:all
pnpm ext:zip:all
pnpm ext:release:prepare
```

2. 打开 GitHub `Releases` → `Draft a new release`
3. `Tag` 建议使用 `v0.1.0`，`Target` 选 `main`
4. 上传以下附件并发布：
   - `bilishelf-extension-0.1.0-chrome.zip`
   - `bilishelf-extension-0.1.0-edge.zip`
   - `bilishelf-extension-0.1.0-firefox.zip`
   - `SHA256SUMS.txt`

### 使用提示

- 若出现 `412` 风控报错，或 B 站站内收藏夹页面打开后获取不到视频，请关闭并重新打开插件后再试，通常可恢复。

### 打包流程说明

在 WXT 构建插件前，会先执行：

1. 前端管理页 `build:extension`
2. 输出到 `extension/public/manager`
3. 再进行 WXT build/zip

这样可确保插件管理页与 `frontend/` 同源同逻辑。

### 关键文件

- `entrypoints/background.ts`：本地 API、IndexedDB 状态、同步/导出路由
- `entrypoints/content.ts`：WXT content 入口（加载 `content.js`）
- `entrypoints/popup/main.ts`：popup 入口（加载 `popup.js`）
- `content.js`：悬浮收藏 UI 逻辑
- `popup.js`：插件弹窗设置与打开管理页
- `wxt.config.ts`：manifest 与构建配置

---

## English

This is the install-and-use browser extension edition of BiliShelf.

### What users get

- Floating collector panel on Bilibili video pages
- Local data storage in extension `IndexedDB`
- Full manager UI (same logic as web manager frontend)
- Sync import from Bilibili favorites
- Export backup to JSON/CSV

### Dev / Build Commands

```bash
cd extension
pnpm install
pnpm dev:chrome
```

Build all targets:

```bash
pnpm build:all
```

Zip all targets:

```bash
pnpm zip:all
```

Generated artifacts:

- `.output/bilishelf-extension-0.1.0-chrome.zip`
- `.output/bilishelf-extension-0.1.0-edge.zip`
- `.output/bilishelf-extension-0.1.0-firefox.zip`

### GitHub Release

1. From repo root, run:

```bash
pnpm ext:build:all
pnpm ext:zip:all
pnpm ext:release:prepare
```

2. Open GitHub `Releases` → `Draft a new release`
3. Use `v0.1.0` as `Tag`, target `main`
4. Upload and publish:
   - `bilishelf-extension-0.1.0-chrome.zip`
   - `bilishelf-extension-0.1.0-edge.zip`
   - `bilishelf-extension-0.1.0-firefox.zip`
   - `SHA256SUMS.txt`

### Usage Tip

- If you hit a `412` anti-abuse error, or the Bilibili favorites page returns no videos, close and reopen the extension, then try again.

### Packaging Pipeline

Before WXT builds extension artifacts:

1. Build frontend manager with `build:extension`
2. Output to `extension/public/manager`
3. Then run WXT build/zip

This keeps extension manager UI fully aligned with `frontend/`.

### Key Files

- `entrypoints/background.ts`: local API, IndexedDB state, sync/export routes
- `entrypoints/content.ts`: WXT content entry (loads `content.js`)
- `entrypoints/popup/main.ts`: popup entry (loads `popup.js`)
- `content.js`: floating collector UI logic
- `popup.js`: popup settings + open manager
- `wxt.config.ts`: manifest and build config
