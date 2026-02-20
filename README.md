<p align="right"><a href="./README.en.md">English</a></p>

# <p align="center">BiliShelf</p>

<p align="center"><em style="font-size:0.2rem;">引言，我想说的话：</em></p>
<p align="center">
你是否会因为 b 站收藏有数量限制，亦或者是搜索不好用而感到烦恼？我不知道有多少人和我一样，有这些问题：根据记忆里的关键词，检索不到曾经看过的视频，以及在收藏夹上限后，他们迫不得已转向其他方式记录：web 端或是改成浏览器收藏夹记录，app 端或是改用截图保存，再有甚者忍痛割爱删除曾经的收藏夹……
</p>

---

一个替代 bilibili 收藏夹管理方案的浏览器插件，将视频信息收藏到本地，解决站内收藏夹数量限制和检索体验问题，支持多收藏夹和自定义标签的管理，以及全文检索、特殊关键词检索和批量管理。

<img width="2460" height="1275" alt="image" src="https://github.com/user-attachments/assets/ff435a0d-3777-48ea-bf60-7217966d4c70" />

## 功能说明

- 支持深色/浅色主题，i18n（CN/EN）
- 悬浮窗收藏视频
- 收藏夹的新建、删除、排序、检索，以及自定义简介
- 管理自定义标签
- 回收站功能
- 同步 B 站视频（**<font color="red">暂未完善，使用体验可能不佳，请谨慎使用，详情见最后说明</font>**）
- 导出/导入备份，支持 JSON/CSV 格式
- 视频检索：默认检索视频的标题和 tag，也可以通过组合字段 tag 使用：检索 UP 主、简介、用户的自定义 tag
- 根据日期范围检索
- 批处理功能（移动 / 复制 / 删除）
- 可查看已收藏视频的卡片详情，一定程度上杜绝视频失效后无法知悉的“怅然若失”

## 使用方法

### 方法一：普通用户（即装即用）

1. 前往仓库 `Releases` 页面，下载对应浏览器的插件压缩包。
2. 解压下载的插件包。
3. 打开浏览器扩展管理页面并安装：
   - Chromium 内核浏览器（Chrome / Edge / Brave / Arc 等）：开启开发者模式后，选择“加载已解压的扩展程序”，指向插件目录。
   - Firefox：通过“调试附加组件”或“从文件安装附加组件”安装对应包。
4. 打开任意 Bilibili 视频页，使用悬浮窗保存视频到本地收藏夹。
5. 点击浏览器插件按钮，打开管理中心进行检索、批处理、导入导出等操作。

### 方法二：贡献者（开发/构建）

1. 安装依赖：

   ```bash
   pnpm install
   ```

2. 运行 Web 管理端（前后端分离模式）：

   ```bash
   pnpm --dir backend install
   pnpm --dir backend dev
   pnpm --dir frontend install
   pnpm --dir frontend dev
   ```

3. 运行插件开发模式：

   ```bash
   pnpm ext:dev
   ```

4. 构建三端插件（Chrome / Edge / Firefox）：

   ```bash
   pnpm ext:build:all
   pnpm ext:zip:all
   ```

## 项目结构

```text
bili-like/
├─ backend/         # API 服务（Fastify + Drizzle ORM + SQLite）
├─ frontend/        # 管理中心前端（Vue 3 + Vite）
├─ extension/       # 浏览器插件（WXT，多浏览器构建）
└─ README.md
```

## 技术栈

- 前端（`frontend/`）：Vue 3、TypeScript、Vite、Pinia、Vue Router、Tailwind CSS、shadcn-vue、Inspira UI、vue-toastification
- 后端（`backend/`）：Node.js、Fastify、Drizzle ORM、better-sqlite3（SQLite）、Zod、drizzle-kit
- 插件（`extension/`）：WXT（Chrome/Edge MV3 + Firefox MV2 构建）、Background + IndexedDB 本地数据层、Content/Popup（TS/JS）
- 构建与工具链：pnpm 脚本编排、tsup、tsx、Vite、WXT

## 声明

- 纯本地存储，不上传个人收藏数据，隐私风险低。
- 目前同步功能仍受 bilibili 服务端风控影响，再加上个人能力有限，此功能在部分场景下可能不稳定，请谅解。
- **<font color="red">若出现 `412` 风控报错，或 B 站站内收藏夹页面打开后获取不到视频，请关闭并重新打开插件后再试，通常可恢复。</font>**
- 暂未接入云同步，使用时请务必定期导出备份。
- 如有问题请及时提交 `Issue`，也欢迎贡献 `PR`。
- 后续计划逐步上传至各大浏览器扩展商店，提供更直接的安装体验。

## License

MIT © TLRK
