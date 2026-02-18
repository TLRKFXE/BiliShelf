# BiliShelf

本地部署的 B 站收藏管理方案（MVP）。

目标：解决站内收藏夹数量和检索体验问题，支持多收藏夹、标签管理、全文检索，并为后续云同步和浏览器插件扩展预留能力。

## 技术栈

- 后端：`Fastify + TypeScript + Drizzle ORM + SQLite`
- 前端：`Vue 3 + Vite + Tailwind + shadcn 风格组件`
- 检索：`SQLite FTS5`
- 插件（MVP）：`Chrome/Edge Manifest V3`

## 本地启动（不使用 Docker）

### 1) 后端

```bash
cd backend
pnpm install
pnpm dev
```

- 默认地址：`http://127.0.0.1:4321`
- 健康检查：`GET /api/health`

### 2) 前端

```bash
cd frontend
pnpm install
pnpm dev
```

- 默认地址：`http://127.0.0.1:5173`

## 当前已实现

### 后端能力

- 收藏夹：创建、查询、更新、删除
- 视频：创建（含去重更新）、查询、删除
- 关系：视频与收藏夹多对多、视频与标签多对多
- 标签：系统标签 + 自定义标签
- 检索：
  - 全局检索
  - 单收藏夹检索
  - 标签过滤

### 前端能力

- 收藏夹侧边栏（创建、切换）
- 新增视频表单（可归档到多个收藏夹、输入标签）
- 视频卡片展示（标题、封面、UP、简介、标签、收藏时间）
- 全局/单收藏夹搜索 + 标签筛选

### 本地数据存储

- SQLite 文件位置：`backend/data/app.db`
- FTS5 索引与触发器初始化：`backend/src/db/init.ts`

## 已实现 API（MVP）

- `GET /api/health`
- `GET /api/folders`
- `POST /api/folders`
- `PATCH /api/folders/:id`
- `DELETE /api/folders/:id`
- `GET /api/folders/:id/videos`
- `POST /api/videos`
- `GET /api/videos`
- `GET /api/videos/:id`
- `DELETE /api/videos/:id`
- `POST /api/videos/:id/folders/:folderId`
- `DELETE /api/videos/:id/folders/:folderId`
- `POST /api/videos/:id/tags`
- `DELETE /api/videos/:id/tags/:tagId`
- `GET /api/videos/search`
- `GET /api/tags`

## 浏览器插件（当前实现）

目录：`extension`

- `manifest.json`：MV3 配置
- `content.js`：从当前视频页读取 BV 和基础字段
- `popup.js`：
  - 通过官方 API 获取干净元数据（标题、封面、简介、UP）
  - 保存时把 `publishAt` 设置为“收藏时间”
  - 分区固定为 `uncategorized`（按你要求暂不抓取分区）

## 关键语义说明

- 收藏时间：当前版本使用 `publishAt=保存时刻` 表示收藏时间。
- 单收藏夹列表和搜索结果：优先展示并按 `addedAt`（加入该收藏夹时间）排序。
- 简介来源：优先官方 API 的 `desc`，避免页面噪音文本（播放量、推荐标题等）。

## 后续建议

1. 插件里自动读取收藏夹列表，避免手填 ID。
2. 支持从 B 站“收藏夹页面”批量导入。
3. 增加“视频编辑 / 移动收藏夹 / 批量删除”。
4. 最后阶段接入云同步。
