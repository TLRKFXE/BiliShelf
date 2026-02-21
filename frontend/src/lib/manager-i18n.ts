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
    "zh-CN": "一个替代bilibili收藏夹管理方案的浏览器插件。",
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
    "zh-CN": "抓取并补齐 B 站标签（更完整但更慢）。关闭后速度更快。",
    "en-US":
      "Fetch and enrich Bilibili tags (more complete but slower). Turn off for faster sync.",
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
    "zh-CN": "B站收藏 {count} 条",
    "en-US": "{count} videos on Bilibili",
  },
  "sync.startImport": { "zh-CN": "开始同步", "en-US": "Start sync" },
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
  "detail.saveManual": { "zh-CN": "Save Manual Changes", "en-US": "Save Manual Changes" },
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
  "detail.title": "视频详情",
  "detail.bv": "BV号",
  "detail.videoTitle": "标题",
  "detail.uploader": "UP主",
  "detail.description": "简介",
  "detail.publishAt": "发布时间",
  "detail.uploaderSpace": "UP主空间链接",
  "detail.customTags": "自定义标签",
  "detail.bilibiliTags": "B站标签",
  "detail.customTagsInputPlaceholder": "多个标签用逗号分隔",
  "detail.systemTagsInputPlaceholder": "多个标签用逗号分隔",
  "detail.folders": "所属收藏夹",
  "detail.openOnBilibili": "在B站打开",
  "detail.openUploaderSpace": "打开UP空间",
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
