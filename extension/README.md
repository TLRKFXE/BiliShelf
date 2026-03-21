# BiliShelf Extension (WXT)

<p align="right"><a href="#english">English</a> | <a href="#中文">中文</a></p>

## 中文

这是 BiliShelf 的浏览器扩展版本，负责悬浮收藏、本地数据存储，以及内嵌的管理页。

### 用户可以获得

- 在 Bilibili 视频页使用悬浮收藏面板
- 数据保存在扩展本地 `IndexedDB`
- 与 Web 管理端共享逻辑的完整管理页 UI
- 从 Bilibili 收藏夹同步导入
- 导出 JSON / CSV 备份

### AI 收藏夹分类

- 在扩展管理页顶部使用 `AI 设置` 配置 provider、Base URL、model 和 API key。
- 在左侧边栏针对当前选中的收藏夹手动触发 `AI 分类`。
- 分类完成后会进入一个一次性的 AI 分类浏览页，先展示分类卡片总览，再进入分类详情查看视频。
- 视频详情弹窗会显示当前视频的单一 AI 主分类、分类时间，以及 provider/model。
- 该 AI 功能只存在于扩展本地运行时，不会给 `backend/` 增加 AI 路由或持久化逻辑。
- 当前支持的 provider 家族包括 OpenAI、OpenAI-compatible、Claude、Gemini、Grok、DeepSeek 和 Kimi。

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

2. 打开 GitHub `Releases` -> `Draft a new release`
3. `Tag` 建议使用 `v0.1.0`，`Target` 选择 `main`
4. 上传并发布以下附件：
   - `bilishelf-extension-0.1.0-chrome.zip`
   - `bilishelf-extension-0.1.0-edge.zip`
   - `bilishelf-extension-0.1.0-firefox.zip`
   - `SHA256SUMS.txt`

### 使用提示

- 如果遇到 `412` 风控错误，或 Bilibili 收藏夹页没有返回视频，关闭并重新打开扩展后再试，通常可以恢复。

### 打包流程说明

在 WXT 构建扩展产物前，会先执行：

1. 前端管理页 `build:extension`
2. 输出到 `extension/public/manager`
3. 再执行 WXT build / zip

这样可以确保扩展内管理页与 `frontend/` 保持同源逻辑。

### 关键文件

- `entrypoints/background.ts`：本地 API、IndexedDB 状态、同步 / 导出路由
- `entrypoints/content.ts`：WXT content 入口，加载 `content.js`
- `entrypoints/popup/main.ts`：popup 入口，加载 `popup.js`
- `content.js`：悬浮收藏 UI 逻辑
- `popup.js`：插件弹窗设置与打开管理页
- `wxt.config.ts`：manifest 与构建配置

---

## English

This is the install-and-use browser extension edition of BiliShelf.

### What users get

- Floating collector panel on Bilibili video pages
- Local data storage in extension `IndexedDB`
- Full manager UI with the same logic as the web manager frontend
- Sync import from Bilibili favorites
- Export backup to JSON / CSV

### AI Folder Categorization

- Use `AI Settings` in the extension manager header to configure provider, base URL, model, and API key.
- Trigger `AI 分类` manually for the currently selected folder from the left sidebar.
- After categorization finishes, the manager opens a one-time AI category browser that shows category cards first and then category detail browsing.
- Video detail dialogs show the video's single AI category, categorized time, and provider/model.
- This AI feature stays extension-only. It does not add AI routes or AI persistence to `backend/`.
- Supported provider families: OpenAI, OpenAI-compatible, Claude, Gemini, Grok, DeepSeek, and Kimi.

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

2. Open GitHub `Releases` -> `Draft a new release`
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
3. Then run WXT build / zip

This keeps the extension manager UI aligned with `frontend/`.

### Key Files

- `entrypoints/background.ts`: local API, IndexedDB state, sync / export routes
- `entrypoints/content.ts`: WXT content entry, loads `content.js`
- `entrypoints/popup/main.ts`: popup entry, loads `popup.js`
- `content.js`: floating collector UI logic
- `popup.js`: popup settings and open-manager action
- `wxt.config.ts`: manifest and build config
