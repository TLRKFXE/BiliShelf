import type { Locale } from "@/stores/app-ui";

export const MANAGER_I18N: Record<string, Record<Locale, string>> = {
  "header.title": {
    "zh-CN": "BiliShelf 管理中心",
    "en-US": "BiliShelf Manager",
  },
  "locale.toggle": { "zh-CN": "EN", "en-US": "中文" },
  "theme.switchToLight": {
    "zh-CN": "切换到浅色模式",
    "en-US": "Switch to light mode",
  },
  "theme.switchToDark": {
    "zh-CN": "切换到深色模式",
    "en-US": "Switch to dark mode",
  },
  "header.subtitle": {
    "zh-CN": "把喜欢的视频收进自己的本地收藏架。",
    "en-US":
      "A local shelf for the Bilibili videos you want to keep.",
  },
  "header.credit": {
    "zh-CN": "By TLRK · © 2026 TLRK · MIT License",
    "en-US": "By TLRK · © 2026 TLRK · MIT License",
  },
  "header.manageTags": {
    "zh-CN": "管理自定义标签",
    "en-US": "Manage Custom Tags",
  },
  "header.aiSettings": {
    "zh-CN": "AI 设置",
    "en-US": "AI Settings",
  },
  "header.aiOrganizer": {
    "zh-CN": "AI 整理",
    "en-US": "AI Organizer",
  },
  "header.syncSettings": {
    "zh-CN": "监听设置",
    "en-US": "Listener Settings",
  },
  "header.webdavSettings": {
    "zh-CN": "WebDAV 备份",
    "en-US": "WebDAV Backup",
  },
  "header.syncImport": { "zh-CN": "同步 B 站", "en-US": "Sync Bilibili" },
  "header.dataTransfer": { "zh-CN": "导入/导出", "en-US": "Import / Export" },
  "header.dataTransferDesc": {
    "zh-CN": "JSON 完整备份包含视频、关注 UP、评论、专栏和收藏夹关系；CSV 仅适合交换视频表格。",
    "en-US": "JSON full backups include videos, followed UPs, comments, articles, and folder relations; CSV is for video tables.",
  },
  "header.followingUps": { "zh-CN": "关注 UP", "en-US": "Following UPs" },
  "header.comments": { "zh-CN": "评论收藏", "en-US": "Saved Comments" },
  "header.articles": { "zh-CN": "专栏收藏", "en-US": "Saved Articles" },
  "header.groupContent": { "zh-CN": "内容收藏", "en-US": "Content" },
  "header.groupData": { "zh-CN": "数据与同步", "en-US": "Data & Sync" },
  "header.groupTools": { "zh-CN": "整理工具", "en-US": "Tools" },
  "header.syncing": { "zh-CN": "同步中...", "en-US": "Syncing..." },
  "header.moreActions": { "zh-CN": "更多", "en-US": "More" },
  "header.importData": { "zh-CN": "导入备份", "en-US": "Import Backup" },
  "header.exportBackup": { "zh-CN": "导出备份", "en-US": "Export Backup" },
  "header.exportDialogTitle": {
    "zh-CN": "选择导出格式",
    "en-US": "Choose export format",
  },
  "header.exportDialogDesc": {
    "zh-CN": "JSON 会完整包含视频、标签、评论和专栏收藏；CSV 仅包含视频数据。",
    "en-US":
      "JSON includes videos, tags, saved comments, and saved articles; CSV contains video data only.",
  },
  "header.exportJson": { "zh-CN": "导出 JSON 完整备份", "en-US": "Export full JSON backup" },
  "header.exportJsonDescription": {
    "zh-CN": "包含视频、视频文件夹、关注 UP、评论、专栏及专栏文件夹。",
    "en-US": "Includes videos, video folders, followed UPs, comments, articles, and article folders.",
  },
  "header.exportCsv": { "zh-CN": "导出 CSV（仅视频）", "en-US": "Export CSV (videos only)" },
  "header.exportCsvDescription": {
    "zh-CN": "仅用于查看或交换视频表格，不是完整备份。",
    "en-US": "For viewing or exchanging the video table only; this is not a full backup.",
  },
  "header.exportCsvWarningTitle": {
    "zh-CN": "CSV 不包含完整数据",
    "en-US": "CSV does not contain all data",
  },
  "header.exportCsvWarningDescription": {
    "zh-CN": "CSV 不会导出关注 UP、评论收藏、专栏收藏、专栏文件夹及其关系。需要备份或迁移全部数据时，必须选择 JSON。",
    "en-US": "CSV excludes followed UPs, saved comments, saved articles, article folders, and their relations. Use JSON for complete backup or migration.",
  },
  "header.openTrash": { "zh-CN": "打开回收站", "en-US": "Open Trash" },
  "header.backManager": { "zh-CN": "返回管理页", "en-US": "Back To Manager" },
  "mobile.browseFolders": { "zh-CN": "收藏夹", "en-US": "Folders" },
  "mobile.allVideos": { "zh-CN": "全部视频", "en-US": "All videos" },
  "mobile.resultCount": { "zh-CN": "{count} 条", "en-US": "{count}" },
  "mobile.folderDrawerTitle": {
    "zh-CN": "选择收藏夹",
    "en-US": "Choose a folder",
  },
  "mobile.folderDrawerDescription": {
    "zh-CN": "搜索或选择一个收藏夹来更新当前视频列表。",
    "en-US": "Search or choose a folder to update the current video list.",
  },
  "mobile.scope": { "zh-CN": "当前范围", "en-US": "Current scope" },
  "view.manager": { "zh-CN": "视图：管理页", "en-US": "View: Manager" },
  "view.trash": { "zh-CN": "视图：回收站", "en-US": "View: Trash Bin" },
  "view.followingUps": { "zh-CN": "视图：关注 UP", "en-US": "View: Following UPs" },
  "view.comments": { "zh-CN": "视图：评论收藏", "en-US": "View: Saved Comments" },
  "view.articles": { "zh-CN": "视图：专栏收藏", "en-US": "View: Saved Articles" },
  "scope.trash": { "zh-CN": "范围：回收站", "en-US": "Scope: Recycle Bin" },
  "scope.followingUps": {
    "zh-CN": "范围：关注 UP 快捷导航",
    "en-US": "Scope: Following UP navigation",
  },
  "scope.folder": {
    "zh-CN": "当前收藏夹：{name}",
    "en-US": "Current Folder: {name}",
  },
  "batch.open": { "zh-CN": "批处理", "en-US": "Batch" },
  "batch.close": { "zh-CN": "关闭批处理", "en-US": "Close Batch" },
  "batch.selectPage": { "zh-CN": "全选当前页", "en-US": "Select Current Page" },
  "batch.clear": { "zh-CN": "清空选择", "en-US": "Clear Selection" },
  "batch.selected": {
    "zh-CN": "已选 {count} 个视频",
    "en-US": "Selected {count} videos",
  },
  "batch.targetFolder": { "zh-CN": "目标收藏夹", "en-US": "Target Folder" },
  "batch.removeCurrent": {
    "zh-CN": "从当前收藏夹移除",
    "en-US": "Remove From Current Folder",
  },
  "batch.copyTo": { "zh-CN": "复制到", "en-US": "Copy To" },
  "batch.moveTo": { "zh-CN": "移动到", "en-US": "Move To" },
  "batch.deleteTrash": { "zh-CN": "移入回收站", "en-US": "Delete To Trash" },
  "common.page": {
    "zh-CN": "第 {page}/{totalPage} 页 · 共 {total}",
    "en-US": "Page {page}/{totalPage} · Total {total}",
  },
  "common.perPage": { "zh-CN": "每页", "en-US": "Per page" },
  "common.prev": { "zh-CN": "上一页", "en-US": "Prev" },
  "common.next": { "zh-CN": "下一页", "en-US": "Next" },
  "common.jump": { "zh-CN": "跳转", "en-US": "Jump" },
  "common.pageJumpPlaceholder": { "zh-CN": "页码", "en-US": "Page" },
  "common.cancel": { "zh-CN": "取消", "en-US": "Cancel" },
  "common.confirm": { "zh-CN": "确认", "en-US": "Confirm" },
  "common.apply": { "zh-CN": "应用", "en-US": "Apply" },
  "common.refresh": { "zh-CN": "刷新", "en-US": "Refresh" },
  "common.close": { "zh-CN": "关闭", "en-US": "Close" },
  "common.delete": { "zh-CN": "删除", "en-US": "Delete" },
  "common.create": { "zh-CN": "创建", "en-US": "Create" },
  "common.rename": { "zh-CN": "重命名", "en-US": "Rename" },
  "common.clear": { "zh-CN": "清空", "en-US": "Clear" },
  "common.restore": { "zh-CN": "恢复", "en-US": "Restore" },
  "common.deleteForever": { "zh-CN": "永久删除", "en-US": "Delete Forever" },
  "common.deleteSelected": { "zh-CN": "删除已选", "en-US": "Delete Selected" },
  "common.selectAll": { "zh-CN": "全选", "en-US": "Select All" },
  "common.selected": { "zh-CN": "已选 {count}", "en-US": "Selected {count}" },
  "common.videosCount": {
    "zh-CN": "{count} 个视频",
    "en-US": "{count} videos",
  },
  "common.requestFailed": {
    "zh-CN": "请求失败，请重试。",
    "en-US": "Request failed. Please retry.",
  },
  "search.applyDateFilter": {
    "zh-CN": "应用日期筛选",
    "en-US": "Apply Date Filter",
  },
  "search.to": { "zh-CN": "至", "en-US": "to" },
  "video.cardSize": { "zh-CN": "视频卡片宽度", "en-US": "Video card width" },
  "settings.title": { "zh-CN": "设置", "en-US": "Settings" },
  "settings.ai": { "zh-CN": "AI 设置", "en-US": "AI" },
  "settings.listener": { "zh-CN": "监听设置", "en-US": "Listener" },
  "settings.tagEnrichment": { "zh-CN": "标签补全", "en-US": "Tag Enrichment" },
  "settings.tagEnrichmentTitle": {
    "zh-CN": "标签补全速率",
    "en-US": "Tag enrichment rate",
  },
  "settings.tagEnrichmentDescription": {
    "zh-CN": "设置每批处理数量和批次间基础间隔。设置会保存在后台任务中，关闭管理页后仍然生效。",
    "en-US": "Set the number processed per batch and the base interval between batches. Settings persist in the background task after the manager is closed.",
  },
  "settings.tagBatchSize": {
    "zh-CN": "每批视频数量",
    "en-US": "Videos per batch",
  },
  "settings.tagInterval": {
    "zh-CN": "批次基础间隔",
    "en-US": "Base batch interval",
  },
  "settings.tagEnrichmentLimits": {
    "zh-CN": "允许每批 {batchMin}-{batchMax} 条、间隔 {intervalMin}-{intervalMax} 秒。实际批次间隔会额外加入 0-10 秒随机抖动，单条请求也保留安全间隔；提高速率会增加触发 B 站风控的风险。",
    "en-US": "Allowed range: {batchMin}-{batchMax} videos and {intervalMin}-{intervalMax}s. The actual batch interval adds 0-10s of jitter and keeps a safe delay between requests; higher rates increase Bilibili risk-control exposure.",
  },
  "settings.saveTagEnrichment": {
    "zh-CN": "保存补全速率",
    "en-US": "Save enrichment rate",
  },
  "settings.language": { "zh-CN": "语言", "en-US": "Language" },
  "settings.theme": { "zh-CN": "主题", "en-US": "Theme" },
  "settings.cardSize": { "zh-CN": "卡片大小", "en-US": "Card Size" },
  "settings.cardSizeTitle": { "zh-CN": "分别调整卡片宽度", "en-US": "Adjust card widths independently" },
  "settings.cardSizeDescription": {
    "zh-CN": "视频、评论收藏和专栏收藏分别使用独立宽度设置。",
    "en-US": "Videos, saved comments, and saved articles each use an independent width.",
  },
  "settings.languageTitle": { "zh-CN": "界面语言", "en-US": "Interface language" },
  "settings.themeTitle": { "zh-CN": "界面主题", "en-US": "Interface theme" },
  "settings.light": { "zh-CN": "浅色", "en-US": "Light" },
  "settings.dark": { "zh-CN": "深色", "en-US": "Dark" },
  "settings.cardSizeHint": {
    "zh-CN": "每项输入 {min}-{max} 之间的像素值；数值越大，该类卡片每行显示的数量越少。",
    "en-US": "Enter {min}-{max}px for each type; larger values show fewer cards of that type per row.",
  },
  "settings.saveAi": { "zh-CN": "保存 AI 设置", "en-US": "Save AI Settings" },
  "settings.saveListener": { "zh-CN": "保存监听设置", "en-US": "Save Listener Settings" },
  "settings.about": { "zh-CN": "关于", "en-US": "About" },
  "settings.aboutTitle": { "zh-CN": "BiliShelf", "en-US": "BiliShelf" },
  "settings.aboutDescription": {
    "zh-CN": "商店安装通常由浏览器自动更新；手动安装版本可通过 GitHub Releases 获取新版本。",
    "en-US": "Store installs are normally updated by the browser; manual installs can get new versions from GitHub Releases.",
  },
  "settings.currentVersion": { "zh-CN": "当前版本", "en-US": "Current version" },
  "settings.updateChannel": { "zh-CN": "当前渠道", "en-US": "Update channel" },
  "settings.channel.chrome": { "zh-CN": "Chrome", "en-US": "Chrome" },
  "settings.channel.edge": { "zh-CN": "Edge", "en-US": "Edge" },
  "settings.channel.firefox": { "zh-CN": "Firefox", "en-US": "Firefox" },
  "settings.storeVersion": { "zh-CN": "商店版本", "en-US": "Store version" },
  "settings.githubVersion": { "zh-CN": "GitHub 版本", "en-US": "GitHub version" },
  "settings.notPublished": { "zh-CN": "未发布或未配置", "en-US": "Not published or configured" },
  "settings.sponsorThanks": { "zh-CN": "赞助感谢名单", "en-US": "Sponsor thanks" },
  "settings.sponsorThanksDescription": {
    "zh-CN": "感谢支持 BiliShelf 的用户。",
    "en-US": "Thank you to the users who support BiliShelf.",
  },
  "settings.storeReady": { "zh-CN": "商店已发布", "en-US": "Available in store" },
  "settings.storePending": { "zh-CN": "商店审核中", "en-US": "Store review pending" },
  "settings.storePendingDescription": {
    "zh-CN": "GitHub 已有较新版本，商店渠道可能还在审核或同步。将优先打开商店，也可直接查看 GitHub Release。",
    "en-US": "GitHub has a newer version, while the store may still be reviewing or syncing it. The store is preferred, but you can open the GitHub Release directly.",
  },
  "settings.updateAvailable": { "zh-CN": "发现新版本 {version}", "en-US": "Update available: {version}" },
  "settings.checkUpdate": { "zh-CN": "检查更新", "en-US": "Check for updates" },
  "settings.openStore": { "zh-CN": "打开扩展商店", "en-US": "Open extension store" },
  "settings.openGithubRelease": { "zh-CN": "打开 GitHub Release", "en-US": "Open GitHub Release" },
  "settings.openGithub": { "zh-CN": "GitHub 仓库", "en-US": "GitHub repository" },
  "settings.lastChecked": { "zh-CN": "上次检查：{time}", "en-US": "Last checked: {time}" },
  "settings.updateCheckFailed": { "zh-CN": "更新检查失败：{error}", "en-US": "Update check failed: {error}" },
  "toast.extensionUpdated": { "zh-CN": "插件已更新到 {version}", "en-US": "Extension updated to {version}" },
  "toast.extensionUpdatedDesc": {
    "zh-CN": "本次从 {previous} 更新，已准备好使用最新功能。",
    "en-US": "Updated from {previous}; the latest features are ready to use.",
  },
  "toast.extensionUpdateAvailable": { "zh-CN": "发现新版本 {version}", "en-US": "Update available: {version}" },
  "toast.extensionUpToDate": { "zh-CN": "当前已是最新版本", "en-US": "You are up to date" },
  "toast.extensionUpdateCheckFail": { "zh-CN": "检查更新失败", "en-US": "Update check failed" },
  "sync.dialogTitle": {
    "zh-CN": "同步B站",
    "en-US": "Sync Bilibili",
  },
  "sync.dialogDesc": {
    "zh-CN":
      "分别管理视频同步和标签补全；两项任务都会保存进度，可关闭管理页后继续执行。",
    "en-US":
      "Manage video sync and tag enrichment separately. Both persist progress and can continue after the manager closes.",
  },
  "sync.videoTab": { "zh-CN": "同步视频", "en-US": "Sync videos" },
  "sync.tagTab": { "zh-CN": "补全标签", "en-US": "Enrich tags" },
  "sync.tagScopeTitle": { "zh-CN": "选择标签补全范围", "en-US": "Choose tag scope" },
  "sync.tagScopeDesc": {
    "zh-CN": "选择一个或多个本地收藏夹，只为其中尚未获取 B 站标签的视频补全。重复视频只处理一次。",
    "en-US": "Choose local folders and enrich only videos still missing Bilibili tags. Duplicate videos are processed once.",
  },
  "sync.tagFolderCount": {
    "zh-CN": "已选 {selected} / {total} 个收藏夹",
    "en-US": "{selected} / {total} folders selected",
  },
  "sync.tagScopeVideoCount": {
    "zh-CN": "当前任务范围 {count} 个视频",
    "en-US": "{count} videos in current task",
  },
  "sync.folderCount": {
    "zh-CN": "已选 {selected} / {total}",
    "en-US": "Selected {selected} / {total}",
  },
  "sync.reloadFolders": {
    "zh-CN": "重新获取收藏夹",
    "en-US": "Reload folders",
  },
  "sync.chunkSizeTitle": {
    "zh-CN": "每批导入数量",
    "en-US": "Chunk size per round",
  },
  "sync.chunkSizeOption": {
    "zh-CN": "{count} 条/批",
    "en-US": "{count} per round",
  },
  "sync.autoChunkHint": {
    "zh-CN":
      "系统会按“每批数量”自动分批导入，并在批次之间自动等待，直到该收藏夹导入完成。",
    "en-US":
      "Import runs in chunks automatically with wait intervals between rounds until this folder is done.",
  },
  "sync.queueHint": {
    "zh-CN":
      "已选收藏夹会按当前列表顺序逐个同步，系统会根据收藏夹体量和页面响应自动调速，以尽量降低风控概率。",
    "en-US":
      "Selected folders are synced one by one in the current list order, with wait times adjusted automatically based on folder size and response speed.",
  },
  "sync.includeTagEnrichmentHint": {
    "zh-CN":
      "在视频同步过程中同时抓取 B 站标签（更完整但更慢）。也可以在“补全标签”中单独发起任务。",
    "en-US":
      "Fetch Bilibili tags during video sync (more complete but slower), or start a separate job from Tag enrichment.",
  },
  "sync.tagEnrichDisabledHint": {
    "zh-CN":
      "主同步默认不抓取 archive-tags；需要时可切换到“补全标签”，选择本地收藏夹并独立发起任务。",
    "en-US":
      "Archive-tags are skipped during video sync. Open Tag enrichment, select local folders, and start a separate job when needed.",
  },
  "sync.resumeHint": {
    "zh-CN": "检测到上次中断进度：将从第 {page} 页继续导入。",
    "en-US": "Detected previous progress: import will resume from page {page}.",
  },
  "sync.singleFolderHint": {
    "zh-CN": "为稳定性考虑，当前一次仅允许同步一个收藏夹。",
    "en-US": "For stability, only one folder can be synced per run.",
  },
  "sync.loadingFolders": {
    "zh-CN": "正在获取收藏夹列表...",
    "en-US": "Loading folder list...",
  },
  "sync.emptyFolders": {
    "zh-CN": "未获取到可同步收藏夹。",
    "en-US": "No syncable folders found.",
  },
  "sync.remoteVideoCount": {
    "zh-CN": "B 站收藏 {count} 条",
    "en-US": "{count} videos on Bilibili",
  },
  "sync.startImport": { "zh-CN": "开始同步", "en-US": "Start sync" },
  "sync.statusTitle": { "zh-CN": "同步任务", "en-US": "Sync job" },
  "sync.openMonitor": { "zh-CN": "打开监控", "en-US": "Open monitor" },
  "sync.statusReady": { "zh-CN": "等待开始", "en-US": "Ready to start" },
  "sync.currentWork": { "zh-CN": "当前进度", "en-US": "Current progress" },
  "sync.preparing": { "zh-CN": "正在准备收藏夹", "en-US": "Preparing folders" },
  "sync.page": { "zh-CN": "第 {page} 页", "en-US": "Page {page}" },
  "sync.retryAt": {
    "zh-CN": "可恢复时间 {time}，剩余约 {seconds} 秒。",
    "en-US": "Resume available at {time}, about {seconds}s remaining.",
  },
  "scope.comments": {
    "zh-CN": "范围：全部评论收藏",
    "en-US": "Scope: All saved comments",
  },
  "scope.articles": {
    "zh-CN": "范围：全部专栏收藏",
    "en-US": "Scope: All saved articles",
  },
  "scope.articleFolder": {
    "zh-CN": "专栏文件夹：{name}",
    "en-US": "Article folder: {name}",
  },
  "sync.resumeNow": { "zh-CN": "继续同步", "en-US": "Resume sync" },
  "sync.restart": { "zh-CN": "重新开始", "en-US": "Restart" },
  "sync.stop": { "zh-CN": "停止同步", "en-US": "Stop sync" },
  "sync.stopping": { "zh-CN": "正在停止", "en-US": "Stopping" },
  "sync.scanned": { "zh-CN": "已扫描", "en-US": "Scanned" },
  "sync.upserted": { "zh-CN": "已写入", "en-US": "Upserted" },
  "sync.linked": { "zh-CN": "新增关系", "en-US": "New links" },
  "sync.skipped": { "zh-CN": "跳过项", "en-US": "Skipped" },
  "sync.unresolved": { "zh-CN": "未解析", "en-US": "Unresolved" },
  "sync.unavailable": { "zh-CN": "B站未返回", "en-US": "Not returned" },
  "sync.unavailableHint": {
    "zh-CN": "有 {count} 条未由 B 站返回，通常是失效、私密或不可见视频；其余内容已同步，本轮未执行删除。",
    "en-US": "{count} entries were not returned by Bilibili, usually because they are invalid, private, or unavailable. Other items were synced; no deletions were applied.",
  },
  "sync.invalidDetected": { "zh-CN": "已识别失效", "en-US": "Invalid videos" },
  "sync.invalidDetectedHint": {
    "zh-CN": "B站返回的数据中识别到 {count} 条失效视频；已保留其收藏记录，不影响本次同步成功。",
    "en-US": "Bilibili returned {count} invalid videos. Their saved records were preserved and do not prevent this sync from succeeding.",
  },
  "sync.dismissStatus": { "zh-CN": "关闭本次状态", "en-US": "Dismiss this status" },
  "sync.tag.waitingForVideoSync": {
    "zh-CN": "标签任务已加入队列。为减少风控风险，将在视频同步结束后自动开始。",
    "en-US": "The tag task is queued and will start automatically after video sync to reduce risk-control exposure.",
  },
  "sync.incomplete": { "zh-CN": "未完成夹", "en-US": "Incomplete" },
  "sync.diagnostics": { "zh-CN": "需要处理的项目", "en-US": "Items requiring attention" },
  "sync.phase.idle": { "zh-CN": "空闲", "en-US": "Idle" },
  "sync.phase.running": { "zh-CN": "同步中", "en-US": "Running" },
  "sync.phase.paused": { "zh-CN": "已暂停", "en-US": "Paused" },
  "sync.phase.waiting": { "zh-CN": "等待重试", "en-US": "Waiting" },
  "sync.phase.failed": { "zh-CN": "需要重试", "en-US": "Retry needed" },
  "sync.phase.completed": { "zh-CN": "已完成", "en-US": "Completed" },
  "followingUps.title": {
    "zh-CN": "关注 UP",
    "en-US": "Following UPs",
  },
  "followingUps.description": {
    "zh-CN": "导入当前 B 站账号关注列表后，可在这里快速搜索并打开 UP 主空间。",
    "en-US":
      "Import your current Bilibili following list, then search and open creator spaces quickly.",
  },
  "followingUps.total": {
    "zh-CN": "{count} 个 UP",
    "en-US": "{count} UPs",
  },
  "followingUps.import": {
    "zh-CN": "导入关注",
    "en-US": "Import Following",
  },
  "followingUps.refresh": {
    "zh-CN": "刷新",
    "en-US": "Refresh",
  },
  "followingUps.searchPlaceholder": {
    "zh-CN": "搜索 UP 名称或 UID",
    "en-US": "Search name or UID",
  },
  "followingUps.empty": {
    "zh-CN": "还没有导入关注 UP",
    "en-US": "No following UPs imported yet",
  },
  "followingUps.emptyHint": {
    "zh-CN": "点击导入后，仅保存头像、昵称、UID 和空间链接。",
    "en-US": "Import saves only avatar, name, UID, and space link.",
  },
  "followingUps.searchEmpty": {
    "zh-CN": "未找到匹配的 UP",
    "en-US": "No matching UP found",
  },
  "followingUps.openSpace": {
    "zh-CN": "进入空间",
    "en-US": "Open Space",
  },
  "followingUps.statusSummary": {
    "zh-CN": "已处理 {current}/{total}",
    "en-US": "Processed {current}/{total}",
  },
  "followingUps.dialogTitle": {
    "zh-CN": "导入关注 UP",
    "en-US": "Import Following UPs",
  },
  "followingUps.dialogDesc": {
    "zh-CN": "系统会顺序读取当前登录账号的关注列表，完成后生成本地快捷导航。",
    "en-US":
      "The extension reads the current account's following list sequentially and builds a local navigation directory.",
  },
  "followingUps.dialogReadHint": {
    "zh-CN": "读取当前浏览器已登录的 B 站关注列表。",
    "en-US": "Reads the following list of the Bilibili account logged in to this browser.",
  },
  "followingUps.dialogSaveHint": {
    "zh-CN": "仅保存头像、名称、UID 与空间链接。",
    "en-US": "Saves only avatar, name, UID, and space link.",
  },
  "followingUps.dialogSafeHint": {
    "zh-CN": "不会关注、取关或修改任何 B 站数据。",
    "en-US": "Does not follow, unfollow, or modify any Bilibili data.",
  },
  "followingUps.progress": {
    "zh-CN": "导入进度",
    "en-US": "Import progress",
  },
  "followingUps.importResult": {
    "zh-CN": "新增 {created}，更新 {updated}，失败 {failed}",
    "en-US": "Created {created}, updated {updated}, failed {failed}",
  },
  "followingUps.startImport": {
    "zh-CN": "开始导入",
    "en-US": "Start Import",
  },
  "followingUps.importing": {
    "zh-CN": "导入中",
    "en-US": "Importing",
  },
  "autoInit.dialogTitle": {
    "zh-CN": "首次初始化同步",
    "en-US": "Initial setup sync",
  },
  "autoInit.dialogDesc": {
    "zh-CN":
      "请选择你要初始化同步的收藏夹。系统会按串行方式逐个导入，先完成视频入库。",
    "en-US":
      "Select favorite folders for initial sync. Folders will be imported serially with videos first.",
  },
  "autoInit.folderCount": {
    "zh-CN": "已选 {selected} / {total}",
    "en-US": "Selected {selected} / {total}",
  },
  "autoInit.reloadFolders": {
    "zh-CN": "刷新收藏夹",
    "en-US": "Reload folders",
  },
  "autoInit.warning": {
    "zh-CN":
      "建议先勾选你最常用的收藏夹。收藏量极大的收藏夹可稍后再加，能降低风控概率并提升首轮速度。",
    "en-US":
      "Start with frequently used folders first. Very large folders can be added later to reduce risk-control and improve first-run speed.",
  },
  "autoInit.loadingFolders": {
    "zh-CN": "正在加载收藏夹...",
    "en-US": "Loading folders...",
  },
  "autoInit.emptyFolders": {
    "zh-CN": "未获取到可同步收藏夹。",
    "en-US": "No syncable folders found.",
  },
  "autoInit.remoteVideoCount": {
    "zh-CN": "B 站收藏 {count} 条",
    "en-US": "{count} videos on Bilibili",
  },
  "autoInit.later": {
    "zh-CN": "稍后再说",
    "en-US": "Later",
  },
  "autoInit.start": {
    "zh-CN": "开始初始化",
    "en-US": "Start initialization",
  },
  "autoInit.progressTitle": {
    "zh-CN": "初始化进度",
    "en-US": "Initialization progress",
  },
  "autoInit.statusIdle": {
    "zh-CN": "未开始",
    "en-US": "Idle",
  },
  "autoInit.statusRunning": {
    "zh-CN": "第一阶段同步中",
    "en-US": "Phase 1 syncing",
  },
  "autoInit.statusCooldown": {
    "zh-CN": "风控冷却中",
    "en-US": "Cooling down after risk-control",
  },
  "autoInit.statusFailed": {
    "zh-CN": "已暂停，等待续传",
    "en-US": "Paused, waiting to resume",
  },
  "autoInit.statusCompleted": {
    "zh-CN": "同步完成",
    "en-US": "Sync completed",
  },
  "autoInit.statusCompletedWithUnavailable": {
    "zh-CN": "同步完成，{count} 条视频疑似失效、私密或不可见",
    "en-US": "Sync completed; {count} videos appear invalid, private, or unavailable",
  },
  "autoInit.cooldownRemain": {
    "zh-CN": "预计 {time} 后可续传",
    "en-US": "Resume available in {time}",
  },
  "autoInit.openPicker": {
    "zh-CN": "重新选择收藏夹",
    "en-US": "Choose folders again",
  },
  "autoInit.resume": {
    "zh-CN": "继续初始化",
    "en-US": "Resume initialization",
  },
  "autoInit.phase1Title": {
    "zh-CN": "阶段1：视频关系同步",
    "en-US": "Phase 1: Video relation sync",
  },
  "autoInit.phase1Summary": {
    "zh-CN": "已入库 {imported}，已扫描 {scanned}，预计总量 {target}",
    "en-US": "Imported {imported}, scanned {scanned}, estimated total {target}",
  },
  "autoInit.phase2Title": {
    "zh-CN": "阶段2：标签后台补全",
    "en-US": "Phase 2: Background tag enrichment",
  },
  "autoInit.phase2Summary": {
    "zh-CN": "待补 {missing}，上轮处理 {processed}，补全 {bound}",
    "en-US":
      "Missing {missing}, last batch processed {processed}, bound {bound}",
  },
  "sync.tagEnrichTitle": {
    "zh-CN": "标签补全任务",
    "en-US": "Tag enrichment job",
  },
  "sync.reloadTagEnrich": {
    "zh-CN": "刷新状态",
    "en-US": "Refresh status",
  },
  "sync.tagEnrichStatus": {
    "zh-CN":
      "待补标签视频 {missing} 条，上轮处理 {processed} 条，补全标签 {bound} 个",
    "en-US":
      "{missing} videos still missing tags; last batch processed {processed}, bound {bound} tags",
  },
  "sync.pauseTagEnrich": {
    "zh-CN": "暂停补全",
    "en-US": "Pause enrichment",
  },
  "sync.resumeTagEnrich": {
    "zh-CN": "恢复补全",
    "en-US": "Resume enrichment",
  },
  "sync.runTagEnrichNow": {
    "zh-CN": "立即执行",
    "en-US": "Run now",
  },
  "comments.title": { "zh-CN": "评论收藏", "en-US": "Saved Comments" },
  "comments.cardSize": { "zh-CN": "评论收藏卡片宽度", "en-US": "Saved comment card width" },
  "comments.total": {
    "zh-CN": "共 {count} 条",
    "en-US": "{count} comments",
  },
  "comments.search": { "zh-CN": "搜索", "en-US": "Search" },
  "comments.searchPlaceholder": {
    "zh-CN": "搜索正文、用户、来源标题或 BV 号",
    "en-US": "Search text, author, source title, or BV ID",
  },
  "comments.loading": { "zh-CN": "正在读取评论收藏...", "en-US": "Loading saved comments..." },
  "comments.empty": { "zh-CN": "暂无评论收藏", "en-US": "No saved comments" },
  "comments.emptyHint": {
    "zh-CN": "打开 B 站视频或专栏评论区，点击每条评论操作栏中的“收藏评论”；收藏内容仅保存在当前扩展。",
    "en-US": "Open comments on a Bilibili video or article and click Save comment in a comment's action row. Saved comments stay in this extension.",
  },
  "comments.replyTo": { "zh-CN": "回复 {name}", "en-US": "Reply to {name}" },
  "comments.unknownTime": { "zh-CN": "时间未知", "en-US": "Unknown time" },
  "comments.imageAlt": { "zh-CN": "评论图片 {index}", "en-US": "Comment image {index}" },
  "comments.savedAt": { "zh-CN": "收藏于 {time}", "en-US": "Saved {time}" },
  "comments.unknownVideo": { "zh-CN": "来源内容未知", "en-US": "Unknown source content" },
  "comments.openSource": { "zh-CN": "查看原评论", "en-US": "Open Comment" },
  "comments.deleteTitle": { "zh-CN": "删除评论收藏？", "en-US": "Delete saved comment?" },
  "comments.deleteDescription": {
    "zh-CN": "将把 {author} 的这条本地评论收藏移入回收站，不会影响 B 站原评论。",
    "en-US": "This moves the local copy from {author} to trash and does not affect Bilibili.",
  },
  "articles.title": { "zh-CN": "专栏收藏", "en-US": "Saved Articles" },
  "articles.cardSize": { "zh-CN": "专栏卡片宽度", "en-US": "Article card width" },
  "articles.total": { "zh-CN": "共 {count} 篇", "en-US": "{count} articles" },
  "articles.search": { "zh-CN": "搜索", "en-US": "Search" },
  "articles.searchPlaceholder": { "zh-CN": "搜索标题、作者、正文或专栏 ID", "en-US": "Search title, author, content, or opus ID" },
  "articles.allFolders": { "zh-CN": "全部文件夹", "en-US": "All folders" },
  "articles.folders": { "zh-CN": "专栏文件夹", "en-US": "Article folders" },
  "articles.folderCountTemplate": { "zh-CN": "{count} 篇专栏", "en-US": "{count} articles" },
  "articles.folderScope": { "zh-CN": "当前文件夹", "en-US": "Current folder" },
  "articles.classify": { "zh-CN": "归入文件夹", "en-US": "Classify into folders" },
  "articles.loading": { "zh-CN": "正在读取专栏收藏...", "en-US": "Loading saved articles..." },
  "articles.empty": { "zh-CN": "暂无专栏收藏", "en-US": "No saved articles" },
  "articles.emptyHint": { "zh-CN": "打开 B 站专栏页面，点击悬浮书签即可收藏。", "en-US": "Open a Bilibili article and click the floating bookmark to save it." },
  "articles.unknownAuthor": { "zh-CN": "未知作者", "en-US": "Unknown author" },
  "articles.unknownTime": { "zh-CN": "时间未知", "en-US": "Unknown time" },
  "articles.openSource": { "zh-CN": "查看原文", "en-US": "Open Article" },
  "articles.delete": { "zh-CN": "删除", "en-US": "Delete" },
  "articles.deleteTitle": { "zh-CN": "删除专栏收藏？", "en-US": "Delete saved article?" },
  "articles.deleteDescription": { "zh-CN": "将把“{title}”的本地专栏收藏移入回收站，不会影响 B 站原文。", "en-US": "This moves the local copy of “{title}” to trash and does not affect Bilibili." },
  "articles.deleteFolderTitle": { "zh-CN": "删除专栏文件夹？", "en-US": "Delete article folder?" },
  "articles.deleteFolderDescription": { "zh-CN": "只删除该专栏文件夹及其分类关系，不会删除其中收藏的专栏。", "en-US": "This removes only the article folder and its classification links, not the saved articles." },
  "sync.startTagEnrich": {
    "zh-CN": "开始",
    "en-US": "Start",
  },
  "sync.stopTagEnrich": {
    "zh-CN": "停止",
    "en-US": "Stop",
  },
  "sync.interruptTagEnrich": {
    "zh-CN": "中断任务",
    "en-US": "Cancel task",
  },
  "sync.tag.phase.idle": { "zh-CN": "未开始", "en-US": "Idle" },
  "sync.tag.phase.running": { "zh-CN": "执行中", "en-US": "Running" },
  "sync.tag.phase.waiting": { "zh-CN": "等待中", "en-US": "Waiting" },
  "sync.tag.phase.paused": { "zh-CN": "已暂停", "en-US": "Paused" },
  "sync.tag.phase.completed": { "zh-CN": "已完成", "en-US": "Completed" },
  "sync.tag.phase.failed": { "zh-CN": "失败", "en-US": "Failed" },
  "sync.tag.phaseDetail.idle": {
    "zh-CN": "当前没有运行中的标签任务",
    "en-US": "No tag task is active",
  },
  "sync.tag.phaseDetail.running": {
    "zh-CN": "正在读取当前批次",
    "en-US": "Fetching the current batch",
  },
  "sync.tag.phaseDetail.waiting": {
    "zh-CN": "当前批次已保存，等待下次执行",
    "en-US": "Current batch saved; waiting for the next run",
  },
  "sync.tag.phaseDetail.paused": {
    "zh-CN": "任务进度已保存",
    "en-US": "Task progress is saved",
  },
  "sync.tag.phaseDetail.completed": {
    "zh-CN": "本轮标签队列已处理完毕",
    "en-US": "The current tag queue is complete",
  },
  "sync.tag.phaseDetail.failed": {
    "zh-CN": "任务需要重新开始",
    "en-US": "The task needs to be started again",
  },
  "sync.tag.progress": {
    "zh-CN": "已处理 {processed}/{total}，剩余 {missing}",
    "en-US": "Processed {processed}/{total}; {missing} remaining",
  },
  "sync.tag.succeeded": { "zh-CN": "成功视频", "en-US": "Succeeded" },
  "sync.tag.empty": { "zh-CN": "空标签", "en-US": "No tags" },
  "sync.tag.failed": { "zh-CN": "失败请求", "en-US": "Failures" },
  "sync.tag.bound": { "zh-CN": "绑定标签", "en-US": "Tags bound" },
  "sync.tag.lastBatch": { "zh-CN": "本批尝试", "en-US": "Last batch" },
  "sync.tag.nextRun": {
    "zh-CN": "下次执行：{time}（约 {seconds} 秒）",
    "en-US": "Next run: {time} (about {seconds}s)",
  },
  "sync.settings.title": {
    "zh-CN": "B站监听设置",
    "en-US": "Bilibili Action Sync Settings",
  },
  "sync.settings.desc": {
    "zh-CN": "仅监听 B站端收藏动作，并将变更对账到本地（支持增删移动复制）。",
    "en-US":
      "Only monitor Bilibili favorite actions and reconcile them into local folders (add/remove/move/copy).",
  },
  "sync.settings.biliToLocalTitle": {
    "zh-CN": "B站收藏时同步到插件",
    "en-US": "Sync Bilibili favorite actions to local",
  },
  "sync.settings.biliToLocalDesc": {
    "zh-CN":
      "在视频页检测到 B站原生收藏动作后，自动将该视频与远端收藏夹状态对账到本地。",
    "en-US":
      "When native favorite actions are detected on Bilibili pages, this video is reconciled to match remote favorite folders.",
  },
  "sync.settings.localToBiliTitle": {
    "zh-CN": "插件收藏时同步到B站",
    "en-US": "Sync local saves back to Bilibili",
  },
  "sync.settings.localToBiliDesc": {
    "zh-CN":
      "在悬浮窗保存视频时，同时写回到对应的 B站收藏夹（仅对已绑定远端 media_id 的收藏夹生效）。",
    "en-US":
      "When saving in floating panel, also write to mapped Bilibili favorite folders (folders with remote media_id only).",
  },
  "sync.settings.reload": {
    "zh-CN": "刷新设置",
    "en-US": "Reload",
  },
  "ai.settings.title": {
    "zh-CN": "AI 设置",
    "en-US": "AI Settings",
  },
  "ai.settings.desc": {
    "zh-CN": "AI 功能仅保存在扩展本地运行时中，不会写入 backend。",
    "en-US": "AI settings are stored in the extension runtime only and are not added to backend.",
  },
  "ai.settings.enableTitle": {
    "zh-CN": "启用 AI 整理",
    "en-US": "Enable AI organization",
  },
  "ai.settings.enableDesc": {
    "zh-CN": "开启后可对全部视频或当前收藏夹生成可预览、可撤销的 AI 分类方案。",
    "en-US": "Create previewable and reversible AI organization plans for the full library or current folder.",
  },
  "ai.settings.provider": {
    "zh-CN": "提供商",
    "en-US": "Provider",
  },
  "ai.settings.customProvider": {
    "zh-CN": "自定义运营商",
    "en-US": "Custom Provider",
  },
  "ai.settings.customProviderName": {
    "zh-CN": "运营商名称",
    "en-US": "Provider Name",
  },
  "ai.settings.baseUrl": {
    "zh-CN": "Base URL",
    "en-US": "Base URL",
  },
  "ai.settings.model": {
    "zh-CN": "模型",
    "en-US": "Model",
  },
  "ai.settings.apiKey": {
    "zh-CN": "API Key",
    "en-US": "API Key",
  },
  "ai.settings.baseUrlPlaceholder": {
    "zh-CN": "例如：https://api.openai.com/v1",
    "en-US": "For example: https://api.openai.com/v1",
  },
  "ai.settings.modelPlaceholder": {
    "zh-CN": "例如：gpt-4.1-mini",
    "en-US": "For example: gpt-4.1-mini",
  },
  "ai.settings.customProviderNamePlaceholder": {
    "zh-CN": "例如：My Custom Provider",
    "en-US": "For example: My Custom Provider",
  },
  "ai.settings.apiKeyPlaceholder": {
    "zh-CN": "输入新的 API Key",
    "en-US": "Enter a new API key",
  },
  "ai.settings.apiKeyPlaceholderKeep": {
    "zh-CN": "留空表示保持当前 API Key",
    "en-US": "Leave blank to keep the current API key",
  },
  "ai.settings.reload": {
    "zh-CN": "刷新状态",
    "en-US": "Reload",
  },
  "ai.settings.test": {
    "zh-CN": "测试设置",
    "en-US": "Test settings",
  },
  "ai.settings.refreshModels": {
    "zh-CN": "刷新模型列表",
    "en-US": "Refresh models",
  },
  "ai.settings.baseUrlAuto": {
    "zh-CN": "官方运营商地址已自动填入。",
    "en-US": "Official provider base URL is filled automatically.",
  },
  "ai.settings.modelsBuiltin": {
    "zh-CN": "当前使用内置推荐模型。",
    "en-US": "Using built-in recommended models.",
  },
  "ai.settings.modelsRemote": {
    "zh-CN": "当前使用实时获取的模型列表。",
    "en-US": "Using models fetched live from the provider.",
  },
  "ai.settings.modelsHintNeedKey": {
    "zh-CN": "填入 API Key 后可刷新实时模型列表。",
    "en-US": "Enter an API key to refresh live model options.",
  },
  "ai.settings.modelsHintCustom": {
    "zh-CN": "自定义运营商会按 OpenAI-compatible 的方式获取模型列表。",
    "en-US": "Custom providers fetch model lists using the OpenAI-compatible flow.",
  },
  "ai.settings.modelsEmpty": {
    "zh-CN": "当前没有可选模型，请先刷新模型列表。",
    "en-US": "No models are available yet. Refresh the model list first.",
  },
  "ai.settings.statusTest": {
    "zh-CN": "最近测试：{time}",
    "en-US": "Last test: {time}",
  },
  "ai.organizer.title": {
    "zh-CN": "AI 整理",
    "en-US": "AI Organizer",
  },
  "ai.organizer.settingsRequired": {
    "zh-CN": "请先启用 AI 并完成提供商、模型和 API Key 设置。",
    "en-US": "Enable AI and configure a provider, model, and API key first.",
  },
  "ai.organizer.phase.idle": { "zh-CN": "未开始", "en-US": "Idle" },
  "ai.organizer.phase.planning": { "zh-CN": "设计分类", "en-US": "Planning" },
  "ai.organizer.phase.classifying": { "zh-CN": "分类中", "en-US": "Classifying" },
  "ai.organizer.phase.waiting": { "zh-CN": "等待重试", "en-US": "Waiting" },
  "ai.organizer.phase.paused": { "zh-CN": "已暂停", "en-US": "Paused" },
  "ai.organizer.phase.ready": { "zh-CN": "等待确认", "en-US": "Ready" },
  "ai.organizer.phase.failed": { "zh-CN": "失败", "en-US": "Failed" },
  "ai.organizer.phase.cancelled": { "zh-CN": "已取消", "en-US": "Cancelled" },
  "ai.organizer.phase.completed": { "zh-CN": "已应用", "en-US": "Applied" },
  "ai.organizer.phase.undone": { "zh-CN": "已撤销", "en-US": "Undone" },
  "ai.organizer.phaseDetail.planning": {
    "zh-CN": "正在根据收藏内容设计文件夹体系。",
    "en-US": "Designing a folder taxonomy from the library.",
  },
  "ai.organizer.phaseDetail.classifying": {
    "zh-CN": "正在分批归类视频，结果会持续保存。",
    "en-US": "Classifying videos in persisted batches.",
  },
  "ai.organizer.phaseDetail.waiting": {
    "zh-CN": "请求失败，后台将在退避后自动重试。",
    "en-US": "A request failed and will retry after backoff.",
  },
  "ai.organizer.phaseDetail.paused": {
    "zh-CN": "任务已暂停，可随时继续。",
    "en-US": "The task is paused and can be resumed.",
  },
  "ai.organizer.phaseDetail.ready": {
    "zh-CN": "方案已完成，请检查分类和低置信度项目。",
    "en-US": "The plan is ready. Review categories and low-confidence items.",
  },
  "ai.organizer.phaseDetail.failed": {
    "zh-CN": "任务已停止自动重试；可查看错误后继续，已完成批次不会丢失。",
    "en-US": "Automatic retries stopped. Review the error and resume without losing completed batches.",
  },
  "ai.organizer.phaseDetail.completed": {
    "zh-CN": "AI 分类已应用，可一键撤销本次变更。",
    "en-US": "AI organization was applied and can be undone.",
  },
  "ai.organizer.pause": { "zh-CN": "暂停", "en-US": "Pause" },
  "ai.organizer.resume": { "zh-CN": "继续", "en-US": "Resume" },
  "ai.organizer.retry": { "zh-CN": "重试", "en-US": "Retry" },
  "ai.organizer.cancel": { "zh-CN": "停止", "en-US": "Stop" },
  "ai.organizer.start": { "zh-CN": "开始整理", "en-US": "Start" },
  "ai.organizer.restart": { "zh-CN": "放弃方案并重新整理", "en-US": "Discard and Restart" },
  "ai.organizer.startOver": { "zh-CN": "重新开始", "en-US": "Start Over" },
  "ai.organizer.viewStatus": { "zh-CN": "查看状态", "en-US": "View Status" },
  "ai.organizer.reviewPlan": { "zh-CN": "检查方案", "en-US": "Review Plan" },
  "ai.organizer.retryCountdown": {
    "zh-CN": "约 {seconds} 秒后自动重试。",
    "en-US": "Automatic retry in about {seconds} seconds.",
  },
  "ai.organizer.apply": { "zh-CN": "应用方案", "en-US": "Apply Plan" },
  "ai.organizer.undo": { "zh-CN": "撤销本次整理", "en-US": "Undo Organization" },
  "ai.organizer.progress": {
    "zh-CN": "已分类 {processed}/{total}",
    "en-US": "Classified {processed}/{total}",
  },
  "ai.organizer.total": { "zh-CN": "视频", "en-US": "Videos" },
  "ai.organizer.folders": { "zh-CN": "文件夹", "en-US": "Folders" },
  "ai.organizer.lowConfidence": { "zh-CN": "待确认", "en-US": "Review" },
  "ai.organizer.skipped": { "zh-CN": "跳过失效", "en-US": "Invalid skipped" },
  "ai.organizer.taxonomy": { "zh-CN": "分类体系", "en-US": "Taxonomy" },
  "ai.organizer.preview": { "zh-CN": "视频分类预览", "en-US": "Video Preview" },
  "ai.organizer.reviewFolder": { "zh-CN": "待确认", "en-US": "Needs review" },
  "ai.organizer.estimatedChanges": {
    "zh-CN": "预计新增 {added} 条 AI 关系，移除 {removed} 条旧 AI 关系；手动和 B站关系不变。",
    "en-US": "Estimated: add {added} AI relationships and remove {removed} old AI relationships. Manual and Bilibili relationships stay unchanged.",
  },
  "ai.organizer.onlyLowConfidence": {
    "zh-CN": "仅看待确认",
    "en-US": "Review items only",
  },
  "ai.organizer.suggested": {
    "zh-CN": "AI 建议：{folder}",
    "en-US": "AI suggestion: {folder}",
  },
  "ai.organizer.previewEmpty": {
    "zh-CN": "当前筛选下没有视频。",
    "en-US": "No videos match this filter.",
  },
  "ai.organizer.scope": { "zh-CN": "整理范围", "en-US": "Scope" },
  "ai.organizer.scopeAll": { "zh-CN": "全部视频", "en-US": "All videos" },
  "ai.organizer.scopeFolder": {
    "zh-CN": "当前：{folder}",
    "en-US": "Current: {folder}",
  },
  "ai.organizer.folderCount": {
    "zh-CN": "期望文件夹数",
    "en-US": "Folder count",
  },
  "ai.organizer.confidence": {
    "zh-CN": "待确认阈值",
    "en-US": "Review threshold",
  },
  "ai.organizer.confidenceLoose": { "zh-CN": "宽松 55%", "en-US": "Loose 55%" },
  "ai.organizer.confidenceBalanced": { "zh-CN": "均衡 65%", "en-US": "Balanced 65%" },
  "ai.organizer.confidenceStrict": { "zh-CN": "严格 75%", "en-US": "Strict 75%" },
  "ai.organizer.referenceFolders": {
    "zh-CN": "参考现有文件夹",
    "en-US": "Reference existing folders",
  },
  "ai.organizer.referenceFoldersDesc": {
    "zh-CN": "AI 会参考现有名称和规模，但不会修改原文件夹关系。",
    "en-US": "AI considers existing names and sizes without modifying their relationships.",
  },
  "ai.organizer.instructions": { "zh-CN": "整理要求", "en-US": "Instructions" },
  "ai.organizer.instructionsPlaceholder": {
    "zh-CN": "例如：编程内容按语言区分；音乐不要按歌手拆得太细。",
    "en-US": "For example: split programming by language; keep music categories broad.",
  },
  "ai.organizer.downloadBackup": {
    "zh-CN": "下载原始备份",
    "en-US": "Download Original Backup",
  },
  "ai.organizer.replaceTitle": {
    "zh-CN": "开始新的 AI 整理？",
    "en-US": "Start a new AI organization?",
  },
  "ai.organizer.replaceDesc": {
    "zh-CN": "新的任务会替换当前方案及其撤销入口，但不会修改已存在的手动或 B站分类。",
    "en-US": "The new task replaces the displayed plan and its undo entry without changing manual or Bilibili categories.",
  },
  "ai.organizer.cancelTitle": { "zh-CN": "停止 AI 整理？", "en-US": "Stop AI organization?" },
  "ai.organizer.cancelDesc": {
    "zh-CN": "已完成的批次会保留，但当前任务不会继续请求 API。",
    "en-US": "Completed batches remain saved, but the task stops making API requests.",
  },
  "ai.organizer.applyTitle": { "zh-CN": "应用 AI 分类方案？", "en-US": "Apply the AI plan?" },
  "ai.organizer.applyDesc": {
    "zh-CN": "将为 {videos} 个视频创建约 {folders} 个 AI 文件夹；原手动和 B站关系保持不变。",
    "en-US": "Create about {folders} AI folders for {videos} videos while preserving manual and Bilibili relationships.",
  },
  "ai.organizer.undoTitle": { "zh-CN": "撤销本次 AI 整理？", "en-US": "Undo this AI organization?" },
  "ai.organizer.undoDesc": {
    "zh-CN": "仅撤销本次 AI 文件夹和关系，不覆盖之后的手动收藏操作。",
    "en-US": "Only this run's AI folders and relationships are reverted; later manual actions are preserved.",
  },
  "ai.organizer.settingsChangeTitle": {
    "zh-CN": "更改当前任务的 AI 配置？",
    "en-US": "Change AI settings for the current task?",
  },
  "ai.organizer.settingsChangeDesc": {
    "zh-CN": "当前整理任务使用固定的提供商和模型。更改后任务会暂停并要求恢复原配置或开始新任务。",
    "en-US": "The current organizer task uses a fixed provider and model. Changing them pauses progress until the original setting is restored or a new task starts.",
  },
  "toast.aiOrganizerLoadFail": { "zh-CN": "加载 AI 整理状态失败", "en-US": "Failed to load AI organizer status" },
  "toast.aiOrganizerPreviewFail": { "zh-CN": "加载分类预览失败", "en-US": "Failed to load organization preview" },
  "toast.aiOrganizerEditFail": { "zh-CN": "修改视频分类失败", "en-US": "Failed to update video classification" },
  "toast.aiOrganizerStarted": { "zh-CN": "AI 整理已在后台开始", "en-US": "AI organization started in the background" },
  "toast.aiOrganizerStartFail": { "zh-CN": "启动 AI 整理失败", "en-US": "Failed to start AI organization" },
  "toast.aiOrganizerPauseFail": { "zh-CN": "暂停 AI 整理失败", "en-US": "Failed to pause AI organization" },
  "toast.aiOrganizerResumeFail": { "zh-CN": "继续 AI 整理失败", "en-US": "Failed to resume AI organization" },
  "toast.aiOrganizerCancelFail": { "zh-CN": "停止 AI 整理失败", "en-US": "Failed to stop AI organization" },
  "toast.aiOrganizerApplied": { "zh-CN": "AI 分类方案已应用", "en-US": "AI organization plan applied" },
  "toast.aiOrganizerApplyFail": { "zh-CN": "应用 AI 分类方案失败", "en-US": "Failed to apply AI organization plan" },
  "toast.aiOrganizerUndone": { "zh-CN": "本次 AI 整理已撤销", "en-US": "AI organization was undone" },
  "toast.aiOrganizerUndoFail": { "zh-CN": "撤销 AI 整理失败", "en-US": "Failed to undo AI organization" },
  "toast.aiOrganizerBackupFail": { "zh-CN": "下载 AI 整理备份失败", "en-US": "Failed to download AI organizer backup" },
  "webdav.title": {
    "zh-CN": "WebDAV",
    "en-US": "WebDAV",
  },
  "webdav.desc": {
    "zh-CN": "配置远端 WebDAV 后，可测试连通性并执行上传备份、下载和一键恢复。",
    "en-US":
      "Configure WebDAV, then test connectivity and perform backup upload, download, and restore.",
  },
  "webdav.enableTitle": {
    "zh-CN": "启用 WebDAV 备份",
    "en-US": "Enable WebDAV backup",
  },
  "webdav.enableDesc": {
    "zh-CN": "开启后即可使用上传和恢复入口。",
    "en-US": "Enable to use upload and restore actions.",
  },
  "webdav.baseUrl": {
    "zh-CN": "服务器地址",
    "en-US": "Server URL",
  },
  "webdav.username": {
    "zh-CN": "用户名",
    "en-US": "Username",
  },
  "webdav.password": {
    "zh-CN": "密码 / 应用专用密码",
    "en-US": "Password / App password",
  },
  "webdav.passwordPlaceholderKeep": {
    "zh-CN": "留空表示保持现有密码",
    "en-US": "Leave blank to keep current password",
  },
  "webdav.remotePath": {
    "zh-CN": "远端目录",
    "en-US": "Remote directory",
  },
  "webdav.reload": {
    "zh-CN": "刷新状态",
    "en-US": "Reload",
  },
  "webdav.test": {
    "zh-CN": "连通测试",
    "en-US": "Test",
  },
  "webdav.upload": {
    "zh-CN": "上传备份",
    "en-US": "Upload backup",
  },
  "webdav.download": {
    "zh-CN": "下载备份",
    "en-US": "Download backup",
  },
  "webdav.restore": {
    "zh-CN": "远端恢复",
    "en-US": "Restore",
  },
  "webdav.statusTest": {
    "zh-CN": "最近测试：{time}",
    "en-US": "Last test: {time}",
  },
  "webdav.statusBackup": {
    "zh-CN": "最近备份：{time}",
    "en-US": "Last backup: {time}",
  },
  "webdav.statusRestore": {
    "zh-CN": "最近恢复：{time}",
    "en-US": "Last restore: {time}",
  },
  "trash.foldersTitle": {
    "zh-CN": "回收站收藏夹",
    "en-US": "Folders In Trash",
  },
  "trash.videosTitle": { "zh-CN": "回收站视频", "en-US": "Videos In Trash" },
  "trash.title": { "zh-CN": "回收站", "en-US": "Trash" },
  "trash.description": {
    "zh-CN": "分别管理已删除的收藏夹、视频、评论收藏和专栏收藏。恢复后将回到原数据列表。",
    "en-US": "Manage deleted folders, videos, saved comments, and saved articles. Restored items return to their original lists.",
  },
  "trash.foldersTab": { "zh-CN": "收藏夹", "en-US": "Folders" },
  "trash.videosTab": { "zh-CN": "视频", "en-US": "Videos" },
  "trash.commentsTab": { "zh-CN": "评论", "en-US": "Comments" },
  "trash.articlesTab": { "zh-CN": "专栏", "en-US": "Articles" },
  "trash.commentsTitle": { "zh-CN": "回收站评论", "en-US": "Comments In Trash" },
  "trash.articlesTitle": { "zh-CN": "回收站专栏", "en-US": "Articles In Trash" },
  "trash.emptyFolders": {
    "zh-CN": "回收站中暂无收藏夹。",
    "en-US": "No folders in trash.",
  },
  "trash.emptyVideos": {
    "zh-CN": "回收站中暂无视频。",
    "en-US": "No videos in trash.",
  },
  "trash.emptyComments": {
    "zh-CN": "回收站中暂无评论收藏。",
    "en-US": "No saved comments in trash.",
  },
  "trash.emptyArticles": {
    "zh-CN": "回收站中暂无专栏收藏。",
    "en-US": "No saved articles in trash.",
  },
  "trash.commentImages": {
    "zh-CN": "包含 {count} 张图片",
    "en-US": "Includes {count} images",
  },
  "trash.restoreSelected": { "zh-CN": "恢复已选", "en-US": "Restore Selected" },
  "tools.manageTagsTitle": {
    "zh-CN": "管理自定义标签",
    "en-US": "Manage Custom Tags",
  },
  "tools.manageTagsDesc": {
    "zh-CN": "创建、重命名并删除自定义标签。",
    "en-US": "Create, rename and delete your custom tags.",
  },
  "tools.newTagPlaceholder": {
    "zh-CN": "新建自定义标签",
    "en-US": "New custom tag",
  },
  "tools.searchTagsPlaceholder": { "zh-CN": "搜索标签名称", "en-US": "Search tag names" },
  "tools.sortTagsCreated": { "zh-CN": "按创建时间", "en-US": "Created recently" },
  "tools.sortTagsName": { "zh-CN": "按名称", "en-US": "By name" },
  "tools.sortTagsUsage": { "zh-CN": "按使用次数", "en-US": "By usage" },
  "tools.sortAscending": { "zh-CN": "升序", "en-US": "Ascending" },
  "tools.sortDescending": { "zh-CN": "降序", "en-US": "Descending" },
  "tools.tagUsage": {
    "zh-CN": "已关联 {count} 条",
    "en-US": "Linked {count}",
  },
  "tools.totalTags": {
    "zh-CN": "标签总数 {count}",
    "en-US": "Total tags {count}",
  },
  "tools.noCustomTag": {
    "zh-CN": "暂无自定义标签。",
    "en-US": "No custom tags yet.",
  },
  "tools.noMatchingTag": {
    "zh-CN": "没有匹配的标签。",
    "en-US": "No matching tags.",
  },
  "detail.title": { "zh-CN": "Video Detail", "en-US": "Video Detail" },
  "detail.bv": { "zh-CN": "BV", "en-US": "BV" },
  "detail.videoTitle": { "zh-CN": "Title", "en-US": "Title" },
  "detail.uploader": { "zh-CN": "Uploader", "en-US": "Uploader" },
  "detail.description": { "zh-CN": "Description", "en-US": "Description" },
  "detail.publishAt": { "zh-CN": "Publish Time", "en-US": "Publish Time" },
  "detail.uploaderSpace": {
    "zh-CN": "Uploader Space URL",
    "en-US": "Uploader Space URL",
  },
  "detail.customTags": { "zh-CN": "Custom Tags", "en-US": "Custom Tags" },
  "detail.bilibiliTags": { "zh-CN": "Bilibili Tags", "en-US": "Bilibili Tags" },
  "detail.customTagsInputPlaceholder": {
    "zh-CN": "多个标签用逗号分隔",
    "en-US": "Separate tags with commas",
  },
  "detail.systemTagsInputPlaceholder": {
    "zh-CN": "多个标签用逗号分隔",
    "en-US": "Separate tags with commas",
  },
  "detail.folders": { "zh-CN": "Folders", "en-US": "Folders" },
  "detail.aiTitle": { "zh-CN": "AI 分类", "en-US": "AI Category" },
  "detail.aiCategories": {
    "zh-CN": "AI 主分类",
    "en-US": "AI Category",
  },
  "detail.aiAnalyzedAt": {
    "zh-CN": "分类时间",
    "en-US": "Categorized At",
  },
  "detail.aiProviderModel": {
    "zh-CN": "提供商 / 模型",
    "en-US": "Provider / Model",
  },
  "detail.openOnBilibili": {
    "zh-CN": "Open on Bilibili",
    "en-US": "Open on Bilibili",
  },
  "detail.openUploaderSpace": {
    "zh-CN": "Open uploader space",
    "en-US": "Open uploader space",
  },
  "detail.manualComplete": {
    "zh-CN": "Manual Complete Info",
    "en-US": "Manual Complete Info",
  },
  "detail.manualEditHint": {
    "zh-CN": "Manually complete or fix metadata for old videos.",
    "en-US": "Manually complete or fix metadata for old videos.",
  },
  "detail.saveManual": {
    "zh-CN": "Save Manual Changes",
    "en-US": "Save Manual Changes",
  },
  "detail.saving": { "zh-CN": "Saving...", "en-US": "Saving..." },
  "folder.allVideos": { "zh-CN": "全部视频", "en-US": "All Videos" },
  "folder.unknown": { "zh-CN": "未知收藏夹", "en-US": "Unknown Folder" },
  "ai.browser.title": { "zh-CN": "AI 分类浏览", "en-US": "AI Category Browser" },
  "ai.browser.unknownFolder": {
    "zh-CN": "未知收藏夹",
    "en-US": "Unknown Folder",
  },
  "ai.browser.videoCount": {
    "zh-CN": "{count} 个视频",
    "en-US": "{count} videos",
  },
  "ai.browser.categoryCount": {
    "zh-CN": "{count} 个分类",
    "en-US": "{count} categories",
  },
  "ai.browser.backToManager": {
    "zh-CN": "返回管理页",
    "en-US": "Back To Manager",
  },
  "ai.browser.backToOverview": {
    "zh-CN": "返回分类总览",
    "en-US": "Back To Overview",
  },
  "ai.browser.emptyResult": {
    "zh-CN": "当前收藏夹暂无 AI 分类结果。",
    "en-US": "No AI category result for this folder yet.",
  },
  "ai.browser.emptyOverview": {
    "zh-CN": "当前分类结果为空。",
    "en-US": "No categorized videos available.",
  },
  "ai.browser.emptyCategory": {
    "zh-CN": "该分类暂无可展示的视频。",
    "en-US": "No videos available in this category.",
  },
  "ai.browser.footerHint": {
    "zh-CN": "这是一次性的临时分类视图，不会修改原收藏夹结构。",
    "en-US": "This is a temporary one-time category view and does not modify the original folders.",
  },
  "ai.category.animation": { "zh-CN": "动画", "en-US": "Animation" },
  "ai.category.music": { "zh-CN": "音乐", "en-US": "Music" },
  "ai.category.dance": { "zh-CN": "舞蹈", "en-US": "Dance" },
  "ai.category.game": { "zh-CN": "游戏", "en-US": "Game" },
  "ai.category.knowledge": { "zh-CN": "知识", "en-US": "Knowledge" },
  "ai.category.tech": { "zh-CN": "科技", "en-US": "Tech" },
  "ai.category.sports": { "zh-CN": "运动", "en-US": "Sports" },
  "ai.category.car": { "zh-CN": "汽车", "en-US": "Car" },
  "ai.category.life": { "zh-CN": "生活", "en-US": "Life" },
  "ai.category.food": { "zh-CN": "美食", "en-US": "Food" },
  "ai.category.animal": { "zh-CN": "动物", "en-US": "Animal" },
  "ai.category.fashion": { "zh-CN": "时尚", "en-US": "Fashion" },
  "ai.category.ent": { "zh-CN": "娱乐", "en-US": "Entertainment" },
  "ai.category.cinephile": { "zh-CN": "影视", "en-US": "Cinephile" },
  "ai.category.news": { "zh-CN": "资讯", "en-US": "News" },
  "ai.category.other": { "zh-CN": "其他", "en-US": "Other" },
  "toast.loadFoldersFail": {
    "zh-CN": "Failed to load folders",
    "en-US": "Failed to load folders",
  },
  "toast.loadTagsFail": {
    "zh-CN": "Failed to load tags",
    "en-US": "Failed to load tags",
  },
  "toast.loadVideosFail": {
    "zh-CN": "Failed to load videos",
    "en-US": "Failed to load videos",
  },
  "toast.loadTrashFail": {
    "zh-CN": "Failed to load trash",
    "en-US": "Failed to load trash",
  },
  "toast.folderCreated": {
    "zh-CN": "Folder created",
    "en-US": "Folder created",
  },
  "toast.folderUpdated": {
    "zh-CN": "Folder updated",
    "en-US": "Folder updated",
  },
  "toast.folderDeleted": {
    "zh-CN": "Folder moved to trash",
    "en-US": "Folder moved to trash",
  },
  "toast.folderReordered": {
    "zh-CN": "Folder order updated",
    "en-US": "Folder order updated",
  },
  "toast.folderCreateFail": {
    "zh-CN": "Failed to create folder",
    "en-US": "Failed to create folder",
  },
  "toast.folderUpdateFail": {
    "zh-CN": "Failed to update folder",
    "en-US": "Failed to update folder",
  },
  "toast.folderDeleteFail": {
    "zh-CN": "Failed to delete folder",
    "en-US": "Failed to delete folder",
  },
  "toast.folderReorderFail": {
    "zh-CN": "Failed to reorder folders",
    "en-US": "Failed to reorder folders",
  },
  "toast.tagNameRequired": {
    "zh-CN": "Tag name is required",
    "en-US": "Tag name is required",
  },
  "toast.tagCreated": {
    "zh-CN": "Custom tag created",
    "en-US": "Custom tag created",
  },
  "toast.tagRefreshed": {
    "zh-CN": "Tag already exists, refreshed list",
    "en-US": "Tag already exists, refreshed list",
  },
  "toast.tagRenamed": { "zh-CN": "Tag renamed", "en-US": "Tag renamed" },
  "toast.tagDeleted": { "zh-CN": "Tag deleted", "en-US": "Tag deleted" },
  "toast.tagCreateFail": {
    "zh-CN": "Failed to create custom tag",
    "en-US": "Failed to create custom tag",
  },
  "toast.tagRenameFail": {
    "zh-CN": "Failed to rename tag",
    "en-US": "Failed to rename tag",
  },
  "toast.tagDeleteFail": {
    "zh-CN": "Failed to delete tag",
    "en-US": "Failed to delete tag",
  },
  "toast.selectVideosFirst": {
    "zh-CN": "Please select videos first",
    "en-US": "Please select videos first",
  },
  "toast.chooseTargetFolder": {
    "zh-CN": "Please choose target folder",
    "en-US": "Please choose target folder",
  },
  "toast.moveNeedFolderContext": {
    "zh-CN": "Move requires current folder context",
    "en-US": "Move requires current folder context",
  },
  "toast.batchMoved": { "zh-CN": "Videos moved", "en-US": "Videos moved" },
  "toast.batchCopied": { "zh-CN": "Videos copied", "en-US": "Videos copied" },
  "toast.batchMoveCopyFail": {
    "zh-CN": "Failed batch move/copy",
    "en-US": "Failed batch move/copy",
  },
  "toast.openSpecificFolder": {
    "zh-CN": "Open a specific folder first",
    "en-US": "Open a specific folder first",
  },
  "toast.batchDeleteDone": {
    "zh-CN": "Batch delete complete",
    "en-US": "Batch delete complete",
  },
  "toast.batchDeleteFail": {
    "zh-CN": "Failed batch delete",
    "en-US": "Failed batch delete",
  },
  "toast.videoDeleted": {
    "zh-CN": "Video moved to trash",
    "en-US": "Video moved to trash",
  },
  "toast.videoRemovedFromFolder": {
    "zh-CN": "Video removed from current folder",
    "en-US": "Video removed from current folder",
  },
  "toast.videoDeleteFail": {
    "zh-CN": "Failed to delete video",
    "en-US": "Failed to delete video",
  },
  "toast.selectFoldersFirst": {
    "zh-CN": "Please select folders first",
    "en-US": "Please select folders first",
  },
  "toast.selectTrashVideosFirst": {
    "zh-CN": "Please select videos first",
    "en-US": "Please select videos first",
  },
  "toast.foldersRestored": {
    "zh-CN": "Folders restored",
    "en-US": "Folders restored",
  },
  "toast.foldersPurged": {
    "zh-CN": "Folders permanently deleted",
    "en-US": "Folders permanently deleted",
  },
  "toast.videosRestored": {
    "zh-CN": "Videos restored",
    "en-US": "Videos restored",
  },
  "toast.videosPurged": {
    "zh-CN": "Videos permanently deleted",
    "en-US": "Videos permanently deleted",
  },
  "toast.restoreFolderFail": {
    "zh-CN": "Failed to restore folders",
    "en-US": "Failed to restore folders",
  },
  "toast.purgeFolderFail": {
    "zh-CN": "Failed to delete folders",
    "en-US": "Failed to delete folders",
  },
  "toast.restoreVideoFail": {
    "zh-CN": "Failed to restore videos",
    "en-US": "Failed to restore videos",
  },
  "toast.purgeVideoFail": {
    "zh-CN": "Failed to delete videos",
    "en-US": "Failed to delete videos",
  },
  "toast.folderRestored": {
    "zh-CN": "Folder restored",
    "en-US": "Folder restored",
  },
  "toast.folderPurged": {
    "zh-CN": "Folder permanently deleted",
    "en-US": "Folder permanently deleted",
  },
  "toast.videoRestored": {
    "zh-CN": "Video restored",
    "en-US": "Video restored",
  },
  "toast.videoPurged": {
    "zh-CN": "Video permanently deleted",
    "en-US": "Video permanently deleted",
  },
  "toast.loadDetailFail": {
    "zh-CN": "Failed to load video detail",
    "en-US": "Failed to load video detail",
  },
  "toast.detailUpdated": {
    "zh-CN": "Video info updated",
    "en-US": "Video info updated",
  },
  "toast.detailUpdateFail": {
    "zh-CN": "Failed to update video info",
    "en-US": "Failed to update video info",
  },
  "toast.syncDone": {
    "zh-CN": "同步导入完成",
    "en-US": "Sync import completed",
  },
  "toast.syncSummary": {
    "zh-CN": "已同步收藏夹 {folders} 个，更新视频 {videos} 条",
    "en-US": "Synced {folders} folders and upserted {videos} videos",
  },
  "toast.syncUnavailable": {
    "zh-CN": "另有 {count} 条视频未由 B 站返回，通常是失效、私密或不可见视频；其余内容已同步。",
    "en-US": "{count} videos were not returned by Bilibili, usually because they are invalid, private, or unavailable. Other items were synced.",
  },
  "toast.syncInvalidDetected": {
    "zh-CN": "识别到 {count} 条失效视频，已保留记录，不影响同步成功。",
    "en-US": "Detected {count} invalid videos. Their records were preserved and the sync still succeeded.",
  },
  "toast.syncPartial": {
    "zh-CN": "部分收藏夹同步失败",
    "en-US": "Some folders failed to sync",
  },
  "toast.syncHiddenErrors": {
    "zh-CN": "其余 {count} 个错误已省略",
    "en-US": "{count} more errors omitted",
  },
  "toast.syncFail": { "zh-CN": "同步导入失败", "en-US": "Sync import failed" },
  "toast.syncStopFail": { "zh-CN": "停止同步失败", "en-US": "Failed to stop sync" },
  "toast.syncDismissFail": { "zh-CN": "关闭同步状态失败", "en-US": "Failed to dismiss sync status" },
  "toast.syncNoProgress": {
    "zh-CN": "本轮未拉取到可用数据，请确认已打开并登录 B 站页面后重试。",
    "en-US":
      "No usable data was fetched in this run. Open a logged-in Bilibili tab and retry.",
  },
  "toast.syncLoadFoldersFail": {
    "zh-CN": "获取收藏夹列表失败",
    "en-US": "Failed to load sync folders",
  },
  "toast.syncPickOneFolder": {
    "zh-CN": "请先选择一个收藏夹再同步",
    "en-US": "Please select one folder before syncing",
  },
  "toast.syncContinueTitle": {
    "zh-CN": "同步进行中",
    "en-US": "Sync in progress",
  },
  "toast.syncContinue": {
    "zh-CN":
      "本轮已完成，已处理收藏夹 {done}/{total}，可继续点击“同步导入”完成剩余部分。",
    "en-US":
      "Current round completed ({done}/{total} folders). Click Sync Import again to continue.",
  },
  "toast.syncResumeSaved": {
    "zh-CN": "已保存同步断点",
    "en-US": "Sync resume cursor saved",
  },
  "toast.syncResumeSavedDesc": {
    "zh-CN": "下次将从第 {page} 页继续，无需从头扫描。",
    "en-US":
      "Next run resumes from page {page} instead of rescanning from the beginning.",
  },
  "toast.syncTagBackground": {
    "zh-CN": "已转入后台补全标签",
    "en-US": "Tag enrichment switched to background",
  },
  "toast.syncTagBackgroundDesc": {
    "zh-CN": "视频已优先完成同步，缺失标签将由后台分批补齐。",
    "en-US":
      "Video sync is prioritized first, and missing tags will be filled in background batches.",
  },
  "toast.invalidVideoRecoveryDone": {
    "zh-CN": "已恢复 {recovered}/{total} 个无效视频",
    "en-US": "Recovered {recovered}/{total} invalid videos",
  },
  "toast.invalidVideoRecoveryPartial": {
    "zh-CN": "部分无效视频恢复失败 ({failed}/{total})",
    "en-US": "Some invalid videos failed to recover ({failed}/{total})",
  },
  "toast.invalidVideoRecoveryNotFound": {
    "zh-CN": "未找到 {notFound}/{total} 个无效视频",
    "en-US": "Could not find {notFound}/{total} invalid videos",
  },
  "toast.invalidVideoRecoveryFail": {
    "zh-CN": "无效视频恢复失败",
    "en-US": "Invalid video recovery failed",
  },
  "toast.tagEnrichPaused": {
    "zh-CN": "已暂停后台标签补全",
    "en-US": "Background tag enrichment paused",
  },
  "toast.tagEnrichResumed": {
    "zh-CN": "已恢复后台标签补全",
    "en-US": "Background tag enrichment resumed",
  },
  "toast.tagEnrichTriggered": {
    "zh-CN": "已触发一批后台标签补全",
    "en-US": "Triggered one background enrichment batch",
  },
  "toast.tagEnrichPauseFail": {
    "zh-CN": "暂停标签补全失败",
    "en-US": "Failed to pause tag enrichment",
  },
  "toast.tagEnrichResumeFail": {
    "zh-CN": "恢复标签补全失败",
    "en-US": "Failed to resume tag enrichment",
  },
  "toast.tagEnrichTriggerFail": {
    "zh-CN": "触发标签补全失败",
    "en-US": "Failed to trigger tag enrichment",
  },
  "toast.tagEnrichDismissFail": {
    "zh-CN": "关闭标签补全状态失败",
    "en-US": "Failed to dismiss tag enrichment status",
  },
  "toast.tagEnrichSettingsSaved": {
    "zh-CN": "标签补全速率已保存",
    "en-US": "Tag enrichment rate saved",
  },
  "toast.tagEnrichSettingsSaveFail": {
    "zh-CN": "保存标签补全速率失败",
    "en-US": "Failed to save tag enrichment rate",
  },
  "toast.syncSettingsSaved": {
    "zh-CN": "监听设置已保存",
    "en-US": "Sync settings saved",
  },
  "toast.aiSettingsSaved": {
    "zh-CN": "AI 设置已保存",
    "en-US": "AI settings saved",
  },
  "toast.aiSettingsSaveFail": {
    "zh-CN": "保存 AI 设置失败",
    "en-US": "Failed to save AI settings",
  },
  "toast.aiSettingsLoadFail": {
    "zh-CN": "加载 AI 设置失败",
    "en-US": "Failed to load AI settings",
  },
  "toast.aiSettingsTestDone": {
    "zh-CN": "AI 设置测试通过",
    "en-US": "AI settings test passed",
  },
  "toast.aiSettingsTestFail": {
    "zh-CN": "AI 设置测试失败",
    "en-US": "AI settings test failed",
  },
  "invalidVideoRecovery.dialogTitle": {
    "zh-CN": "无效视频信息恢复",
    "en-US": "Invalid video metadata recovery",
  },
  "invalidVideoRecovery.dialogDescription": {
    "zh-CN":
      "同步检测到 {count} 个无效视频，是否尝试从缓存恢复标题、封面与简介？",
    "en-US":
      "Detected {count} invalid videos during sync. Try recovering their title, cover, and description from cache?",
  },
  "invalidVideoRecovery.promptHint": {
    "zh-CN": "恢复将按顺序逐个处理，可能需要几分钟。",
    "en-US": "Recovery processes videos sequentially and may take a few minutes.",
  },
  "invalidVideoRecovery.recovered": {
    "zh-CN": "已恢复",
    "en-US": "Recovered",
  },
  "invalidVideoRecovery.notFound": {
    "zh-CN": "未找到",
    "en-US": "Not found",
  },
  "invalidVideoRecovery.failed": {
    "zh-CN": "恢复失败",
    "en-US": "Failed",
  },
  "invalidVideoRecovery.progress": {
    "zh-CN": "已处理 {current}/{total} 个视频",
    "en-US": "Processed {current}/{total} videos",
  },
  "invalidVideoRecovery.start": {
    "zh-CN": "开始恢复",
    "en-US": "Start recovery",
  },
  "invalidVideoRecovery.running": {
    "zh-CN": "恢复中",
    "en-US": "Recovering",
  },
  "invalidVideoRecovery.later": {
    "zh-CN": "稍后再说",
    "en-US": "Later",
  },
  "invalidVideoRecovery.noCandidates": {
    "zh-CN": "暂无需要恢复的视频",
    "en-US": "No videos need recovery",
  },
  "invalidVideoRecovery.notStarted": {
    "zh-CN": "恢复任务未启动",
    "en-US": "Recovery task did not start",
  },
  "toast.folderAiLoadFail": {
    "zh-CN": "加载文件夹 AI 结果失败",
    "en-US": "Failed to load folder AI categories",
  },
  "toast.folderAiBrowserVideosLoadFail": {
    "zh-CN": "加载分类视频失败",
    "en-US": "Failed to load categorized videos",
  },
  "toast.folderAiAnalyzeDone": {
    "zh-CN": "收藏夹 AI 分类完成",
    "en-US": "Folder AI categorization completed",
  },
  "toast.folderAiAnalyzeFail": {
    "zh-CN": "收藏夹 AI 分类失败",
    "en-US": "Folder AI categorization failed",
  },
  "toast.folderAiCleared": {
    "zh-CN": "已清除文件夹 AI 结果",
    "en-US": "Folder AI categorization cleared",
  },
  "toast.folderAiClearFail": {
    "zh-CN": "清除文件夹 AI 结果失败",
    "en-US": "Failed to clear folder AI categories",
  },
  "toast.playbackStarted": {
    "zh-CN": "连续播放已开始",
    "en-US": "Playback started",
  },
  "toast.playbackStartedDesc": {
    "zh-CN": "已打开首个视频，并加入 {count} 个可播放视频。",
    "en-US": "Opened the first video and queued {count} playable videos.",
  },
  "toast.playbackSkippedInvalid": {
    "zh-CN": "已跳过失效视频",
    "en-US": "Skipped invalid videos",
  },
  "toast.playbackSkippedInvalidDesc": {
    "zh-CN": "当前范围内有 {count} 个失效视频未加入播放队列。",
    "en-US": "{count} invalid videos were excluded from the playback queue.",
  },
  "toast.playbackTruncated": {
    "zh-CN": "播放队列已截断",
    "en-US": "Playback queue truncated",
  },
  "toast.playbackTruncatedDesc": {
    "zh-CN": "当前最多只保留前 {count} 个可播放视频。",
    "en-US": "Only the first {count} playable videos were kept in the queue.",
  },
  "toast.playbackStartFail": {
    "zh-CN": "开始连续播放失败",
    "en-US": "Failed to start playback",
  },
  "toast.syncSettingsSaveFail": {
    "zh-CN": "保存监听设置失败",
    "en-US": "Failed to save sync settings",
  },
  "toast.syncSettingsLoadFail": {
    "zh-CN": "加载监听设置失败",
    "en-US": "Failed to load sync settings",
  },
  "toast.webdavSettingsSaved": {
    "zh-CN": "WebDAV 配置已保存",
    "en-US": "WebDAV settings saved",
  },
  "toast.webdavSettingsSaveFail": {
    "zh-CN": "保存 WebDAV 配置失败",
    "en-US": "Failed to save WebDAV settings",
  },
  "toast.webdavSettingsLoadFail": {
    "zh-CN": "加载 WebDAV 配置失败",
    "en-US": "Failed to load WebDAV settings",
  },
  "toast.webdavTestDone": {
    "zh-CN": "WebDAV 连通测试通过",
    "en-US": "WebDAV connectivity test passed",
  },
  "toast.webdavTestFail": {
    "zh-CN": "WebDAV 连通测试失败",
    "en-US": "WebDAV connectivity test failed",
  },
  "toast.webdavUploadDone": {
    "zh-CN": "WebDAV 备份上传完成",
    "en-US": "WebDAV backup uploaded",
  },
  "toast.webdavUploadSummary": {
    "zh-CN": "视频 {videos} 条，关注 UP {followedUps} 个，标签 {tags} 个，评论 {comments} 条，专栏 {articles} 篇",
    "en-US": "{videos} videos, {followedUps} followed UPs, {tags} tags, {comments} comments, and {articles} articles",
  },
  "toast.webdavUploadFail": {
    "zh-CN": "WebDAV 上传失败",
    "en-US": "WebDAV upload failed",
  },
  "toast.webdavDownloadDone": {
    "zh-CN": "已下载 WebDAV 备份",
    "en-US": "WebDAV backup downloaded",
  },
  "toast.webdavDownloadFail": {
    "zh-CN": "下载 WebDAV 备份失败",
    "en-US": "Failed to download WebDAV backup",
  },
  "toast.webdavRestoreDone": {
    "zh-CN": "WebDAV 恢复完成",
    "en-US": "WebDAV restore completed",
  },
  "toast.webdavRestoreSummary": {
    "zh-CN": "写入视频 {videos} 条，关注 UP {followedUps} 个，收藏关系 {links} 条，标签绑定 {tags} 条，评论 {comments} 条，专栏 {articles} 篇",
    "en-US":
      "Imported {videos} videos, {followedUps} followed UPs, {links} folder links, {tags} tag links, {comments} comments, and {articles} articles",
  },
  "toast.webdavRestoreFail": {
    "zh-CN": "WebDAV 恢复失败",
    "en-US": "WebDAV restore failed",
  },
  "toast.autoInitPickFolder": {
    "zh-CN": "请至少选择一个收藏夹再开始初始化",
    "en-US": "Select at least one folder to start initialization",
  },
  "toast.followingUpsLoadFail": {
    "zh-CN": "加载关注 UP 失败",
    "en-US": "Failed to load following UPs",
  },
  "toast.followingUpsImportFail": {
    "zh-CN": "导入关注 UP 失败",
    "en-US": "Failed to import following UPs",
  },
  "toast.followingUpsImportDone": {
    "zh-CN": "关注 UP 导入完成",
    "en-US": "Following UP import completed",
  },
  "toast.autoInitCooling": {
    "zh-CN": "初始化进入冷却",
    "en-US": "Initialization entered cooldown",
  },
  "toast.autoInitCoolingDesc": {
    "zh-CN": "检测到风控（412），请在冷却结束后手动继续。",
    "en-US":
      "Risk-control detected (412). Resume manually after cooldown.",
  },
  "toast.tagEnrichStopped": {
    "zh-CN": "标签补全任务已暂停，进度已保存",
    "en-US": "Tag enrichment paused with progress saved",
  },
  "toast.tagEnrichStarted": {
    "zh-CN": "标签补全任务已开始",
    "en-US": "Tag enrichment started",
  },
  "toast.tagEnrichNoPending": {
    "zh-CN": "当前没有待补全的标签",
    "en-US": "No tags are pending enrichment",
  },
  "toast.autoInitDone": {
    "zh-CN": "初始化同步完成",
    "en-US": "Initialization sync completed",
  },
  "toast.autoInitDoneDesc": {
    "zh-CN":
      "视频同步完成，累计写入 {videos} 条。可在“同步B站 > 补全标签”中按收藏夹补全标签。",
    "en-US":
      "Video sync finished with {videos} imported. Use Sync Bilibili > Tag enrichment to enrich selected folders.",
  },
  "toast.autoInitFail": {
    "zh-CN": "初始化同步失败，请稍后重试",
    "en-US": "Initialization sync failed. Please retry later.",
  },
  "toast.autoInitLockHeld": {
    "zh-CN": "初始化任务正在其它管理页运行，请关闭重复页面后重试。",
    "en-US":
      "Initialization is running in another manager tab. Close duplicate tabs and retry.",
  },
  "toast.autoInitNeedResume": {
    "zh-CN": "当前收藏夹未同步完成，已保留断点",
    "en-US": "Current folder sync paused, checkpoint saved",
  },
  "toast.autoInitNeedResumeDesc": {
    "zh-CN": "可从第 {page} 页继续初始化，避免重复抓取。",
    "en-US": "Resume from page {page} to avoid re-fetching.",
  },
  "toast.appLoadFail": {
    "zh-CN": "页面加载失败，请刷新重试",
    "en-US": "Page failed to load. Please refresh and retry.",
  },
  "toast.exportDone": { "zh-CN": "导出完成", "en-US": "Export completed" },
  "toast.exportSummary": {
    "zh-CN": "导出视频 {videos} 条，关注 UP {followedUps} 个，标签 {tags} 个，评论 {comments} 条，专栏 {articles} 篇；完整数据请使用 JSON",
    "en-US": "Exported {videos} videos, {followedUps} followed UPs, {tags} tags, {comments} comments, and {articles} articles; use JSON for the complete backup",
  },
  "toast.exportFail": { "zh-CN": "导出失败", "en-US": "Export failed" },
  "toast.importDone": { "zh-CN": "导入完成", "en-US": "Import completed" },
  "toast.importSummary": {
    "zh-CN": "写入视频 {videos} 条，关注 UP {followedUps} 个，收藏关系 {links} 条，标签绑定 {tags} 条，评论 {comments} 条，专栏 {articles} 篇",
    "en-US":
      "Imported {videos} videos, {followedUps} followed UPs, {links} folder links, {tags} tag links, {comments} comments, and {articles} articles",
  },
  "toast.importFail": { "zh-CN": "导入失败", "en-US": "Import failed" },
  "toast.exportReminderTitle": {
    "zh-CN": "建议定期导出备份",
    "en-US": "Periodic backup is recommended",
  },
  "toast.exportReminderDesc": {
    "zh-CN": "你已有本地收藏数据，建议每 7 天导出一次 JSON 完整备份。",
    "en-US":
      "You have local saved data. Export a complete JSON backup every 7 days.",
  },
  "toast.commentsLoadFail": {
    "zh-CN": "加载评论收藏失败",
    "en-US": "Failed to load saved comments",
  },
  "toast.commentDeleted": {
    "zh-CN": "评论收藏已移入回收站",
    "en-US": "Saved comment moved to trash",
  },
  "toast.commentDeleteFail": {
    "zh-CN": "删除评论收藏失败",
    "en-US": "Failed to delete saved comment",
  },
  "toast.articlesLoadFail": { "zh-CN": "加载专栏收藏失败", "en-US": "Failed to load saved articles" },
  "toast.articleDeleted": { "zh-CN": "专栏收藏已移入回收站", "en-US": "Saved article moved to trash" },
  "toast.articleDeleteFail": { "zh-CN": "删除专栏收藏失败", "en-US": "Failed to delete saved article" },
  "toast.selectTrashCommentsFirst": { "zh-CN": "请先选择评论收藏", "en-US": "Select saved comments first" },
  "toast.commentsRestored": { "zh-CN": "评论收藏恢复成功", "en-US": "Saved comments restored" },
  "toast.commentsPurged": { "zh-CN": "评论收藏已永久删除", "en-US": "Saved comments permanently deleted" },
  "toast.commentRestored": { "zh-CN": "评论收藏恢复成功", "en-US": "Saved comment restored" },
  "toast.commentPurged": { "zh-CN": "评论收藏已永久删除", "en-US": "Saved comment permanently deleted" },
  "toast.restoreCommentFail": { "zh-CN": "恢复评论收藏失败", "en-US": "Failed to restore saved comment" },
  "toast.purgeCommentFail": { "zh-CN": "永久删除评论收藏失败", "en-US": "Failed to permanently delete saved comment" },
  "toast.selectTrashArticlesFirst": { "zh-CN": "请先选择专栏收藏", "en-US": "Select saved articles first" },
  "toast.articlesRestored": { "zh-CN": "专栏收藏恢复成功", "en-US": "Saved articles restored" },
  "toast.articlesPurged": { "zh-CN": "专栏收藏已永久删除", "en-US": "Saved articles permanently deleted" },
  "toast.articleRestored": { "zh-CN": "专栏收藏恢复成功", "en-US": "Saved article restored" },
  "toast.articlePurged": { "zh-CN": "专栏收藏已永久删除", "en-US": "Saved article permanently deleted" },
  "toast.restoreArticleFail": { "zh-CN": "恢复专栏收藏失败", "en-US": "Failed to restore saved article" },
  "toast.purgeArticleFail": { "zh-CN": "永久删除专栏收藏失败", "en-US": "Failed to permanently delete saved article" },
  "toast.articleFolderUpdateFail": { "zh-CN": "更新专栏文件夹失败", "en-US": "Failed to update article folders" },
  "toast.articleFoldersLoadFail": { "zh-CN": "加载专栏文件夹失败", "en-US": "Failed to load article folders" },
  "toast.articleFolderCreated": { "zh-CN": "专栏文件夹已创建", "en-US": "Article folder created" },
  "toast.articleFolderUpdated": { "zh-CN": "专栏文件夹已更新", "en-US": "Article folder updated" },
  "toast.articleFolderDeleted": { "zh-CN": "专栏文件夹已删除", "en-US": "Article folder deleted" },
  "toast.articleFolderCreateFail": { "zh-CN": "创建专栏文件夹失败", "en-US": "Failed to create article folder" },
  "toast.articleFolderDeleteFail": { "zh-CN": "删除专栏文件夹失败", "en-US": "Failed to delete article folder" },
  "toast.articleFolderReorderFail": { "zh-CN": "更新专栏文件夹排序失败", "en-US": "Failed to reorder article folders" },
  "confirm.deleteFolder.title": {
    "zh-CN": "Delete folder?",
    "en-US": "Delete folder?",
  },
  "confirm.deleteFolder.desc": {
    "zh-CN": "This moves folder and its videos to trash.",
    "en-US": "This moves folder and its videos to trash.",
  },
  "confirm.deleteTag.title": { "zh-CN": "Delete tag?", "en-US": "Delete tag?" },
  "confirm.deleteTag.desc": {
    "zh-CN": 'Delete tag "{name}"?',
    "en-US": 'Delete tag "{name}"?',
  },
  "confirm.deleteVideoGlobal.title": {
    "zh-CN": "Delete video?",
    "en-US": "Delete video?",
  },
  "confirm.deleteVideoGlobal.desc": {
    "zh-CN": "Move this video to trash.",
    "en-US": "Move this video to trash.",
  },
  "confirm.deleteVideoFolderOnly.title": {
    "zh-CN": "Remove from current folder?",
    "en-US": "Remove from current folder?",
  },
  "confirm.deleteVideoFolderOnly.desc": {
    "zh-CN": "Only remove this video from current folder.",
    "en-US": "Only remove this video from current folder.",
  },
  "confirm.batchDeleteGlobal.title": {
    "zh-CN": "Delete selected videos?",
    "en-US": "Delete selected videos?",
  },
  "confirm.batchDeleteGlobal.desc": {
    "zh-CN": "Move selected videos to trash.",
    "en-US": "Move selected videos to trash.",
  },
  "confirm.batchDeleteFolderOnly.title": {
    "zh-CN": "Remove from current folder?",
    "en-US": "Remove from current folder?",
  },
  "confirm.batchDeleteFolderOnly.desc": {
    "zh-CN": "Only remove selected videos from current folder.",
    "en-US": "Only remove selected videos from current folder.",
  },
  "confirm.purgeFolders.title": {
    "zh-CN": "Permanently delete folders?",
    "en-US": "Permanently delete folders?",
  },
  "confirm.purgeFolders.desc": {
    "zh-CN": "This action cannot be undone.",
    "en-US": "This action cannot be undone.",
  },
  "confirm.purgeVideos.title": {
    "zh-CN": "Permanently delete videos?",
    "en-US": "Permanently delete videos?",
  },
  "confirm.purgeVideos.desc": {
    "zh-CN": "This action cannot be undone.",
    "en-US": "This action cannot be undone.",
  },
  "confirm.purgeFolderSingle.title": {
    "zh-CN": "Delete this folder forever?",
    "en-US": "Delete this folder forever?",
  },
  "confirm.purgeFolderSingle.desc": {
    "zh-CN": "This action cannot be undone.",
    "en-US": "This action cannot be undone.",
  },
  "confirm.purgeVideoSingle.title": {
    "zh-CN": "Delete this video forever?",
    "en-US": "Delete this video forever?",
  },
  "confirm.purgeVideoSingle.desc": {
    "zh-CN": "This action cannot be undone.",
    "en-US": "This action cannot be undone.",
  },
  "confirm.purgeComments.title": { "zh-CN": "永久删除已选评论收藏？", "en-US": "Permanently delete selected comments?" },
  "confirm.purgeComments.desc": { "zh-CN": "评论正文和图片信息将永久删除，此操作不可撤销。", "en-US": "Comment text and image data will be permanently deleted. This cannot be undone." },
  "confirm.purgeCommentSingle.title": { "zh-CN": "永久删除这条评论收藏？", "en-US": "Permanently delete this saved comment?" },
  "confirm.purgeCommentSingle.desc": { "zh-CN": "评论正文和图片信息将永久删除，此操作不可撤销。", "en-US": "Comment text and image data will be permanently deleted. This cannot be undone." },
  "confirm.purgeArticles.title": { "zh-CN": "永久删除已选专栏收藏？", "en-US": "Permanently delete selected articles?" },
  "confirm.purgeArticles.desc": { "zh-CN": "专栏数据及原文件夹关系将永久删除，此操作不可撤销。", "en-US": "Article data and original folder links will be permanently deleted. This cannot be undone." },
  "confirm.purgeArticleSingle.title": { "zh-CN": "永久删除这篇专栏收藏？", "en-US": "Permanently delete this saved article?" },
  "confirm.purgeArticleSingle.desc": { "zh-CN": "专栏数据及原文件夹关系将永久删除，此操作不可撤销。", "en-US": "Article data and original folder links will be permanently deleted. This cannot be undone." },
  "dialog.confirm.title": {
    "zh-CN": "Please confirm",
    "en-US": "Please confirm",
  },
  "dialog.renameTag.title": { "zh-CN": "Rename Tag", "en-US": "Rename Tag" },
  "dialog.renameTag.placeholder": {
    "zh-CN": "Enter new tag name",
    "en-US": "Enter new tag name",
  },
  "dialog.renameTag.description": {
    "zh-CN": "Renaming a tag updates all linked videos.",
    "en-US": "Renaming a tag updates all linked videos.",
  },
  "dialog.renameTag.save": { "zh-CN": "Save Tag", "en-US": "Save Tag" },
};

const MANAGER_I18N_ZH_OVERRIDES: Record<string, string> = {
  "header.subtitle": "一个用于替代 B 站原生收藏管理的浏览器扩展。",
  "header.webdavSettings": "WebDAV",
  "sync.remoteVideoCount": "B 站收藏 {count} 条",
  "autoInit.remoteVideoCount": "B 站收藏 {count} 条",
  "sync.settings.title": "B 站动作监听",
  "sync.settings.desc":
    "仅监听 B 站收藏动作，并将增删、移动、复制等变更对账到本地。",
  "sync.settings.biliToLocalTitle": "B 站 -> 插件：同步收藏动作",
  "sync.settings.biliToLocalDesc":
    "检测到 B 站原生收藏动作后，自动按远端收藏夹状态对账到本地。",
  "sync.settings.localToBiliTitle": "插件 -> B 站：同步收藏动作",
  "sync.settings.localToBiliDesc":
    "在插件中收藏时，尝试同步写回已绑定远端 media_id 的 B 站收藏夹。",
  "webdav.desc":
    "配置 WebDAV 后，可进行连通测试、上传备份、下载备份与远端恢复。",
  "detail.title": "视频详情",
  "detail.bv": "BV 号",
  "detail.videoTitle": "标题",
  "detail.uploader": "UP主",
  "detail.description": "简介",
  "detail.publishAt": "发布时间",
  "detail.uploaderSpace": "UP 主空间链接",
  "detail.customTags": "自定义标签",
  "detail.bilibiliTags": "B站标签",
  "detail.customTagsInputPlaceholder": "多个标签用逗号分隔",
  "detail.systemTagsInputPlaceholder": "多个标签用逗号分隔",
  "detail.folders": "所属收藏夹",
  "detail.aiTitle": "AI 分类",
  "detail.aiCategories": "AI 主分类",
  "detail.aiAnalyzedAt": "分类时间",
  "detail.aiProviderModel": "提供商 / 模型",
  "detail.openOnBilibili": "在 B 站打开",
  "detail.openUploaderSpace": "打开 UP 主空间",
  "detail.manualComplete": "手动补全信息",
  "detail.manualEditHint": "可手动补全/修正老视频信息，便于后续检索统计。",
  "detail.saveManual": "保存修改",
  "detail.saving": "保存中...",
  "toast.loadFoldersFail": "加载收藏夹失败",
  "toast.loadTagsFail": "加载标签失败",
  "toast.loadVideosFail": "加载视频失败",
  "toast.loadTrashFail": "加载回收站失败",
  "toast.folderCreated": "收藏夹创建成功",
  "toast.folderUpdated": "收藏夹更新成功",
  "toast.folderDeleted": "收藏夹已移入回收站",
  "toast.folderReordered": "收藏夹排序已更新",
  "toast.folderCreateFail": "创建收藏夹失败",
  "toast.folderUpdateFail": "更新收藏夹失败",
  "toast.folderDeleteFail": "删除收藏夹失败",
  "toast.folderReorderFail": "更新收藏夹排序失败",
  "toast.tagNameRequired": "标签名称不能为空",
  "toast.tagCreated": "自定义标签创建成功",
  "toast.tagRefreshed": "标签已存在，已刷新列表",
  "toast.tagRenamed": "标签重命名成功",
  "toast.tagDeleted": "标签删除成功",
  "toast.tagCreateFail": "创建自定义标签失败",
  "toast.tagRenameFail": "重命名标签失败",
  "toast.tagDeleteFail": "删除标签失败",
  "toast.selectVideosFirst": "请先选择视频",
  "toast.chooseTargetFolder": "请选择目标收藏夹",
  "toast.moveNeedFolderContext": "移动操作需要在具体收藏夹下执行",
  "toast.batchMoved": "视频移动成功",
  "toast.batchCopied": "视频复制成功",
  "toast.batchMoveCopyFail": "批量移动/复制失败",
  "toast.openSpecificFolder": "请先打开具体收藏夹",
  "toast.batchDeleteDone": "批量删除完成",
  "toast.batchDeleteFail": "批量删除失败",
  "toast.videoDeleted": "视频已移入回收站",
  "toast.videoRemovedFromFolder": "视频已从当前收藏夹移除",
  "toast.videoDeleteFail": "删除视频失败",
  "toast.selectFoldersFirst": "请先选择收藏夹",
  "toast.selectTrashVideosFirst": "请先选择视频",
  "toast.foldersRestored": "收藏夹恢复成功",
  "toast.foldersPurged": "收藏夹已永久删除",
  "toast.videosRestored": "视频恢复成功",
  "toast.videosPurged": "视频已永久删除",
  "toast.restoreFolderFail": "恢复收藏夹失败",
  "toast.purgeFolderFail": "永久删除收藏夹失败",
  "toast.restoreVideoFail": "恢复视频失败",
  "toast.purgeVideoFail": "永久删除视频失败",
  "toast.folderRestored": "收藏夹恢复成功",
  "toast.folderPurged": "收藏夹已永久删除",
  "toast.videoRestored": "视频恢复成功",
  "toast.videoPurged": "视频已永久删除",
  "toast.loadDetailFail": "加载视频详情失败",
  "toast.detailUpdated": "视频信息更新成功",
  "toast.detailUpdateFail": "更新视频信息失败",
  "confirm.deleteFolder.title": "删除收藏夹？",
  "confirm.deleteFolder.desc": "该操作会将收藏夹及其视频移入回收站。",
  "confirm.deleteTag.title": "删除标签？",
  "confirm.deleteTag.desc": "确认删除标签“{name}”？",
  "confirm.deleteVideoGlobal.title": "删除视频？",
  "confirm.deleteVideoGlobal.desc": "该视频将移入回收站。",
  "confirm.deleteVideoFolderOnly.title": "从当前收藏夹移除？",
  "confirm.deleteVideoFolderOnly.desc": "仅从当前收藏夹移除该视频。",
  "confirm.batchDeleteGlobal.title": "删除已选视频？",
  "confirm.batchDeleteGlobal.desc": "已选视频将移入回收站。",
  "confirm.batchDeleteFolderOnly.title": "从当前收藏夹移除？",
  "confirm.batchDeleteFolderOnly.desc": "仅从当前收藏夹移除已选视频。",
  "confirm.purgeFolders.title": "永久删除收藏夹？",
  "confirm.purgeFolders.desc": "该操作不可撤销。",
  "confirm.purgeVideos.title": "永久删除视频？",
  "confirm.purgeVideos.desc": "该操作不可撤销。",
  "confirm.purgeFolderSingle.title": "永久删除该收藏夹？",
  "confirm.purgeFolderSingle.desc": "该操作不可撤销。",
  "confirm.purgeVideoSingle.title": "永久删除该视频？",
  "confirm.purgeVideoSingle.desc": "该操作不可撤销。",
  "dialog.confirm.title": "请确认操作",
  "dialog.renameTag.title": "重命名标签",
  "dialog.renameTag.placeholder": "请输入新标签名",
  "dialog.renameTag.description": "重命名后会同步更新所有关联视频。",
  "dialog.renameTag.save": "保存标签",
};

for (const [key, value] of Object.entries(MANAGER_I18N_ZH_OVERRIDES)) {
  if (MANAGER_I18N[key]) {
    MANAGER_I18N[key]["zh-CN"] = value;
  }
}
