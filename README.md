# BiliShelf

<p align="center"><em><sub>引言，我想说的话：</sub></em></p>

你是否会因为b站收藏有数量限制，亦或者是搜索不好用而感到烦恼？我不知道有多少人和我一样，有这些问题：根据记忆里的关键词，检索不到曾经看过的视频，以及在收藏夹上限后，他们迫不得已转向其他方式记录：web端或是改成浏览器收藏夹记录，app端或是改用截图保存，再有甚者忍痛割爱删除曾经的收藏夹......

---

## 简介

一个替代bilibili收藏夹管理方案的浏览器插件，将视频信息收藏到本地，解决站内收藏夹数量限制和检索体验问题，支持多收藏夹和自定义标签的管理，以及全文检索、特殊关键词检索和批量管理。

## 功能说明

- 支持深色/浅色主题，i18n(CN/EN)
- 悬浮窗收藏视频
- 收藏夹的新建、删除、排序、检索，以及自定义简介
- 管理自定义标签
- 回收站功能
- 同步B站视频（暂未完善）
- 导出/导入备份，支持JSON/CSV格式
- 视频检索：默认检索视频的标题和tag，也可以通过组合字段tag使用：检索UP主、简介、用户的自定义tag
- 根据日期范围检索
- 批处理功能（移动 / 复制 / 删除）
- 可查看已收藏视频的卡片详情，一定程度上杜绝视频失效后无法知悉的“怅然若失”。

## 使用方法（详细）

### 方式一：普通用户（即装即用，推荐）

1. 在仓库根目录执行：
   ```bash
   pnpm ext:zip:all
   ```
2. 构建完成后，安装 `extension/.output/` 下对应浏览器的包：
   - `bilishelf-extension-0.1.0-chrome.zip`
   - `bilishelf-extension-0.1.0-edge.zip`
   - `bilishelf-extension-0.1.0-firefox.zip`
3. 在浏览器启用开发者模式并加载插件：
   - Chrome/Edge：加载解压后的目录（或按商店发布流程上架）
   - Firefox：可加载 `firefox` 对应包/目录（按 Firefox 开发者加载流程）
4. 打开任意 Bilibili 视频页，使用悬浮窗保存视频到本地收藏夹。
5. 点击浏览器插件按钮，打开管理中心进行检索、批处理、导入导出等操作。

### 方式二：贡献者（前后端开发模式）

1. 启动后端：
   ```bash
   cd backend
   pnpm install
   pnpm dev
   ```
2. 启动前端：
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```
3. 环境变量模板保留并按需复制：
   - `backend/.env.example`
   - `frontend/.env.example`
   - `frontend/.env.extension`

## 项目结构

- `frontend/`：管理中心前端（Vue 3）
- `backend/`：后端 API（Fastify + SQLite）
- `extension/`：浏览器插件（WXT）
- `docs/`：使用说明与文档

## 技术栈

- 前端：Vue 3 + TypeScript + Pinia + Vue Router + Vite
- 组件/UI：shadcn-vue + inspira-ui（已集成）+ vue-toastification
- 后端：Fastify + Drizzle ORM + SQLite
- 插件：WXT（Chrome/Edge/Firefox 多目标构建）

## 版权与开源

- Author: **TLRK**
- Copyright: **© 2026 TLRK**
- License: **MIT**（见 `LICENSE`）

## 声明

- 纯本地，无隐私风险问题。
- 目前一些问题，因为bilibili服务端风控原因，再加上个人水平有限，不好把控导入功能，可能实际用起来问题很大，请谅解。
- 因为暂时未接入云同步，所以使用时请一定要定期的导出备份。
- 如有其他问题请及时反馈issue，同时也欢迎贡献PR。

---

<details>
<summary><strong>English Version</strong></summary>

## Introduction

BiliShelf is a browser extension alternative to Bilibili favorites management.  
It stores video metadata locally, helping users overcome favorite-count limits and poor in-site search experience.

## Features

- Light/Dark theme, i18n (CN/EN)
- Floating panel capture on Bilibili video pages
- Folder create/delete/sort/search + custom folder description
- Custom tag management
- Trash & restore workflow
- Sync import from Bilibili favorites (still improving)
- Backup export/import in JSON/CSV
- Video search: default over title + tags, plus field-token search (uploader/description/custom tags)
- Date-range filtering
- Batch actions (move / copy / delete)
- Detailed video card view for archived metadata visibility

## Usage

### For normal users (install-and-use)

1. Build extension packages from repo root:
   ```bash
   pnpm ext:zip:all
   ```
2. Install packages from `extension/.output/` for your browser:
   - Chrome / Edge / Firefox zip outputs
3. Open a Bilibili video page and use the floating panel to save videos locally.
4. Open manager page from extension popup for search, batch operations, backup, etc.

### For contributors (frontend + backend)

1. Start backend:
   ```bash
   cd backend
   pnpm install
   pnpm dev
   ```
2. Start frontend:
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

## Project Structure & Stack

- `frontend/`: Vue 3 + TS + Pinia + Router
- `backend/`: Fastify + Drizzle + SQLite
- `extension/`: WXT extension project
- `docs/`: guides and docs

## Attribution & License

- Author: **TLRK**
- Copyright: **© 2026 TLRK**
- License: **MIT** (`LICENSE`)

## Notes

- Fully local-first, no cloud upload by default.
- Due to Bilibili risk-control behavior and sync complexity, import/sync may be unstable in some scenarios.
- Please export backups regularly (JSON/CSV) before large operations.
- Issues and PRs are welcome.

</details>
