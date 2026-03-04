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
    "zh-CN": "一个用于替代 B 站原生收藏管理的浏览器扩展。",
    "en-US":
      "A browser extension alternative to bilibili's collection manager.",
  },
  "header.credit": {
    "zh-CN": "By TLRK · © 2026 TLRK · MIT License",
    "en-US": "By TLRK · © 2026 TLRK · MIT License",
  },
  "header.manageTags": {
    "zh-CN": "管理自定义标签",
    "en-US": "Manage Custom Tags",
  },
  "header.syncSettings": {
    "zh-CN": "监听设置",
    "en-US": "Listener Settings",
  },
  "header.webdavSettings": {
    "zh-CN": "WebDAV 备份",
    "en-US": "WebDAV Backup",
  },
  "header.syncImport": { "zh-CN": "同步导入", "en-US": "Sync Import" },
  "header.syncing": { "zh-CN": "同步中...", "en-US": "Syncing..." },
  "header.importData": { "zh-CN": "导入备份", "en-US": "Import Backup" },
  "header.exportBackup": { "zh-CN": "导出备份", "en-US": "Export Backup" },
  "header.exportDialogTitle": {
    "zh-CN": "选择导出格式",
    "en-US": "Choose export format",
  },
  "header.exportDialogDesc": {
    "zh-CN": "请选择导出为 JSON 或 CSV 备份文件。",
    "en-US": "Choose JSON or CSV for backup export.",
  },
  "header.exportJson": { "zh-CN": "导出 JSON", "en-US": "Export JSON" },
  "header.exportCsv": { "zh-CN": "导出 CSV", "en-US": "Export CSV" },
  "header.openTrash": { "zh-CN": "打开回收站", "en-US": "Open Trash" },
  "header.backManager": { "zh-CN": "返回管理页", "en-US": "Back To Manager" },
  "view.manager": { "zh-CN": "视图：管理页", "en-US": "View: Manager" },
  "view.trash": { "zh-CN": "视图：回收站", "en-US": "View: Trash Bin" },
  "scope.trash": { "zh-CN": "范围：回收站", "en-US": "Scope: Recycle Bin" },
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
  "sync.dialogTitle": {
    "zh-CN": "选择要同步的收藏夹",
    "en-US": "Select folders to sync",
  },
  "sync.dialogDesc": {
    "zh-CN":
      "选择一个收藏夹后，系统将按小批次自动循环导入，减少风控与导入波动。",
    "en-US":
      "Select one folder, then import runs automatically in small chunks to reduce risk-control and instability.",
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
  "sync.includeTagEnrichmentHint": {
    "zh-CN":
      "抓取并实时补齐 B 站标签（更完整但更慢）。建议关闭，主同步后将后台慢慢补齐。",
    "en-US":
      "Fetch and enrich Bilibili tags during sync (more complete but slower). Recommended to keep off; tags will be enriched in background after main sync.",
  },
  "sync.tagEnrichDisabledHint": {
    "zh-CN":
      "主同步默认不抓取 archive-tags；同步完成后将自动进入阶段2，在后台低速补全标签。",
    "en-US":
      "Archive-tags are skipped during primary sync. Phase 2 runs automatically in background to enrich tags at a low rate.",
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
    "zh-CN": "阶段2：后台标签补全",
    "en-US": "Phase 2: Background tag enrichment",
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
    "zh-CN": "立即补全",
    "en-US": "Run one batch now",
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
  "webdav.title": {
    "zh-CN": "WebDAV 备份/恢复",
    "en-US": "WebDAV Backup/Restore",
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
  "trash.emptyFolders": {
    "zh-CN": "回收站中暂无收藏夹。",
    "en-US": "No folders in trash.",
  },
  "trash.emptyVideos": {
    "zh-CN": "回收站中暂无视频。",
    "en-US": "No videos in trash.",
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
  "toast.syncPartial": {
    "zh-CN": "部分收藏夹同步失败",
    "en-US": "Some folders failed to sync",
  },
  "toast.syncHiddenErrors": {
    "zh-CN": "其余 {count} 个错误已省略",
    "en-US": "{count} more errors omitted",
  },
  "toast.syncFail": { "zh-CN": "同步导入失败", "en-US": "Sync import failed" },
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
    "zh-CN": "视频已优先完成同步，缺失标签将由后台按低频慢慢补齐。",
    "en-US":
      "Video sync is prioritized first, and missing tags will be filled gradually by background low-frequency jobs.",
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
  "toast.syncSettingsSaved": {
    "zh-CN": "监听设置已保存",
    "en-US": "Sync settings saved",
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
    "zh-CN": "视频 {videos} 条，标签 {tags} 个",
    "en-US": "{videos} videos, {tags} tags",
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
    "zh-CN": "写入视频 {videos} 条，收藏关系 {links} 条，标签绑定 {tags} 条",
    "en-US":
      "Imported {videos} videos, {links} folder links, and {tags} tag links",
  },
  "toast.webdavRestoreFail": {
    "zh-CN": "WebDAV 恢复失败",
    "en-US": "WebDAV restore failed",
  },
  "toast.autoInitPickFolder": {
    "zh-CN": "请至少选择一个收藏夹再开始初始化",
    "en-US": "Select at least one folder to start initialization",
  },
  "toast.autoInitCooling": {
    "zh-CN": "初始化进入冷却",
    "en-US": "Initialization entered cooldown",
  },
  "toast.autoInitCoolingDesc": {
    "zh-CN": "检测到风控（412），将稍后自动继续。",
    "en-US":
      "Risk-control detected (412). Initialization will auto-resume later.",
  },
  "toast.autoInitDone": {
    "zh-CN": "初始化同步完成",
    "en-US": "Initialization sync completed",
  },
  "toast.autoInitDoneDesc": {
    "zh-CN":
      "已完成第一阶段同步，累计写入视频 {videos} 条，标签将继续后台补全。",
    "en-US":
      "Phase 1 sync finished with {videos} videos imported. Tag enrichment will continue in background.",
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
    "zh-CN": "导出视频 {videos} 条，标签 {tags} 个",
    "en-US": "Exported {videos} videos and {tags} tags",
  },
  "toast.exportFail": { "zh-CN": "导出失败", "en-US": "Export failed" },
  "toast.importDone": { "zh-CN": "导入完成", "en-US": "Import completed" },
  "toast.importSummary": {
    "zh-CN": "写入视频 {videos} 条，收藏关系 {links} 条，标签绑定 {tags} 条",
    "en-US":
      "Imported {videos} videos, {links} folder links, and {tags} tag links",
  },
  "toast.importFail": { "zh-CN": "导入失败", "en-US": "Import failed" },
  "toast.exportReminderTitle": {
    "zh-CN": "建议定期导出备份",
    "en-US": "Periodic backup is recommended",
  },
  "toast.exportReminderDesc": {
    "zh-CN": "你已有收藏数据，建议每 7 天导出一次 JSON/CSV 以便恢复。",
    "en-US":
      "You already have library data. Export JSON/CSV every 7 days for recovery.",
  },
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
  "header.webdavSettings": "WebDAV 备份",
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
