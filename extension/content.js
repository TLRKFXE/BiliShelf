import {
  containsFavoriteActionKeyword,
  extractFavoriteFolderIdFromUrl,
  extractBvidFromAny,
  extractAidFromAny,
  extractBangumiSeasonId,
  extractAudioId,
  isActionSyncPageUrl,
  isDynamicVideoUrl,
  isArticleUiUrl,
  isCollectorUiUrl,
  isSpecialMediaUrl,
  extractOpusId,
  normalizeBvidToken,
} from "./utils/bili-action-sync.js";
import { buildArticleSourceKey, normalizeOpusId } from "./shared/article-favorite.js";
import {
  buildQuickFavoriteToastMessage,
  isEditableTarget,
  matchesQuickFavoriteShortcut,
} from "./utils/quick-favorite.js";
import {
  findPlaybackQueueIndex,
  getAdjacentPlaybackItems,
  isMarkedFolderPlaybackUrl,
  markFolderPlaybackUrl,
} from "./shared/folder-playback-session.js";
import {
  QUICK_FAVORITE_SHORTCUT_STORAGE_KEY,
  formatShortcutLabel,
  resolveStoredShortcut,
} from "./utils/shortcut-config.js";
import {
  COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY,
  createRememberedCollectorFolderIdsRecord,
  resolveRememberedCollectorFolderIds,
} from "./utils/collector-folder-memory.js";
import {
  appendSuggestedCustomTag,
  findMatchingCustomTagSuggestions,
} from "./utils/custom-tag-suggestions.js";
import {
  normalizeFavoriteComment,
  parseBilibiliCount,
  parseCommentPublishedAt,
} from "./shared/comment-favorite.js";

(function () {
  const LOCAL_API_MESSAGE = "BILISHELF_LOCAL_API";
  const BILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view";
  const BILI_TAG_API = "https://api.bilibili.com/x/tag/archive/tags";
  const BILI_BANGUMI_SEASON_API = "https://api.bilibili.com/pgc/view/web/season";
  const BILI_AUDIO_INFO_APIS = [
    "https://www.bilibili.com/audio/music-service-c/web/song/info",
    "https://api.bilibili.com/audio/music-service-c/web/song/info"
  ];
  const DEFAULT_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";

  const BUTTON_POS_STORAGE_KEY = "bili_like_button_pos_v3";
  const BUTTON_SIDE_STORAGE_KEY = "bili_like_button_side_v3";
  const LEGACY_BUTTON_POS_STORAGE_KEY = "bili_like_button_pos_v2";
  const LEGACY_BUTTON_SIDE_STORAGE_KEY = "bili_like_button_side_v2";
  const BUTTON_MIN_MARGIN = 12;
  const THEME_STORAGE_KEY = "bili_like_ext_theme";
  const LOCALE_STORAGE_KEY = "bili_like_locale";

  const THEME_AUTO = "auto";
  const THEME_LIGHT = "light";
  const THEME_DARK = "dark";
  const LOCALE_ZH = "zh-CN";
  const LOCALE_EN = "en-US";
  const LOCAL_API_TIMEOUT_MS = 45_000;
  const BIDIRECTIONAL_SETTINGS_CACHE_MS = 30_000;
  const BILI_SYNC_PULL_DEBOUNCE_MS = 1800;
  const COMMENT_SCAN_INTERVAL_MS = 2_000;

  const I18N = {
    "title.collector": {
      [LOCALE_ZH]: "BiliShelf 收藏助手",
      [LOCALE_EN]: "BiliShelf Collector"
    },
    "footer.credit": {
      [LOCALE_ZH]: "By TLRK · © 2026 TLRK · MIT License",
      [LOCALE_EN]: "By TLRK · © 2026 TLRK · MIT License"
    },
    "button.close": { [LOCALE_ZH]: "关闭", [LOCALE_EN]: "Close" },
    "button.save": { [LOCALE_ZH]: "保存", [LOCALE_EN]: "Save" },
    "button.saving": { [LOCALE_ZH]: "正在保存...", [LOCALE_EN]: "Saving..." },
    "button.newFolder": { [LOCALE_ZH]: "新建收藏夹", [LOCALE_EN]: "New Folder" },
    "button.newArticleFolder": { [LOCALE_ZH]: "新建专栏文件夹", [LOCALE_EN]: "New Article Folder" },
    "button.selectAll": { [LOCALE_ZH]: "全选", [LOCALE_EN]: "Select all" },
    "button.clear": { [LOCALE_ZH]: "清空", [LOCALE_EN]: "Clear" },
    "button.cancel": { [LOCALE_ZH]: "取消", [LOCALE_EN]: "Cancel" },
    "button.create": { [LOCALE_ZH]: "创建", [LOCALE_EN]: "Create" },
    "button.quickSave": { [LOCALE_ZH]: "快捷收藏", [LOCALE_EN]: "Quick favorite" },
    "button.previous": { [LOCALE_ZH]: "上一个", [LOCALE_EN]: "Previous" },
    "button.next": { [LOCALE_ZH]: "下一个", [LOCALE_EN]: "Next" },
    "button.showList": { [LOCALE_ZH]: "查看列表", [LOCALE_EN]: "Show queue" },
    "button.hideList": { [LOCALE_ZH]: "收起列表", [LOCALE_EN]: "Hide queue" },
    "button.collapse": { [LOCALE_ZH]: "收起", [LOCALE_EN]: "Collapse" },
    "button.expand": { [LOCALE_ZH]: "展开", [LOCALE_EN]: "Expand" },
    "button.openManager": { [LOCALE_ZH]: "回到管理页", [LOCALE_EN]: "Open manager" },
    "button.endPlayback": { [LOCALE_ZH]: "结束播放", [LOCALE_EN]: "End playback" },
    "button.favoriteComment": { [LOCALE_ZH]: "收藏评论", [LOCALE_EN]: "Save comment" },
    "button.savedComment": { [LOCALE_ZH]: "已收藏", [LOCALE_EN]: "Saved" },
    "button.unfavoriteComment": { [LOCALE_ZH]: "取消收藏", [LOCALE_EN]: "Remove saved comment" },
    "section.folders": { [LOCALE_ZH]: "收藏夹", [LOCALE_EN]: "Folders" },
    "section.articleFolders": { [LOCALE_ZH]: "专栏文件夹", [LOCALE_EN]: "Article Folders" },
    "section.customTags": { [LOCALE_ZH]: "自定义标签", [LOCALE_EN]: "Custom Tags" },
    "field.searchFolders": { [LOCALE_ZH]: "搜索收藏夹...", [LOCALE_EN]: "Search folders..." },
    "field.quickFavoriteSearch": {
      [LOCALE_ZH]: "搜索并选择收藏夹",
      [LOCALE_EN]: "Search and pick folders"
    },
    "field.customTags": {
      [LOCALE_ZH]: "自定义标签（逗号分隔）",
      [LOCALE_EN]: "Custom tags (comma separated)"
    },
    "status.noVideoTitle": { [LOCALE_ZH]: "未检测到视频", [LOCALE_EN]: "No video detected" },
    "status.noVideoDesc": {
      [LOCALE_ZH]: "请先打开一个 Bilibili 视频页面。",
      [LOCALE_EN]: "Open a Bilibili video page first."
    },
    "status.unknownUploader": { [LOCALE_ZH]: "未知 UP 主", [LOCALE_EN]: "Unknown uploader" },
    "status.untitled": { [LOCALE_ZH]: "未命名视频", [LOCALE_EN]: "Untitled" },
    "status.coverAlt": { [LOCALE_ZH]: "视频封面", [LOCALE_EN]: "Video cover" },
    "status.selectedCount": { [LOCALE_ZH]: "已选 {count}", [LOCALE_EN]: "{count} selected" },
    "status.videosCount": { [LOCALE_ZH]: "{count} 个视频", [LOCALE_EN]: "{count} videos" },
    "status.articlesCount": { [LOCALE_ZH]: "{count} 篇专栏", [LOCALE_EN]: "{count} articles" },
    "status.noFolders": { [LOCALE_ZH]: "没有匹配的收藏夹", [LOCALE_EN]: "No folders found" },
    "status.expandFolderGroup": { [LOCALE_ZH]: "展开收藏夹分组", [LOCALE_EN]: "Expand folder group" },
    "status.collapseFolderGroup": { [LOCALE_ZH]: "收起收藏夹分组", [LOCALE_EN]: "Collapse folder group" },
    "status.favoriteButton": { [LOCALE_ZH]: "收藏视频", [LOCALE_EN]: "Save video" },
    "status.favoriteButtonSaved": {
      [LOCALE_ZH]: "该视频已收藏，点击管理",
      [LOCALE_EN]: "This video is saved. Click to manage"
    },
    "status.localFavoriteNearNative": {
      [LOCALE_ZH]: "BiliShelf 已收藏",
      [LOCALE_EN]: "BiliShelf saved"
    },
    "status.localFavoriteNearNativeIdle": {
      [LOCALE_ZH]: "BiliShelf 未收藏",
      [LOCALE_EN]: "BiliShelf not saved"
    },
    "status.localFavoriteNearNativeLoading": {
      [LOCALE_ZH]: "BiliShelf 检查中",
      [LOCALE_EN]: "Checking BiliShelf"
    },
    "status.favoriteArticleButton": {
      [LOCALE_ZH]: "收藏专栏",
      [LOCALE_EN]: "Save article"
    },
    "status.favoriteArticleButtonSaved": {
      [LOCALE_ZH]: "该专栏已收藏，点击管理",
      [LOCALE_EN]: "This article is saved. Click to manage"
    },
    "status.articleSaved": { [LOCALE_ZH]: "专栏已收藏", [LOCALE_EN]: "Article saved" },
    "status.articleRemoved": { [LOCALE_ZH]: "已取消专栏收藏", [LOCALE_EN]: "Article removed" },
    "status.favoriteSavedTitle": { [LOCALE_ZH]: "收藏成功", [LOCALE_EN]: "Saved" },
    "status.favoriteAlreadySavedTitle": {
      [LOCALE_ZH]: "该视频已经收藏",
      [LOCALE_EN]: "This video is already saved"
    },
    "status.favoriteUpdatedTitle": {
      [LOCALE_ZH]: "收藏夹已更新",
      [LOCALE_EN]: "Folders updated"
    },
    "status.articleSavedTitle": { [LOCALE_ZH]: "专栏收藏成功", [LOCALE_EN]: "Article saved" },
    "status.articleAlreadySavedTitle": { [LOCALE_ZH]: "该专栏已经收藏", [LOCALE_EN]: "This article is already saved" },
    "status.articleUpdatedTitle": { [LOCALE_ZH]: "专栏文件夹已更新", [LOCALE_EN]: "Article folders updated" },
    "status.articleRemovedTitle": { [LOCALE_ZH]: "已取消专栏收藏", [LOCALE_EN]: "Article removed" },
    "status.favoriteRemovedTitle": {
      [LOCALE_ZH]: "已取消本地收藏",
      [LOCALE_EN]: "Removed from local library"
    },
    "status.quickFavoriteHint": {
      [LOCALE_ZH]: "快捷键 {shortcut}",
      [LOCALE_EN]: "Shortcut {shortcut}"
    },
    "modal.createFolder": { [LOCALE_ZH]: "新建收藏夹", [LOCALE_EN]: "Create Folder" },
    "modal.createArticleFolder": { [LOCALE_ZH]: "新建专栏文件夹", [LOCALE_EN]: "Create Article Folder" },
    "modal.name": { [LOCALE_ZH]: "名称", [LOCALE_EN]: "Name" },
    "modal.description": { [LOCALE_ZH]: "简介", [LOCALE_EN]: "Description" },
    "modal.group": { [LOCALE_ZH]: "分组", [LOCALE_EN]: "Group" },
    "modal.groupPlaceholder": {
      [LOCALE_ZH]: "例如：学习、娱乐（可选）",
      [LOCALE_EN]: "e.g. Learning, Entertainment (optional)"
    },
    "modal.folderNamePlaceholder": { [LOCALE_ZH]: "收藏夹名称", [LOCALE_EN]: "Folder name" },
    "modal.folderDescPlaceholder": {
      [LOCALE_ZH]: "收藏夹简介",
      [LOCALE_EN]: "Folder description"
    },
    "toast.detectBvidFail": {
      [LOCALE_ZH]: "无法从当前页面识别 BV 号",
      [LOCALE_EN]: "Cannot detect BV from current page"
    },
    "toast.videoLoadFail": { [LOCALE_ZH]: "视频信息读取失败", [LOCALE_EN]: "Load failed" },
    "toast.folderLoadFail": {
      [LOCALE_ZH]: "加载收藏夹失败",
      [LOCALE_EN]: "Load folders failed"
    },
    "toast.folderNameRequired": {
      [LOCALE_ZH]: "收藏夹名称不能为空",
      [LOCALE_EN]: "Folder name cannot be empty"
    },
    "toast.folderCreatedSelected": {
      [LOCALE_ZH]: "已创建并选中新收藏夹",
      [LOCALE_EN]: "Folder created and selected"
    },
    "toast.folderExistsSelected": {
      [LOCALE_ZH]: "已存在同名收藏夹，已自动选中",
      [LOCALE_EN]: "Folder already exists, selected it"
    },
    "toast.folderCreateFail": { [LOCALE_ZH]: "创建收藏夹失败", [LOCALE_EN]: "Create folder failed" },
    "toast.videoIncomplete": {
      [LOCALE_ZH]: "视频信息不完整，无法保存",
      [LOCALE_EN]: "Video info is incomplete"
    },
    "toast.articleIncomplete": {
      [LOCALE_ZH]: "专栏信息不完整，无法保存",
      [LOCALE_EN]: "Article info is incomplete"
    },
    "toast.articleFolderRequired": {
      [LOCALE_ZH]: "请至少选择一个专栏文件夹",
      [LOCALE_EN]: "Select at least one article folder"
    },
    "toast.saved": { [LOCALE_ZH]: "已保存到本地 BiliShelf", [LOCALE_EN]: "Saved to local BiliShelf" },
    "toast.savedAddedFolders": {
      [LOCALE_ZH]: "已加入收藏夹 {folders}",
      [LOCALE_EN]: "Added to folders: {folders}"
    },
    "toast.savedDuplicate": {
      [LOCALE_ZH]: "该视频已在收藏夹 {folders} 中",
      [LOCALE_EN]: "This video is already in folders: {folders}"
    },
    "toast.savedMixedFolders": {
      [LOCALE_ZH]: "已加入 {addedFolders}；原本已在 {existingFolders} 中",
      [LOCALE_EN]: "Added to {addedFolders}; already existed in {existingFolders}"
    },
    "toast.savedRemovedFolders": {
      [LOCALE_ZH]: "已从本地收藏夹移除 {folders}",
      [LOCALE_EN]: "Removed from local folders: {folders}"
    },
    "toast.savedWithBiliSync": {
      [LOCALE_ZH]: "已同步写回 B站收藏夹 {count} 个",
      [LOCALE_EN]: "Also synced to {count} Bilibili favorite folders"
    },
    "toast.savedWithBiliSyncWarning": {
      [LOCALE_ZH]: "本地已保存，但写回 B站失败",
      [LOCALE_EN]: "Saved locally, but Bilibili sync-back failed"
    },
    "toast.biliPullSynced": {
      [LOCALE_ZH]: "检测到B站收藏动作，已同步到本地",
      [LOCALE_EN]: "Detected Bilibili favorite action and synced locally"
    },
    "toast.saveFail": { [LOCALE_ZH]: "保存失败", [LOCALE_EN]: "Save failed" },
    "toast.commentSaveFail": { [LOCALE_ZH]: "评论收藏失败", [LOCALE_EN]: "Failed to save comment" },
    "toast.commentReadFail": {
      [LOCALE_ZH]: "暂时无法读取这条评论，请展开评论后重试",
      [LOCALE_EN]: "This comment could not be read. Expand it and try again"
    },
    "status.readingCurrentPage": { [LOCALE_ZH]: "正在读取当前页面...", [LOCALE_EN]: "Reading current page..." },
    "quickFavorite.title": {
      [LOCALE_ZH]: "快捷收藏",
      [LOCALE_EN]: "Quick favorite"
    },
    "playback.title": {
      [LOCALE_ZH]: "收藏夹连续播放",
      [LOCALE_EN]: "Folder playback"
    },
    "playback.progress": {
      [LOCALE_ZH]: "第 {current} / {total} 个",
      [LOCALE_EN]: "{current} / {total}"
    },
    "playback.folder": {
      [LOCALE_ZH]: "收藏夹 #{folderId}",
      [LOCALE_EN]: "Folder #{folderId}"
    },
    "playback.queueEmpty": {
      [LOCALE_ZH]: "当前播放队列为空",
      [LOCALE_EN]: "Playback queue is empty"
    },
    "playback.current": {
      [LOCALE_ZH]: "当前播放",
      [LOCALE_EN]: "Now playing"
    },
    "toast.extensionReloadRequired": {
      [LOCALE_ZH]: "扩展已更新，请刷新当前页面后再试",
      [LOCALE_EN]: "The extension was updated. Reload this page and try again."
    },
    "error.unknown": { [LOCALE_ZH]: "未知错误", [LOCALE_EN]: "Unknown error" }
  };
  function resolveLocaleFromBrowser() {
    const language = (
      chrome?.i18n?.getUILanguage?.() ||
      navigator.language ||
      LOCALE_EN
    ).toLowerCase();
    return language.startsWith("zh") ? LOCALE_ZH : LOCALE_EN;
  }

  async function resolveLocale() {
    const fallback = resolveLocaleFromBrowser();
    try {
      const result = await chrome.storage.local.get([LOCALE_STORAGE_KEY]);
      const saved = result?.[LOCALE_STORAGE_KEY];
      if (saved === LOCALE_ZH || saved === LOCALE_EN) {
        return saved;
      }
    } catch {
    }
    return fallback;
  }

  async function resolveQuickFavoriteShortcutPreference() {
    try {
      const result = await chrome.storage.local.get([QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]);
      return resolveStoredShortcut(result?.[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY] ?? null);
    } catch {
      return resolveStoredShortcut(null);
    }
  }

  let activeLocale = LOCALE_EN;
  let articleMode = false;
  let currentArticle = null;
  let currentArticleFavorite = null;
  let articleSaved = false;

  function t(key, vars = {}) {
    const table = I18N[key];
    const template =
      table?.[activeLocale] || table?.[LOCALE_EN] || key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
  }

  function syncFloatingButtonLabel() {
    if (!floatingBtn) return;
    const shortcutLabel = formatShortcutLabel(activeQuickFavoriteShortcut);
    const saved = floatingBtn.dataset.favoriteState === "saved";
    const actionLabel = articleMode
      ? saved
        ? t("status.favoriteArticleButtonSaved")
        : t("status.favoriteArticleButton")
      : saved
        ? t("status.favoriteButtonSaved")
        : t("status.favoriteButton");
    const label = `${actionLabel} (${shortcutLabel})`;
    floatingBtn.title = label;
    floatingBtn.setAttribute("aria-label", label);
    syncNativeFavoriteStatus();
  }

  let root = null;
  let panelBackdrop = null;
  let panel = null;
  let floatingBtn = null;
  let nativeFavoriteStatus = null;
  let nativeFavoriteStatusObserver = null;
  let nativeFavoriteMountTimer = 0;
  let modal = null;
  let toastRoot = null;
  let folderListEl = null;
  let folderSearchInput = null;
  let customTagsInput = null;
  let customTagsSection = null;
  let customTagSuggestionsEl = null;
  let saveBtn = null;
  let closeBtn = null;
  let openCreateFolderBtn = null;
  let selectAllFoldersBtn = null;
  let clearFolderSelectionBtn = null;
  let selectedCountEl = null;
  let currentFavoriteFoldersEl = null;
  let videoTitleEl = null;
  let videoMetaEl = null;
  let videoCoverEl = null;
  let saveFeedbackEl = null;
  let saveFeedbackTitleEl = null;
  let saveFeedbackMessageEl = null;
  let folderNameCountEl = null;
  let folderDescCountEl = null;
  let folderModalNameInput = null;
  let folderModalDescInput = null;
  let folderModalGroupInput = null;
  let folderModalSaveBtn = null;
  let folderModalCancelBtn = null;
  let folderModalCloseBtn = null;
  let fullscreenObserver = null;
  let fullscreenPollTimer = null;
  let playbackOverlay = null;
  let playbackOverlayTitleEl = null;
  let playbackOverlayProgressEl = null;
  let playbackPrevBtn = null;
  let playbackNextBtn = null;
  let playbackListToggleBtn = null;
  let playbackCollapseBtn = null;
  let playbackListEl = null;
  let playbackOverlayTimer = null;
  let playbackOverlayBusy = false;
  let lastPlaybackOverlayUrl = location.href;
  let playbackListOpen = true;
  let playbackCollapsed = false;
  let extensionContextInvalidated = false;
  let extensionReloadToastShown = false;
  let collectorCloseTimer = 0;
  let saveFeedbackTimer = 0;
  let floatingFavoriteRequestId = 0;
  let lastFloatingFavoriteBvid = "";

  let suppressButtonClick = false;
  let allFolders = [];
  let allCustomTags = [];
  const collapsedFolderGroups = new Set();
  let selectedFolderIds = new Set();
  let currentVideo = null;
  let currentVideoLocalFolders = [];
  let currentArticleLocalFolders = [];
  let activeThemePreference = THEME_AUTO;
  let activeQuickFavoriteShortcut = resolveStoredShortcut(null);
  let bidirectionalSettingsCache = {
    value: null,
    expiresAt: 0
  };
  let nativeFavoritePullTimer = 0;
  let pendingNativeFavoriteBvid = "";
  let pendingNativeFavoriteFolderId = 0;
  let pendingForceFolderReconcile = false;
  let nativeFavoriteActionListenerBound = false;
  let commentScanTimer = 0;
  let savedCommentKeys = new Set();
  const commentFavoriteButtons = new Set();

  const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function attrOf(selector, attr) {
    const value = document.querySelector(selector)?.getAttribute(attr);
    return value ? value.trim() : "";
  }

  function textOf(selector) {
    const value = document.querySelector(selector)?.textContent;
    return value ? value.trim() : "";
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function setAttributes(el, attrs) {
    if (!attrs) return;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      el.setAttribute(key, String(value));
    }
  }

  function appendChildren(parent, children) {
    if (!children?.length) return;
    for (const child of children) {
      if (child === null || child === undefined) continue;
      parent.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child
      );
    }
  }

  function createEl(tag, options = {}, children = []) {
    const el = document.createElement(tag);
    if (options.id) el.id = options.id;
    if (options.className) el.className = options.className;
    if (options.text !== undefined) el.textContent = options.text;
    setAttributes(el, options.attrs);
    appendChildren(el, children);
    return el;
  }

  function createSvgEl(tag, attrs = {}, children = []) {
    const el = document.createElementNS(SVG_NS, tag);
    setAttributes(el, attrs);
    appendChildren(el, children);
    return el;
  }

  function createBrandMarkSvg() {
    return createSvgEl(
      "svg",
      { viewBox: "0 0 128 128", fill: "none" },
      [
        createSvgEl("rect", {
          x: "6", y: "6", width: "116", height: "116", rx: "30", fill: "#18232D"
        }),
        createSvgEl("rect", {
          x: "23", y: "36", width: "75", height: "46", rx: "10", fill: "#344550"
        }),
        createSvgEl("rect", {
          x: "30", y: "28", width: "75", height: "48", rx: "10", fill: "#F7F9FA"
        }),
        createSvgEl("path", {
          d: "M59 42.5V61.5L75 52L59 42.5Z", fill: "#18232D"
        }),
        createSvgEl("path", {
          d: "M84 20H103V63L93.5 56.5L84 63V20Z", fill: "#F36F98"
        }),
        createSvgEl("rect", {
          x: "22", y: "87", width: "84", height: "10", rx: "5", fill: "#4CCBBB"
        }),
        createSvgEl("rect", {
          x: "31", y: "103", width: "66", height: "5", rx: "2.5", fill: "#F7F9FA"
        })
      ]
    );
  }

  function createFloatingButtonSvg() {
    return createSvgEl(
      "svg",
      { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
      [
        createSvgEl("path", {
          d: "M7 4.75C7 3.78 7.78 3 8.75 3h6.5C16.22 3 17 3.78 17 4.75V21l-5-3.2L7 21V4.75Z",
          stroke: "currentColor",
          "stroke-width": "1.8",
          "stroke-linejoin": "round"
        })
      ]
    );
  }

  function createCheckSvg() {
    return createSvgEl(
      "svg",
      { viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
      [
        createSvgEl("path", {
          d: "M3.5 8.2 6.6 11l5.9-6.2",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        })
      ]
    );
  }

  function ensureAbsoluteUrl(input, fallback = "") {
    const value = (input || "").trim();
    if (!value) return fallback;

    const normalized = value.startsWith("//") ? `https:${value}` : value;
    try {
      const url = new URL(normalized);
      if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
      if (url.protocol === "http:" && /(^|\.)hdslb\.com$/i.test(url.hostname)) {
        url.protocol = "https:";
      }
      return url.toString();
    } catch {
      return fallback;
    }
  }

  function normalizeDescription(input) {
    const noisePatterns = [
      /播放量/i,
      /弹幕量/i,
      /点赞数/i,
      /投币数/i,
      /收藏人数/i,
      /转发人数/i,
      /相关视频/i,
      /弹幕列表/i,
      /\b\d+(?:\.\d+)?万\b/i,
      /\b\d+(?:\.\d+)?亿\b/i
    ];

    const sourceLines = (input || "").replace(/\r\n/g, "\n").split("\n");
    const lines = sourceLines
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !noisePatterns.some((pattern) => pattern.test(line)));

    return lines.join("\n\n").slice(0, 2000);
  }
  function parseTags(raw) {
    return [
      ...new Set(
        (raw || "")
          .split(/[,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ];
  }

  function normalizeLocalContentKey(value) {
    const bvid = normalizeBvidToken(value);
    return bvid || String(value || "").trim().toLowerCase();
  }

  function resolveSpecialMediaFromUrl(rawUrl) {
    const bangumiSeasonId = extractBangumiSeasonId(rawUrl);
    if (bangumiSeasonId) {
      return {
        mediaKind: "bangumi",
        mediaId: bangumiSeasonId,
        contentKey: `bilishelf:bangumi:${bangumiSeasonId}`
      };
    }
    const audioId = extractAudioId(rawUrl);
    if (audioId) {
      return {
        mediaKind: "audio",
        mediaId: audioId,
        contentKey: `bilishelf:audio:${audioId}`
      };
    }
    return null;
  }

  function pickBasePayload() {
    const canonical = attrOf('link[rel="canonical"]', "href") || location.href;
    const specialMedia =
      resolveSpecialMediaFromUrl(location.href) || resolveSpecialMediaFromUrl(canonical);
    const canonicalBvid = normalizeBvidToken(
      canonical.match(/\/video\/(BV[0-9A-Za-z]+)/i)?.[1] || ""
    );
    const pathnameBvid = normalizeBvidToken(
      location.pathname.match(/\/(BV[0-9A-Za-z]+)/i)?.[1] || ""
    );
    const queryBvid = normalizeBvidToken(
      new URLSearchParams(location.search).get("bvid")
    );
    const dynamicBvid = normalizeBvidToken(
      [...document.querySelectorAll("a[href], script")]
        .map((element) => element.getAttribute?.("href") || element.textContent || "")
        .find((href) => /\/video\/BV[0-9A-Za-z]+|BV[0-9A-Za-z]{10}/i.test(href)) ||
        document.documentElement?.innerHTML.match(/BV[0-9A-Za-z]{10}/i)?.[0] ||
        ""
    );
    const detectedBvid = canonicalBvid || pathnameBvid || queryBvid || dynamicBvid;
    const detectedAid = extractAidFromAny(location.href) ||
      extractAidFromAny(canonical) ||
      extractAidFromAny(new URLSearchParams(location.search).get("oid"));
    const canonicalUrl = ensureAbsoluteUrl(canonical, location.href);
    const contentKey = specialMedia?.contentKey || detectedBvid;
    const mediaKind = specialMedia?.mediaKind || "video";
    const mediaId = specialMedia?.mediaId || detectedBvid || (detectedAid ? `av${detectedAid}` : "");

    const uploaderHref =
      attrOf(".up-name", "href") ||
      attrOf(".up-name--text", "href") ||
      attrOf('a[href*="space.bilibili.com"]', "href");
    const normalizedUploaderHref = uploaderHref
      ? ensureAbsoluteUrl(
          uploaderHref.startsWith("//") ? `https:${uploaderHref}` : uploaderHref,
          ""
        )
      : "";

    return {
      bvid: contentKey,
      aid: specialMedia ? null : detectedAid || null,
      mediaKind,
      mediaId,
      contentKey,
      bvidUrl: specialMedia
        ? ensureAbsoluteUrl(location.href, canonicalUrl)
        : detectedBvid
        ? `https://www.bilibili.com/video/${detectedBvid}/`
        : canonicalUrl,
      title:
        attrOf('meta[property="og:title"]', "content") ||
        document.title.replace(/_bilibili$/i, "").trim(),
      uploader: textOf(".up-name") || textOf(".up-name--text") || "",
      uploaderSpaceUrl: normalizedUploaderHref,
      coverUrl:
        attrOf('meta[property="og:image"]', "content") ||
        attrOf('meta[itemprop="image"]', "content") ||
        ""
    };
  }

  function pickDescriptionFromDom() {
    const selectors = [
      "#v_desc .desc-info-text",
      ".desc-info-text",
      ".desc-info .desc",
      ".video-desc-container .basic-desc-info",
      ".basic-desc-info",
      ".video-desc-container"
    ];

    for (const selector of selectors) {
      const text = document.querySelector(selector)?.textContent?.trim();
      if (text) return text;
    }
    return "";
  }

  function pickDescriptionFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const raw = script.textContent?.trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.["@graph"])
            ? parsed["@graph"]
            : [parsed];

        for (const item of entries) {
          const type = String(item?.["@type"] || "").toLowerCase();
          if (type.includes("video") && typeof item?.description === "string") {
            const desc = item.description.trim();
            if (desc) return desc;
          }
        }
      } catch {
      }
    }
    return "";
  }

  function pickSafeDescription(detail) {
    const apiDesc = normalizeDescription(
      typeof detail?.desc === "string"
        ? detail.desc
        : typeof detail?.evaluate === "string"
          ? detail.evaluate
          : typeof detail?.description === "string"
            ? detail.description
            : typeof detail?.intro === "string"
              ? detail.intro
              : ""
    );
    if (apiDesc) return apiDesc;

    const jsonDesc = normalizeDescription(pickDescriptionFromJsonLd());
    if (jsonDesc) return jsonDesc;

    const domDesc = normalizeDescription(pickDescriptionFromDom());
    if (domDesc) return domDesc;

    return "";
  }

  async function fetchVideoDetail(bvid, aid = 0) {
    const query = bvid
      ? `bvid=${encodeURIComponent(bvid)}`
      : `aid=${encodeURIComponent(String(aid))}`;
    const url = `${BILI_VIEW_API}?${query}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Bilibili API error ${response.status}`);
    }

    const body = await response.json();
    if (body?.code !== 0 || !body?.data) {
      throw new Error(body?.message || "Invalid video API response");
    }

    const data = body.data;
    if (data?.View?.data) return data.View.data;
    if (data?.View) return data.View;
    return data;
  }

  async function fetchVideoTags(bvid) {
    const url = `${BILI_TAG_API}?bvid=${encodeURIComponent(bvid)}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Bilibili tags API error ${response.status}`);
    }

    const body = await response.json();
    if (body?.code !== 0 || !Array.isArray(body?.data)) {
      return [];
    }

    return body.data
      .map((item) =>
        typeof item?.tag_name === "string" ? item.tag_name.trim() : ""
      )
      .filter(Boolean);
  }

  async function fetchSpecialApi(url) {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Bilibili API error ${response.status}`);
    }
    const body = await response.json();
    if (body?.code !== undefined && body.code !== 0 && body.code !== "0") {
      throw new Error(body?.message || "Invalid Bilibili API response");
    }
    return body?.data ?? body?.result ?? body;
  }

  async function fetchBangumiDetail(seasonId) {
    return fetchSpecialApi(
      `${BILI_BANGUMI_SEASON_API}?season_id=${encodeURIComponent(
        seasonId.replace(/^ss/i, "")
      )}`
    );
  }

  async function fetchAudioDetail(audioId) {
    const sid = audioId.replace(/^au/i, "");
    let lastError = null;
    for (const endpoint of BILI_AUDIO_INFO_APIS) {
      try {
        return await fetchSpecialApi(`${endpoint}?sid=${encodeURIComponent(sid)}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Unable to load audio metadata");
  }

  function firstNonEmptyText(...values) {
    for (const value of values) {
      const text = typeof value === "string" ? value.trim() : "";
      if (text) return text;
    }
    return "";
  }

  function firstFiniteNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }
    return null;
  }

  function pickSpecialMetadata(detail, mediaKind) {
    const nested = mediaKind === "bangumi"
      ? [detail?.season, detail?.series, detail]
      : [detail?.song, detail?.music, detail?.data, detail];
    const title = firstNonEmptyText(
      ...nested.flatMap((item) => [item?.season_title, item?.song_title, item?.title, item?.name])
    );
    const coverUrl = firstNonEmptyText(
      ...nested.flatMap((item) => [item?.cover, item?.cover_url, item?.pic, item?.image, item?.album?.cover])
    );
    const uploader = firstNonEmptyText(
      ...nested.flatMap((item) => [
        item?.owner?.name,
        item?.up_info?.uname,
        item?.upper?.name,
        item?.artist?.name,
        item?.artist?.uname,
        item?.artist,
        item?.author,
        item?.uname
      ])
    );
    const uploaderSpaceUrl = firstNonEmptyText(
      ...nested.flatMap((item) => [
        item?.owner?.mid ? `https://space.bilibili.com/${item.owner.mid}` : "",
        item?.up_info?.mid ? `https://space.bilibili.com/${item.up_info.mid}` : "",
        item?.artist?.mid ? `https://space.bilibili.com/${item.artist.mid}` : ""
      ])
    );
    const publishAt = firstFiniteNumber(
      ...nested.flatMap((item) => [item?.pubdate, item?.pubtime, item?.ctime, item?.created_at])
    );
    return { title, coverUrl, uploader, uploaderSpaceUrl, publishAt };
  }

  function mergeSystemTags(apiTags, detail) {
    const merged = [];

    for (const name of apiTags || []) {
      const value = String(name || "").trim();
      if (value && !merged.includes(value)) merged.push(value);
    }

    const typeName = typeof detail?.tname === "string" ? detail.tname.trim() : "";
    if (typeName && !merged.includes(typeName)) merged.push(typeName);

    return merged;
  }

  function requestLocalApi(method, path, body) {
    if (extensionContextInvalidated) {
      return Promise.reject(new Error(t("toast.extensionReloadRequired")));
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (handler) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        handler();
      };
      const timer = window.setTimeout(() => {
        finish(() =>
          reject(new Error(`Local API request timeout (${method} ${path})`))
        );
      }, LOCAL_API_TIMEOUT_MS);

      chrome.runtime.sendMessage(
        {
          type: LOCAL_API_MESSAGE,
          request: {
            method,
            path,
            body
          }
        },
        (response) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            const runtimeMessage = runtimeError.message || "Local API unavailable";
            if (runtimeMessage.toLowerCase().includes("extension context invalidated")) {
              extensionContextInvalidated = true;
              if (!extensionReloadToastShown) {
                extensionReloadToastShown = true;
                showToast(t("toast.extensionReloadRequired"), "err");
              }
              finish(() => reject(new Error(t("toast.extensionReloadRequired"))));
              return;
            }
            finish(() =>
              reject(new Error(runtimeMessage))
            );
            return;
          }

          if (!response) {
            finish(() => reject(new Error("No response from local API")));
            return;
          }

          if (response.ok) {
            finish(() => resolve(response.data));
            return;
          }

          const error = new Error(response.error || t("error.unknown"));
          error.statusCode = response.status || 500;
          finish(() => reject(error));
        }
      );
    });
  }

  async function fetchFolders() {
    const data = await requestLocalApi(
      "GET",
      articleMode ? "/article-folders" : "/folders",
    );
    return data?.items || [];
  }

  async function fetchAllCustomTags() {
    const pageSize = 200;
    let page = 1;
    const tags = [];

    while (page <= 20) {
      const data = await requestLocalApi(
        "GET",
        `/tags?type=custom&page=${page}&pageSize=${pageSize}`,
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const item of items) {
        const name = String(item?.name || "").trim();
        if (name) tags.push(name);
      }
      const pagination = data?.pagination || {};
      const total = Number(pagination.total || items.length);
      const currentPage = Number(pagination.page || page);
      const currentPageSize = Number(pagination.pageSize || pageSize);
      if (items.length === 0 || currentPage * currentPageSize >= total) {
        break;
      }
      page += 1;
    }

    return [...new Set(tags)];
  }

  function folderNamesFromIds(folderIds = []) {
    const idSet = new Set(folderIds.map((id) => Number(id)));
    return allFolders
      .filter((folder) => idSet.has(folder.id))
      .map((folder) => folder.name)
      .filter(Boolean);
  }

  function currentVideoLocalFolderIds() {
    return currentVideoLocalFolders
      .map((folder) => Number(folder?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  function setFloatingFavoriteState(saved) {
    if (!floatingBtn) return;
    floatingBtn.dataset.favoriteState = saved ? "saved" : "idle";
    floatingBtn.setAttribute("aria-pressed", saved ? "true" : "false");
    syncFloatingButtonLabel();
    mountNativeFavoriteStatus();
  }

  function findNativeFavoriteAnchor() {
    const selectors = [
      ".video-toolbar-left .video-fav",
      ".video-toolbar-left [class*='fav']",
      ".video-toolbar .video-fav",
      "button[aria-label*='收藏']",
      "button[title*='收藏']",
      "[role='button'][aria-label*='收藏']"
    ];
    for (const selector of selectors) {
      for (const candidate of document.querySelectorAll(selector)) {
        if (
          candidate !== nativeFavoriteStatus &&
          !candidate.closest?.("[data-bilishelf-native-status='true']") &&
          (!root || !root.contains(candidate))
        ) {
          return candidate;
        }
      }
    }
    return null;
  }

  function findNativeToolbarActionItem(element) {
    if (!(element instanceof Element)) return null;
    return (
      element.closest(
        ".video-toolbar-left-item, .video-toolbar-item, [class*='video-toolbar-left-item'], [class*='video-toolbar-item']"
      ) || element
    );
  }

  function findNativeToolbarContainer(element) {
    const actionItem = findNativeToolbarActionItem(element);
    return (
      actionItem?.closest?.(
        ".video-toolbar-left, .video-toolbar, [class*='video-toolbar-left']:not([class*='item']), [class*='video-toolbar']:not([class*='item'])"
      ) || actionItem?.parentElement || null
    );
  }

  function findNativeForwardActionItem(favoriteAnchor) {
    const favoriteItem = findNativeToolbarActionItem(favoriteAnchor);
    const toolbar = findNativeToolbarContainer(favoriteAnchor);
    if (!toolbar) return null;

    const selectors = [
      ".video-toolbar-left-item-share",
      ".video-toolbar-item-share",
      "[class*='video-toolbar-left-item-share']",
      "[class*='video-toolbar-item-share']",
      "button[aria-label*='转发']",
      "button[title*='转发']",
      "[role='button'][aria-label*='转发']",
      "[class*='share']"
    ];
    for (const selector of selectors) {
      for (const candidate of toolbar.querySelectorAll(selector)) {
        if (
          candidate === favoriteAnchor ||
          candidate === nativeFavoriteStatus ||
          candidate.closest?.("[data-bilishelf-native-status='true']") ||
          favoriteItem === candidate ||
          favoriteItem?.contains?.(candidate)
        ) {
          continue;
        }
        return findNativeToolbarActionItem(candidate);
      }
    }
    return null;
  }

  function syncNativeFavoriteStatus() {
    if (!nativeFavoriteStatus) return;
    const state = floatingBtn?.dataset.favoriteState || "loading";
    nativeFavoriteStatus.dataset.state = state;
    nativeFavoriteStatus.textContent =
      state === "loading"
        ? t("status.localFavoriteNearNativeLoading")
        : state === "saved"
          ? t("status.localFavoriteNearNative")
          : t("status.localFavoriteNearNativeIdle");
    nativeFavoriteStatus.setAttribute("aria-label", nativeFavoriteStatus.textContent);
    nativeFavoriteStatus.title = nativeFavoriteStatus.textContent;
    nativeFavoriteStatus.style.color = state === "saved"
      ? "#fb7299"
      : "var(--text2, #61666d)";
    nativeFavoriteStatus.style.borderColor = state === "saved"
      ? "rgba(251,114,153,.55)"
      : "rgba(128,128,128,.35)";
    nativeFavoriteStatus.style.background = state === "saved"
      ? "rgba(251,114,153,.1)"
      : "var(--bg1, rgba(255,255,255,.72))";
  }

  function placeNativeFavoriteStatus(anchor) {
    if (!nativeFavoriteStatus || !anchor?.isConnected) return;
    const anchorItem = findNativeToolbarActionItem(anchor);
    const toolbar = findNativeToolbarContainer(anchor);
    const forwardItem = findNativeForwardActionItem(anchor);
    const targetItem = forwardItem || anchorItem;
    if (!targetItem) return;

    if (toolbar) {
      if (getComputedStyle(toolbar).position === "static") {
        toolbar.style.position = "relative";
      }
      if (nativeFavoriteStatus.parentNode !== toolbar) {
        toolbar.appendChild(nativeFavoriteStatus);
      }
      const toolbarRect = toolbar.getBoundingClientRect();
      const targetRect = targetItem.getBoundingClientRect();
      nativeFavoriteStatus.style.position = "absolute";
      nativeFavoriteStatus.style.left = `${Math.max(0, targetRect.right - toolbarRect.left + 10)}px`;
      nativeFavoriteStatus.style.top = `${Math.max(
        0,
        targetRect.top - toolbarRect.top + (targetRect.height - nativeFavoriteStatus.offsetHeight) / 2
      )}px`;
      return;
    }

    const parent = targetItem.parentNode;
    if (!parent) return;
    nativeFavoriteStatus.style.position = "static";
    if (nativeFavoriteStatus.parentNode !== parent || nativeFavoriteStatus.previousElementSibling !== targetItem) {
      parent.insertBefore(nativeFavoriteStatus, targetItem.nextSibling);
    }
  }

  function mountNativeFavoriteStatus() {
    if (!isCollectorUiUrl(location.href) || articleMode || isSpecialMediaUrl(location.href)) {
      nativeFavoriteStatus?.remove();
      nativeFavoriteStatus = null;
      return;
    }
    const anchor = findNativeFavoriteAnchor();
    if (!anchor) {
      nativeFavoriteStatus?.remove();
      nativeFavoriteStatus = null;
      return;
    }
    if (nativeFavoriteStatus?.isConnected) {
      syncNativeFavoriteStatus();
      placeNativeFavoriteStatus(anchor);
      return;
    }
    nativeFavoriteStatus?.remove();
    nativeFavoriteStatus = createEl("button", {
      className: "bl-native-favorite-status",
      attrs: { type: "button", "data-bilishelf-native-status": "true" }
    });
    nativeFavoriteStatus.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openCollectorModal();
    }, true);
    nativeFavoriteStatus.style.cssText = [
      "display:inline-flex",
      "flex:0 0 auto",
      "align-items:center",
      "justify-content:center",
      "align-self:center",
      "z-index:2",
      "min-height:24px",
      "margin-left:8px",
      "padding:2px 8px",
      "border:1px solid rgba(128,128,128,.3)",
      "border-radius:6px",
      "font:500 12px/1.4 system-ui,sans-serif",
      "letter-spacing:0",
      "white-space:nowrap",
      "box-shadow:0 1px 3px rgba(0,0,0,.08)",
      "cursor:pointer",
      "transition:color .16s ease,border-color .16s ease,background .16s ease"
    ].join(";");
    placeNativeFavoriteStatus(anchor);
    syncNativeFavoriteStatus();
  }

  function scheduleNativeFavoriteStatusMount() {
    if (nativeFavoriteMountTimer) window.clearTimeout(nativeFavoriteMountTimer);
    nativeFavoriteMountTimer = window.setTimeout(() => {
      nativeFavoriteMountTimer = 0;
      mountNativeFavoriteStatus();
    }, 80);
  }

  function normalizeArticleText(value, max = 12000) {
    return String(value || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max);
  }

  function pickArticlePayload() {
    const opusId = normalizeOpusId(extractOpusId(location.href));
    if (!opusId) return null;
    const canonical = ensureAbsoluteUrl(
      attrOf('link[rel="canonical"]', "href"),
      /^\/read\/cv/i.test(location.pathname)
        ? `https://www.bilibili.com/read/cv${opusId}`
        : `https://www.bilibili.com/opus/${opusId}`
    );
    const contentSelectors = [
      ".opus-module-content",
      ".opus-module-content-inner",
      "article",
      "[class*='opus-module']",
      "main"
    ];
    let content = "";
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      const value = normalizeArticleText(element?.innerText || element?.textContent || "");
      if (value.length > content.length) content = value;
    }
    const title = normalizeArticleText(
      attrOf('meta[property="og:title"]', "content") ||
        textOf("h1") ||
        document.title.replace(/_bilibili$/i, "").trim(),
      300
    );
    const summary = normalizeArticleText(
      attrOf('meta[property="og:description"]', "content") || content,
      1200
    );
    const authorLink =
      document.querySelector("a[href*='space.bilibili.com']") ||
      document.querySelector("a[href*='space.bilibili.com']");
    const authorSpaceUrl = ensureAbsoluteUrl(authorLink?.getAttribute("href") || "", "");
    const authorMid = authorSpaceUrl.match(/space\.bilibili\.com\/(\d+)/)?.[1] || "";
    const authorName = normalizeArticleText(
      authorLink?.textContent ||
        textOf(".opus-author-name") ||
        textOf("[class*='author']"),
      160
    );
    return {
      sourceKey: buildArticleSourceKey(opusId),
      opusId,
      title: title || `Bilibili 专栏 ${opusId}`,
      summary,
      content,
      coverUrl: ensureAbsoluteUrl(
        attrOf('meta[property="og:image"]', "content") ||
          attrOf('meta[itemprop="image"]', "content"),
        ""
      ),
      authorName,
      authorMid,
      authorAvatarUrl: ensureAbsoluteUrl(
        document.querySelector("img[class*='avatar'], img[class*='face']")?.getAttribute("src") || "",
        ""
      ),
      sourceUrl: canonical
    };
  }

  async function loadArticleFavorite() {
    currentArticle = pickArticlePayload();
    currentArticleFavorite = null;
    currentArticleLocalFolders = [];
    if (!currentArticle) {
      setFloatingFavoriteState(false);
      return;
    }
    try {
      const data = await requestLocalApi(
        "GET",
        `/articles/by-key?sourceKey=${encodeURIComponent(currentArticle.sourceKey)}`,
      );
      currentArticleFavorite = data || null;
      currentArticleLocalFolders = Array.isArray(data?.folderIds)
        ? data.folderIds.map((id) => ({ id: Number(id) }))
        : [];
      articleSaved = Boolean(data?.sourceKey);
    } catch {
      articleSaved = false;
    }
    renderVideo(currentArticle);
    setFloatingFavoriteState(articleSaved);
  }

  function currentCollectorFolderIds() {
    const folders = articleMode ? currentArticleLocalFolders : currentVideoLocalFolders;
    return folders
      .map((folder) => Number(folder?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  function syncCurrentFavoriteUi() {
    const saved = currentVideoLocalFolders.length > 0;
    setFloatingFavoriteState(saved);
  }

  async function refreshFloatingFavoriteStateFromPage(force = false) {
    const base = pickBasePayload();
    const contentKey = normalizeLocalContentKey(base?.contentKey || base?.bvid || "");
    if (!contentKey) {
      lastFloatingFavoriteBvid = "";
      setFloatingFavoriteState(false);
      return;
    }
    if (!force && contentKey === lastFloatingFavoriteBvid) return;
    lastFloatingFavoriteBvid = contentKey;
    const requestId = ++floatingFavoriteRequestId;
    floatingBtn?.setAttribute("data-favorite-state", "loading");
    syncFloatingButtonLabel();
    try {
      const folders = await fetchCurrentVideoLocalFoldersByBvid(contentKey);
      if (requestId !== floatingFavoriteRequestId) return;
      if (normalizeLocalContentKey(currentVideo?.bvid || "") === contentKey) {
        currentVideoLocalFolders = folders;
      }
      setFloatingFavoriteState(folders.length > 0);
    } catch {
      if (requestId === floatingFavoriteRequestId) {
        floatingBtn?.setAttribute("data-favorite-state", "idle");
        syncFloatingButtonLabel();
      }
    }
  }

  async function fetchCurrentVideoLocalFoldersByBvid(bvid) {
    const normalizedContentKey = normalizeLocalContentKey(bvid || "");
    if (!normalizedContentKey) return [];
    const result = await requestLocalApi(
      "GET",
      `/videos/by-bvid?bvid=${encodeURIComponent(normalizedContentKey)}`
    );
    return Array.isArray(result?.folders) ? result.folders : [];
  }

  async function refreshCurrentVideoLocalFolders() {
    const contentKey = normalizeLocalContentKey(currentVideo?.contentKey || currentVideo?.bvid || "");
    if (!contentKey) {
      currentVideoLocalFolders = [];
      syncCurrentFavoriteUi();
      return;
    }
    try {
      currentVideoLocalFolders = await fetchCurrentVideoLocalFoldersByBvid(contentKey);
    } catch {
      currentVideoLocalFolders = [];
    }
    lastFloatingFavoriteBvid = contentKey;
    syncCurrentFavoriteUi();
  }

  async function createFolder(payload) {
    return requestLocalApi(
      "POST",
      articleMode ? "/article-folders" : "/folders",
      payload,
    );
  }

  function normalizeBidirectionalSettings(raw) {
    return {
      biliToLocalEnabled: Boolean(raw?.biliToLocalEnabled),
      localToBiliEnabled: Boolean(raw?.localToBiliEnabled),
      updatedAt: Number(raw?.updatedAt || 0)
    };
  }

  async function fetchBidirectionalSettings(force = false) {
    const nowTs = Date.now();
    if (
      !force &&
      bidirectionalSettingsCache.value &&
      bidirectionalSettingsCache.expiresAt > nowTs
    ) {
      return bidirectionalSettingsCache.value;
    }
    try {
      const data = await requestLocalApi("GET", "/sync/bilibili/bidirectional/settings");
      const normalized = normalizeBidirectionalSettings(data);
      bidirectionalSettingsCache = {
        value: normalized,
        expiresAt: nowTs + BIDIRECTIONAL_SETTINGS_CACHE_MS
      };
      return normalized;
    } catch {
      const fallback = normalizeBidirectionalSettings(null);
      bidirectionalSettingsCache = {
        value: fallback,
        expiresAt: nowTs + 6_000
      };
      return fallback;
    }
  }

  function hasFavoriteKeyword(text) {
    return containsFavoriteActionKeyword(text);
  }

  function isLikelyNativeFavoriteActionTarget(target) {
    if (!(target instanceof Element)) return false;
    if (root && root.contains(target)) return false;
    const interactive = target.closest("button,a,[role='button'],div");
    if (!interactive) return false;
    const text = [
      interactive.getAttribute("aria-label"),
      interactive.getAttribute("title"),
      interactive.id,
      interactive.className,
      interactive.textContent
    ]
      .map((value) => String(value || ""))
      .join(" ");
    return hasFavoriteKeyword(text);
  }

  function collectBvidCandidatesFromElement(element, bucket) {
    if (!(element instanceof Element)) return;
    const attrs = ["data-bvid", "data-bv", "data-bv-id", "data-video-bvid", "href"];
    for (const attr of attrs) {
      bucket.push(element.getAttribute(attr));
    }
    if (element instanceof HTMLAnchorElement) {
      bucket.push(element.href);
    }
    const data = element.dataset || {};
    for (const [key, value] of Object.entries(data)) {
      if (!key.toLowerCase().includes("bv")) continue;
      bucket.push(value);
    }
  }

  function extractBvidFromFavoriteActionTarget(target) {
    if (!(target instanceof Element)) return "";
    const candidates = [];
    let current = target;
    for (let depth = 0; depth < 7 && current; depth += 1) {
      collectBvidCandidatesFromElement(current, candidates);
      const nearbyAnchor = current.querySelector?.('a[href*="/video/"]');
      if (nearbyAnchor) {
        collectBvidCandidatesFromElement(nearbyAnchor, candidates);
      }
      current = current.parentElement;
    }
    const nearestAnchor = target.closest?.('a[href*="/video/"]');
    if (nearestAnchor) {
      collectBvidCandidatesFromElement(nearestAnchor, candidates);
    }
    for (const candidate of candidates) {
      const bvid = extractBvidFromAny(candidate);
      if (bvid) return bvid;
    }
    return "";
  }

  async function startFavoriteFolderReconcileFromBiliAction(remoteFolderId) {
    if (!Number.isFinite(remoteFolderId) || remoteFolderId <= 0) return;
    try {
      await requestLocalApi("POST", "/sync/bilibili/history-model/start", {
        selectedRemoteFolderIds: [Math.trunc(remoteFolderId)]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error.unknown");
      const lower = String(message).toLowerCase();
      if (lower.includes("already running")) return;
      if (lower.includes("favorites sync is running")) return;
      throw error;
    }
  }

  async function pullCurrentVideoFromBiliAction(
    preferredBvid = "",
    preferredFolderId = 0,
    forceFolderReconcile = false
  ) {
    const settings = await fetchBidirectionalSettings();
    if (!settings.biliToLocalEnabled) return;

    const base = pickBasePayload();
    const bvid = normalizeBvidToken(preferredBvid || currentVideo?.bvid || base.bvid || "");
    const aid = Number(currentVideo?.aid || 0);
    if (!bvid && !(Number.isFinite(aid) && aid > 0)) {
      if (Number.isFinite(preferredFolderId) && preferredFolderId > 0) {
        try {
          await startFavoriteFolderReconcileFromBiliAction(preferredFolderId);
        } catch (error) {
          const message = error instanceof Error ? error.message : t("error.unknown");
          showToast(message, "err");
        }
      }
      return;
    }

    try {
      const result = await requestLocalApi("POST", "/sync/bilibili/video/pull", {
        bvid: bvid || undefined,
        aid: Number.isFinite(aid) && aid > 0 ? aid : undefined
      });
      if (
        Number(result?.folderLinksAdded || 0) > 0 ||
        Number(result?.folderLinksRemoved || 0) > 0
      ) {
        showToast(t("toast.biliPullSynced"), "info");
      }
      await refreshFloatingFavoriteStateFromPage(true);
      if (forceFolderReconcile && Number.isFinite(preferredFolderId) && preferredFolderId > 0) {
        await startFavoriteFolderReconcileFromBiliAction(preferredFolderId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error.unknown");
      if (String(message).toLowerCase().includes("disabled")) return;
      if (String(message).toLowerCase().includes("favorites sync is running")) return;
      showToast(message, "err");
    }
  }

  function schedulePullCurrentVideoFromBiliAction(
    candidateBvid = "",
    candidateFolderId = 0,
    forceFolderReconcile = false
  ) {
    const normalizedCandidate = normalizeBvidToken(candidateBvid);
    if (normalizedCandidate) {
      pendingNativeFavoriteBvid = normalizedCandidate;
    }
    const normalizedFolderId = Number.isFinite(candidateFolderId)
      ? Math.trunc(candidateFolderId)
      : 0;
    if (normalizedFolderId > 0) {
      pendingNativeFavoriteFolderId = normalizedFolderId;
    }
    if (forceFolderReconcile) {
      pendingForceFolderReconcile = true;
    }
    if (nativeFavoritePullTimer) {
      window.clearTimeout(nativeFavoritePullTimer);
      nativeFavoritePullTimer = 0;
    }
    nativeFavoritePullTimer = window.setTimeout(() => {
      nativeFavoritePullTimer = 0;
      const bvid = pendingNativeFavoriteBvid;
      const folderId = pendingNativeFavoriteFolderId;
      const forceReconcile = pendingForceFolderReconcile;
      pendingNativeFavoriteBvid = "";
      pendingNativeFavoriteFolderId = 0;
      pendingForceFolderReconcile = false;
      void pullCurrentVideoFromBiliAction(bvid, folderId, forceReconcile);
    }, BILI_SYNC_PULL_DEBOUNCE_MS);
  }

  function bindNativeFavoriteActionListener() {
    if (isDynamicVideoUrl(location.href) || isSpecialMediaUrl(location.href)) return;
    if (nativeFavoriteActionListenerBound) return;
    nativeFavoriteActionListenerBound = true;
    document.addEventListener(
      "click",
      (event) => {
        if (!isLikelyNativeFavoriteActionTarget(event.target)) return;
        const candidateBvid = extractBvidFromFavoriteActionTarget(event.target);
        const candidateFolderId = extractFavoriteFolderIdFromUrl(location.href);
        const forceFolderReconcile = candidateFolderId > 0;
        void fetchBidirectionalSettings().then((settings) => {
          if (!settings.biliToLocalEnabled) return;
          schedulePullCurrentVideoFromBiliAction(
            candidateBvid,
            candidateFolderId,
            forceFolderReconcile
          );
        });
      },
      true
    );
  }

  function showToast(message, type = "ok") {
    if (!toastRoot || !message) return;
    const toastType =
      type === "err" ? "error" : type === "info" ? "info" : "success";
    const node = document.createElement("div");
    node.className = `Vue-Toastification__toast Vue-Toastification__toast--${toastType}`;
    node.setAttribute("role", toastType === "error" ? "alert" : "status");

    const icon = document.createElement("span");
    icon.className = "Vue-Toastification__icon";
    icon.textContent = toastType === "error" ? "!" : toastType === "info" ? "i" : "✓";

    const body = document.createElement("div");
    body.className = "Vue-Toastification__toast-body";
    body.textContent = message;

    node.appendChild(icon);
    node.appendChild(body);
    toastRoot.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 220);
    }, 3200);
  }

  function setStatus(message, type = "ok") {
    if (type === "ok" || type === "err") {
      showToast(message, type);
    }
    if (type === "err") {
      console.error("[BiliShelf extension]", message);
    } else {
      console.info("[BiliShelf extension]", message);
    }
  }

  function renderVideo(video) {
    if (!videoTitleEl || !videoMetaEl || !videoCoverEl) return;

    if (!video) {
      videoTitleEl.textContent = t("status.noVideoTitle");
      videoMetaEl.textContent = t("status.noVideoDesc");
      videoCoverEl.src = DEFAULT_COVER;
      return;
    }

    if (articleMode) {
      videoTitleEl.textContent = video.title || t("status.untitled");
      videoMetaEl.textContent = `${video.authorName || t("status.unknownUploader")} - opus:${video.opusId || "-"}`;
    } else {
      videoTitleEl.textContent = video.title || t("status.untitled");
      videoMetaEl.textContent = `${video.uploader || t("status.unknownUploader")} - ${video.bvid || "-"}`;
    }
    videoCoverEl.src = ensureAbsoluteUrl(video.coverUrl, DEFAULT_COVER);
  }

  function renderSelectedCount() {
    if (!selectedCountEl) return;
    selectedCountEl.textContent = t("status.selectedCount", {
      count: selectedFolderIds.size
    });
  }

  function renderCurrentFavoriteFolders() {
    if (!currentFavoriteFoldersEl) return;
    const ids = new Set(currentCollectorFolderIds());
    const names = allFolders
      .filter((folder) => ids.has(Number(folder.id)))
      .map((folder) => String(folder.name || "").trim())
      .filter(Boolean);
    currentFavoriteFoldersEl.textContent = names.length > 0
      ? `${activeLocale === LOCALE_ZH ? "已收藏到：" : "Saved in: "} ${names.join("、")}`
      : activeLocale === LOCALE_ZH
        ? "当前内容尚未收藏到 BiliShelf"
        : "This content is not saved in BiliShelf";
    currentFavoriteFoldersEl.dataset.saved = names.length > 0 ? "true" : "false";
  }

  function renderCustomTagSuggestions() {
    if (!customTagSuggestionsEl) return;
    customTagSuggestionsEl.replaceChildren();

    const suggestions = findMatchingCustomTagSuggestions(
      allCustomTags,
      customTagsInput?.value || "",
      8,
    );

    customTagSuggestionsEl.classList.toggle("bl-hidden", suggestions.length === 0);
    if (suggestions.length === 0) {
      return;
    }

    for (const suggestion of suggestions) {
      const chip = createEl("button", {
        className: "bl-tag-suggestion",
        attrs: {
          type: "button",
          "data-tag-suggestion": suggestion,
        },
        text: suggestion,
      });
      chip.addEventListener("click", () => {
        if (!customTagsInput) return;
        customTagsInput.value = appendSuggestedCustomTag(
          customTagsInput.value || "",
          suggestion,
        );
        renderCustomTagSuggestions();
        customTagsInput.focus();
      });
      customTagSuggestionsEl.appendChild(chip);
    }
  }

  function renderFolders(keyword = "") {
    if (!folderListEl) return;
    const lower = keyword.trim().toLowerCase();
    const visible = allFolders.filter((folder) =>
      folder.name.toLowerCase().includes(lower)
    );
    const grouped = new Map();
    for (const folder of visible) {
      const key = String(folder.groupName || "").trim();
      const bucket = grouped.get(key) || [];
      bucket.push(folder);
      grouped.set(key, bucket);
    }
    const currentFolderIds = new Set(currentCollectorFolderIds());
    const groupedVisible = [...grouped.entries()].sort(([left, leftFolders], [right, rightFolders]) => {
      if (!left && right) return 1;
      if (left && !right) return -1;
      const leftHasCurrent = leftFolders.some((folder) => currentFolderIds.has(Number(folder.id)));
      const rightHasCurrent = rightFolders.some((folder) => currentFolderIds.has(Number(folder.id)));
      if (leftHasCurrent !== rightHasCurrent) return leftHasCurrent ? -1 : 1;
      return left.localeCompare(right, activeLocale);
    });

    folderListEl.replaceChildren();
    if (visible.length === 0) {
      folderListEl.appendChild(
        createEl("div", { className: "bl-empty", text: t("status.noFolders") })
      );
      renderSelectedCount();
      renderCurrentFavoriteFolders();
      return;
    }

    for (const [groupKey, folders] of groupedVisible) {
      const collapsed = collapsedFolderGroups.has(groupKey);
      const groupHeader = createEl("div", { className: "bl-folder-group" });
      const groupLabel = createEl("span", {
        text: groupKey || (activeLocale === LOCALE_ZH ? "未分组" : "Ungrouped")
      });
      const groupToggle = createEl("button", {
        className: "bl-folder-group-toggle",
        attrs: {
          type: "button",
          "aria-expanded": collapsed ? "false" : "true",
          "aria-label": collapsed
            ? t("status.expandFolderGroup")
            : t("status.collapseFolderGroup")
        },
        text: collapsed ? "▸" : "▾"
      });
      groupToggle.addEventListener("click", () => {
        if (collapsed) collapsedFolderGroups.delete(groupKey);
        else collapsedFolderGroups.add(groupKey);
        renderFolders(keyword);
      });
      groupHeader.append(groupLabel, groupToggle);
      folderListEl.appendChild(groupHeader);
      if (collapsed) continue;

      folders.sort((left, right) => {
        const leftCurrent = currentFolderIds.has(Number(left.id));
        const rightCurrent = currentFolderIds.has(Number(right.id));
        if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;
        return String(left.name || "").localeCompare(String(right.name || ""), activeLocale);
      });
      for (const folder of folders) {
        const node = createEl("label", {
          className: currentFolderIds.has(Number(folder.id))
            ? "bl-folder-item is-active"
            : "bl-folder-item"
        });
      const checkbox = createEl("input", {
        attrs: {
          type: "checkbox",
          "data-folder-id": String(folder.id)
        }
      });
      checkbox.checked = selectedFolderIds.has(folder.id);
      const content = createEl("div", { className: "bl-folder-content" }, [
        createEl("p", { className: "bl-folder-name", text: folder.name }),
        createEl("p", {
          className: "bl-folder-meta",
          text: t(articleMode ? "status.articlesCount" : "status.videosCount", {
            count: folder.itemCount ?? 0
          })
        })
      ]);
      node.appendChild(checkbox);
      node.appendChild(content);

      checkbox?.addEventListener("change", (event) => {
        const target = event.target;
        const id = Number(target?.dataset?.folderId);
        if (!Number.isInteger(id)) return;
        if (target.checked) selectedFolderIds.add(id);
        else selectedFolderIds.delete(id);
        renderSelectedCount();
      });

        folderListEl.appendChild(node);
      }
    }

    renderSelectedCount();
    renderCurrentFavoriteFolders();
  }

  async function readRememberedCollectorFolderIds() {
    try {
      const result = await chrome.storage.local.get([COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY]);
      return resolveRememberedCollectorFolderIds(
        result?.[COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY] ?? [],
        allFolders,
      );
    } catch {
      return [];
    }
  }

  async function openCollectorModal() {
    if (!panel || !panelBackdrop) return;
    if (collectorCloseTimer) {
      window.clearTimeout(collectorCloseTimer);
      collectorCloseTimer = 0;
    }
    panel.classList.remove("is-closing");
    panelBackdrop.classList.remove("is-closing");
    panelBackdrop.classList.remove("bl-hidden");
    panel.classList.remove("bl-hidden");
    panel.setAttribute("aria-hidden", "false");
    floatingBtn?.setAttribute("aria-expanded", "true");
    clearSaveFeedback();
    if (folderSearchInput) {
      folderSearchInput.value = "";
    }
    if (customTagsInput) {
      customTagsInput.value = "";
    }
    customTagsSection?.classList.toggle("bl-hidden", articleMode);
    await refreshCollectorData();
    const rememberedFolderIds = articleMode ? [] : await readRememberedCollectorFolderIds();
    selectedFolderIds = new Set([
      ...currentCollectorFolderIds(),
      ...rememberedFolderIds,
    ]);
    renderFolders("");
    renderCustomTagSuggestions();
    folderSearchInput?.focus();
  }

  function closeCollectorModal() {
    if (!panel || !panelBackdrop) return;
    if (panel.classList.contains("bl-hidden") || panel.classList.contains("is-closing")) {
      return;
    }
    panel.classList.add("is-closing");
    panelBackdrop.classList.add("is-closing");
    panel.setAttribute("aria-hidden", "true");
    floatingBtn?.setAttribute("aria-expanded", "false");
    collectorCloseTimer = window.setTimeout(() => {
      panel?.classList.add("bl-hidden");
      panelBackdrop?.classList.add("bl-hidden");
      panel?.classList.remove("is-closing");
      panelBackdrop?.classList.remove("is-closing");
      collectorCloseTimer = 0;
    }, 190);
    closeCreateFolderModal();
  }

  function hidePlaybackOverlay() {
    if (!playbackOverlay) return;
    playbackOverlay.classList.add("bl-hidden");
  }

  function resolvePlaybackCursor() {
    const base = pickBasePayload();
    return {
      bvid: normalizeBvidToken(
        extractBvidFromAny(location.href) || base.bvid || currentVideo?.bvid || ""
      )
    };
  }

  function resolvePlaybackItemUrl(item) {
    const directUrl = ensureAbsoluteUrl(item?.url, "");
    if (directUrl) return directUrl;

    const bvid = normalizeBvidToken(item?.bvid || "");
    return bvid ? `https://www.bilibili.com/video/${bvid}/` : "";
  }

  async function navigateToPlaybackItem(item) {
    const url = markFolderPlaybackUrl(resolvePlaybackItemUrl(item));
    if (!url) return;
    try {
      await requestLocalApi("PATCH", "/playback/session/current", {
        videoId: Number(item?.videoId) || undefined,
        bvid: normalizeBvidToken(item?.bvid || "") || undefined,
      });
    } catch (error) {
      console.warn("[BiliShelf extension] playback cursor update failed", error);
    }
    window.location.assign(url);
  }

  function syncPlaybackOverlayState() {
    if (!playbackOverlay) return;
    playbackOverlay.dataset.collapsed = playbackCollapsed ? "true" : "false";
    playbackOverlay.dataset.listOpen = playbackListOpen ? "true" : "false";
    if (playbackListEl) {
      playbackListEl.classList.toggle("bl-hidden", playbackCollapsed || !playbackListOpen);
    }
    if (playbackListToggleBtn) {
      playbackListToggleBtn.textContent = playbackListOpen
        ? t("button.hideList")
        : t("button.showList");
      playbackListToggleBtn.setAttribute(
        "aria-pressed",
        playbackListOpen ? "true" : "false"
      );
    }
    if (playbackCollapseBtn) {
      playbackCollapseBtn.textContent = playbackCollapsed
        ? t("button.expand")
        : t("button.collapse");
      playbackCollapseBtn.setAttribute(
        "aria-pressed",
        playbackCollapsed ? "true" : "false"
      );
    }
  }

  function togglePlaybackOverlayCollapsed() {
    playbackCollapsed = !playbackCollapsed;
    syncPlaybackOverlayState();
  }

  function togglePlaybackQueueList() {
    if (playbackCollapsed) {
      playbackCollapsed = false;
    }
    playbackListOpen = !playbackListOpen;
    syncPlaybackOverlayState();
  }

  function renderPlaybackQueueList(queue = [], currentIndex = -1) {
    if (!playbackListEl) return;
    playbackListEl.replaceChildren();

    const normalizedQueue = Array.isArray(queue) ? queue : [];
    if (!normalizedQueue.length) {
      playbackListEl.appendChild(
        createEl("div", {
          className: "bl-playback-empty",
          text: t("playback.queueEmpty")
        })
      );
      return;
    }

    normalizedQueue.forEach((item, index) => {
      const isActive = index === currentIndex;
      const row = createEl(
        "button",
        {
          className: `bl-playback-list-item${isActive ? " is-active" : ""}`,
          attrs: {
            type: "button",
            "data-queue-index": String(index),
            "aria-current": isActive ? "true" : "false"
          }
        },
        [
          createEl("img", {
            className: "bl-playback-thumb",
            attrs: {
              src: ensureAbsoluteUrl(item?.coverUrl, DEFAULT_COVER),
              alt: item?.title || t("status.coverAlt"),
              loading: "lazy"
            }
          }),
          createEl("div", { className: "bl-playback-list-copy" }, [
            createEl("p", {
              className: "bl-playback-list-title",
              text: item?.title || t("status.untitled")
            }),
            createEl("p", {
              className: "bl-playback-list-meta",
              text: isActive
                ? t("playback.current")
                : normalizeBvidToken(item?.bvid || "") || ""
            })
          ]),
          createEl("span", {
            className: "bl-playback-list-index",
            text: String(index + 1)
          })
        ]
      );

      row.disabled = isActive;
      row.addEventListener("click", () => {
        void navigateToPlaybackItem(item);
      });
      playbackListEl.appendChild(row);
    });
  }

  async function refreshPlaybackOverlay() {
    if (playbackOverlayBusy || !playbackOverlay) return;
    playbackOverlayBusy = true;

    try {
      const session = await requestLocalApi("GET", "/playback/session");
      if (!session) {
        hidePlaybackOverlay();
        return;
      }

      const cursor = resolvePlaybackCursor();
      let currentIndex = findPlaybackQueueIndex(session.queue, cursor);
      if (
        currentIndex < 0 &&
        isMarkedFolderPlaybackUrl(location.href) &&
        Number.isInteger(Number(session.currentIndex)) &&
        Number(session.currentIndex) >= 0 &&
        Number(session.currentIndex) < session.queue.length
      ) {
        currentIndex = Number(session.currentIndex);
      }
      if (currentIndex < 0) {
        hidePlaybackOverlay();
        return;
      }

      let activeSession = session;
      if (Number(session.currentIndex) !== currentIndex) {
        activeSession = await requestLocalApi("PATCH", "/playback/session/current", cursor);
      }

      const activeQueue = Array.isArray(activeSession?.queue) ? activeSession.queue : session.queue;
      const currentItem = activeQueue[currentIndex] || null;
      const adjacent = getAdjacentPlaybackItems(activeQueue, currentIndex);

      if (playbackOverlayTitleEl) {
        playbackOverlayTitleEl.textContent =
          currentItem?.title || currentVideo?.title || t("status.untitled");
      }
      if (playbackOverlayProgressEl) {
        playbackOverlayProgressEl.textContent = [
          t("playback.progress", {
            current: currentIndex + 1,
            total: activeQueue.length
          }),
          t("playback.folder", {
            folderId: Number(activeSession?.folderId) || Number(session.folderId) || 0
          })
        ].join(" · ");
      }

      if (playbackPrevBtn) {
        playbackPrevBtn.disabled = adjacent.previous.disabled;
        playbackPrevBtn.onclick = () => {
          void navigateToPlaybackItem(adjacent.previous.item);
        };
      }
      if (playbackNextBtn) {
        playbackNextBtn.disabled = adjacent.next.disabled;
        playbackNextBtn.onclick = () => {
          void navigateToPlaybackItem(adjacent.next.item);
        };
      }
      if (playbackListToggleBtn) {
        playbackListToggleBtn.onclick = togglePlaybackQueueList;
      }
      if (playbackCollapseBtn) {
        playbackCollapseBtn.onclick = togglePlaybackOverlayCollapsed;
      }
      renderPlaybackQueueList(activeQueue, currentIndex);
      syncPlaybackOverlayState();

      playbackOverlay.classList.remove("bl-hidden");
    } catch (error) {
      console.warn("[BiliShelf extension] playback overlay refresh failed", error);
      hidePlaybackOverlay();
    } finally {
      playbackOverlayBusy = false;
    }
  }

  async function refreshCollectorData() {
    if (articleMode) {
      await Promise.all([loadFolders(), loadArticleFavorite()]);
      return;
    }
    await Promise.all([loadVideo(), loadFolders(), loadCustomTags()]);
  }

  function handleQuickFavoriteShortcut(event) {
    if (matchesQuickFavoriteShortcut(event, activeQuickFavoriteShortcut)) {
      if (isEditableTarget(event.target)) return;
      if (!isCollectorUiUrl(location.href) && !articleMode) return;
      event.preventDefault();
      event.stopPropagation();
      void openCollectorModal();
      return;
    }

    if (panel?.classList.contains("bl-hidden")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      if (modal && !modal.classList.contains("bl-hidden")) {
        closeCreateFolderModal();
        return;
      }
      closeCollectorModal();
      return;
    }

    if (event.isComposing) return;

    if (event.key === "Enter") {
      if (modal && !modal.classList.contains("bl-hidden")) return;
      event.preventDefault();
      void saveCollectorItem();
    }

    if (isEditableTarget(event.target)) return;
  }

  function openCreateFolderModal() {
    if (!modal) return;
    modal.classList.remove("bl-hidden");
    folderModalNameInput?.focus();
    syncCreateFolderCounter();
  }

  function closeCreateFolderModal() {
    if (!modal) return;
    modal.classList.add("bl-hidden");
  }

  function syncCreateFolderCounter() {
    if (folderNameCountEl) {
      const length = (folderModalNameInput?.value || "").trim().length;
      folderNameCountEl.textContent = `${length}/20`;
    }

    if (folderDescCountEl) {
      const length = (folderModalDescInput?.value || "").length;
      folderDescCountEl.textContent = `${length}/200`;
    }
  }

  async function loadVideo() {
    setStatus(t("status.readingCurrentPage"), "info");
    const base = pickBasePayload();
    if (!base.contentKey && !base.aid) {
      currentVideo = null;
      currentVideoLocalFolders = [];
      renderVideo(null);
      setStatus(t("toast.detectBvidFail"), "err");
      return;
    }

    let detail = null;
    let apiSystemTags = [];
    if (base.mediaKind === "bangumi") {
      try {
        detail = await fetchBangumiDetail(base.mediaId);
      } catch {
        detail = null;
      }
    } else if (base.mediaKind === "audio") {
      try {
        detail = await fetchAudioDetail(base.mediaId);
      } catch {
        detail = null;
      }
    } else {
      try {
        detail = await fetchVideoDetail(base.bvid, base.aid);
      } catch {
        detail = null;
      }
      try {
        apiSystemTags = await fetchVideoTags(base.bvid);
      } catch {
        apiSystemTags = [];
      }
    }

    const specialMetadata = base.mediaKind === "video"
      ? {}
      : pickSpecialMetadata(detail, base.mediaKind);
    const rawPublishAt = base.mediaKind === "video"
      ? detail?.pubdate
      : specialMetadata.publishAt;
    const publishAt = Number.isFinite(Number(rawPublishAt))
      ? Math.trunc(Number(rawPublishAt) > 1e12 ? Number(rawPublishAt) : Number(rawPublishAt) * 1000)
      : null;

    currentVideo = {
      bvid: (base.contentKey || base.bvid || detail?.bvid || "").trim(),
      aid:
        base.mediaKind === "video" && typeof detail?.aid === "number" && Number.isFinite(detail.aid)
          ? Math.trunc(detail.aid)
          : base.mediaKind === "video" && Number(base.aid) > 0
            ? Number(base.aid)
          : null,
      mediaKind: base.mediaKind,
      mediaId: base.mediaId,
      contentKey: base.contentKey || base.bvid || "",
      bvidUrl: ensureAbsoluteUrl(base.bvidUrl, location.href),
      title: (specialMetadata.title || detail?.title || base.title || "").trim(),
      coverUrl: ensureAbsoluteUrl(
        specialMetadata.coverUrl || detail?.pic || base.coverUrl,
        DEFAULT_COVER
      ),
      uploader:
        (specialMetadata.uploader || detail?.owner?.name || base.uploader || "").trim() ||
        t("status.unknownUploader"),
      uploaderSpaceUrl:
        (base.mediaKind === "video" && typeof detail?.owner?.mid === "number" && Number.isFinite(detail.owner.mid)
          ? `https://space.bilibili.com/${Math.trunc(detail.owner.mid)}`
          : specialMetadata.uploaderSpaceUrl || base.uploaderSpaceUrl || ""),
      description: pickSafeDescription(detail),
      partition: firstNonEmptyText(
        detail?.tname,
        detail?.type_name,
        base.mediaKind === "bangumi" ? "Bangumi" : base.mediaKind === "audio" ? "Audio" : ""
      ),
      publishAt,
      systemTags: mergeSystemTags(apiSystemTags, detail)
    };

    if (!currentVideo.title) {
      currentVideo = null;
      currentVideoLocalFolders = [];
      renderVideo(null);
      setStatus(t("toast.videoLoadFail"), "err");
      return;
    }

    renderVideo(currentVideo);
    await refreshCurrentVideoLocalFolders();
  }

  async function loadFolders() {
    try {
      allFolders = await fetchFolders();
      const idSet = new Set(allFolders.map((folder) => folder.id));
      selectedFolderIds = new Set(
        [...selectedFolderIds].filter((id) => idSet.has(id))
      );
      renderFolders(folderSearchInput?.value || "");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t("toast.folderLoadFail"),
        "err"
      );
    }
  }

  async function loadCustomTags() {
    try {
      allCustomTags = await fetchAllCustomTags();
      renderCustomTagSuggestions();
    } catch {
      allCustomTags = [];
      renderCustomTagSuggestions();
    }
  }

  async function handleCreateFolder() {
    const name = (folderModalNameInput?.value || "").trim();
    const description = (folderModalDescInput?.value || "").trim();
    const groupName = (folderModalGroupInput?.value || "").trim();
    if (!name) {
      setStatus(t("toast.folderNameRequired"), "err");
      return;
    }

    if (!folderModalSaveBtn) return;
    folderModalSaveBtn.disabled = true;

    try {
      const created = await createFolder({
        name,
        description: description || undefined,
        groupName: groupName || null
      });

      folderModalNameInput.value = "";
      folderModalDescInput.value = "";
      folderModalGroupInput.value = "";
      syncCreateFolderCounter();
      closeCreateFolderModal();

      await loadFolders();
      const createdId = Number(created?.id);
      if (Number.isInteger(createdId) && createdId > 0) {
        selectedFolderIds.add(createdId);
      }
      renderFolders(folderSearchInput?.value || "");
      setStatus(t("toast.folderCreatedSelected"), "ok");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error.unknown");
      const isConflict =
        message.includes("Folder name already exists") ||
        message.includes("Article folder name already exists") ||
        message.includes("statusCode\":409");

      if (isConflict) {
        await loadFolders();
        const existing = allFolders.find(
          (folder) => folder.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          selectedFolderIds.add(existing.id);
        }
        closeCreateFolderModal();
        renderFolders(folderSearchInput?.value || "");
        setStatus(t("toast.folderExistsSelected"), "ok");
      } else {
        setStatus(`${t("toast.folderCreateFail")}: ${message}`, "err");
      }
    } finally {
      folderModalSaveBtn.disabled = false;
    }
  }

  function folderNamesFromSaveResult(result, key) {
    const folderIds = Array.isArray(result?.[key]) ? result[key] : [];
    const fromLoadedFolders = folderNamesFromIds(folderIds);
    if (fromLoadedFolders.length > 0) return fromLoadedFolders;
    const idSet = new Set(folderIds.map((id) => Number(id)));
    const finalFolders = Array.isArray(result?.finalFolders) ? result.finalFolders : [];
    return finalFolders
      .filter((folder) => idSet.has(Number(folder?.id)))
      .map((folder) => String(folder?.name || "").trim())
      .filter(Boolean);
  }

  function clearSaveFeedback() {
    if (saveFeedbackTimer) {
      window.clearTimeout(saveFeedbackTimer);
      saveFeedbackTimer = 0;
    }
    saveFeedbackEl?.classList.add("bl-hidden");
  }

  function showSaveFeedback(result, message, wasSaved) {
    if (!saveFeedbackEl || !saveFeedbackTitleEl || !saveFeedbackMessageEl) return;
    const addedCount = Array.isArray(result?.addedFolderIds)
      ? result.addedFolderIds.length
      : 0;
    const existingCount = Array.isArray(result?.existingFolderIds)
      ? result.existingFolderIds.length
      : 0;
    const removedCount = Array.isArray(result?.removedFolderIds)
      ? result.removedFolderIds.length
      : 0;
    const saved = articleMode
      ? articleSaved
      : currentVideoLocalFolders.length > 0;
    const title = articleMode
      ? !saved
        ? t("status.articleRemovedTitle")
        : addedCount > 0 && !wasSaved
          ? t("status.articleSavedTitle")
          : addedCount > 0 || removedCount > 0
            ? t("status.articleUpdatedTitle")
            : existingCount > 0
              ? t("status.articleAlreadySavedTitle")
              : t("status.articleUpdatedTitle")
      : !saved
        ? t("status.favoriteRemovedTitle")
        : addedCount > 0 && !wasSaved
          ? t("status.favoriteSavedTitle")
          : addedCount > 0 || removedCount > 0
            ? t("status.favoriteUpdatedTitle")
            : existingCount > 0
              ? t("status.favoriteAlreadySavedTitle")
              : t("status.favoriteUpdatedTitle");
    saveFeedbackTitleEl.textContent = title;
    saveFeedbackMessageEl.textContent = message;
    saveFeedbackEl.dataset.state = saved ? "saved" : "removed";
    saveFeedbackEl.classList.remove("bl-hidden", "is-entering");
    void saveFeedbackEl.offsetWidth;
    saveFeedbackEl.classList.add("is-entering");
    if (saveFeedbackTimer) window.clearTimeout(saveFeedbackTimer);
    saveFeedbackTimer = window.setTimeout(() => {
      saveFeedbackEl?.classList.add("bl-hidden");
      saveFeedbackTimer = 0;
    }, 5200);
  }

  async function saveVideoWithFolderIds(folderIds, options = {}) {
    if (!currentVideo?.bvid || !currentVideo?.title || !currentVideo?.bvidUrl) {
      setStatus(t("toast.videoIncomplete"), "err");
      return;
    }
    const triggerButton = options.button || null;
    const wasSaved = currentVideoLocalFolders.length > 0;
    if (triggerButton) {
      triggerButton.disabled = true;
      triggerButton.textContent = t("button.saving");
    }
    try {
      const payload = {
        ...currentVideo,
        folderIds: [...folderIds],
        customTags: parseTags(customTagsInput?.value || ""),
        systemTags: currentVideo.systemTags || [],
        isInvalid: false
      };
      const result = await requestLocalApi("POST", "/videos", payload);
      const addedFolderNames = folderNamesFromSaveResult(result, "addedFolderIds");
      const existingFolderNames = folderNamesFromSaveResult(result, "existingFolderIds");
      const removedFolderNames = folderNamesFromSaveResult(result, "removedFolderIds");
      const toastMessage =
        addedFolderNames.length > 0 ||
        existingFolderNames.length > 0 ||
        removedFolderNames.length > 0
          ? buildQuickFavoriteToastMessage(
              {
                addedFolderNames,
                existingFolderNames,
                removedFolderNames
              },
              t
            )
          : t("toast.saved");

      currentVideoLocalFolders = Array.isArray(result?.finalFolders) ? result.finalFolders : [];
      selectedFolderIds = new Set(currentVideoLocalFolderIds());
      showSaveFeedback(result, toastMessage, wasSaved);
      try {
        await chrome.storage.local.set(
          createRememberedCollectorFolderIdsRecord([...folderIds])
        );
      } catch {
      }
      syncCurrentFavoriteUi();
      renderFolders(folderSearchInput?.value || "");
      await loadFolders();
      return result;
    } catch (error) {
      setStatus(
        `${t("toast.saveFail")}: ${error instanceof Error ? error.message : t("error.unknown")}`,
        "err"
      );
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.textContent = t("button.save");
      }
    }
  }

  async function saveVideo() {
    if (!saveBtn) return;
    return saveVideoWithFolderIds(selectedFolderIds, { button: saveBtn });
  }

  async function saveArticleWithFolderIds(folderIds, options = {}) {
    if (!currentArticle?.sourceKey || !currentArticle?.title) {
      setStatus(t("toast.articleIncomplete"), "err");
      return;
    }
    const normalizedFolderIds = [...folderIds].map(Number).filter((id) => Number.isInteger(id) && id > 0);
    if (normalizedFolderIds.length === 0 && !articleSaved) {
      setStatus(t("toast.articleFolderRequired"), "err");
      return;
    }
    const triggerButton = options.button || null;
    const wasSaved = articleSaved;
    if (triggerButton) {
      triggerButton.disabled = true;
      triggerButton.textContent = t("button.saving");
    }
    try {
      const result = await requestLocalApi("POST", "/articles", {
        ...currentArticle,
        folderIds: normalizedFolderIds,
      });
      articleSaved = Boolean(result?.saved);
      currentArticleFavorite = result?.article || null;
      currentArticleLocalFolders = Array.isArray(result?.finalFolders)
        ? result.finalFolders
        : [];
      const addedFolderNames = folderNamesFromSaveResult(result, "addedFolderIds");
      const existingFolderNames = folderNamesFromSaveResult(result, "existingFolderIds");
      const removedFolderNames = folderNamesFromSaveResult(result, "removedFolderIds");
      const toastMessage =
        addedFolderNames.length > 0 || existingFolderNames.length > 0 || removedFolderNames.length > 0
          ? buildQuickFavoriteToastMessage(
              { addedFolderNames, existingFolderNames, removedFolderNames },
              t,
            )
          : articleSaved
            ? t("status.articleSaved")
            : t("status.articleRemoved");
      selectedFolderIds = new Set(currentCollectorFolderIds());
      showSaveFeedback(result, toastMessage, wasSaved);
      setFloatingFavoriteState(articleSaved);
      await loadFolders();
      renderFolders(folderSearchInput?.value || "");
      return result;
    } catch (error) {
      setStatus(
        `${t("toast.saveFail")}: ${error instanceof Error ? error.message : t("error.unknown")}`,
        "err",
      );
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.textContent = t("button.save");
      }
    }
  }

  async function saveCollectorItem() {
    if (articleMode) return saveArticleWithFolderIds(selectedFolderIds, { button: saveBtn });
    return saveVideo();
  }

  function readButtonPositionFromLocalStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function readButtonSideFromLocalStorage(key) {
    try {
      const value = localStorage.getItem(key);
      return value === "left" || value === "right" ? value : null;
    } catch {
      return null;
    }
  }

  function calcButtonRange(viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
    const width = floatingBtn?.offsetWidth || 56;
    const height = floatingBtn?.offsetHeight || 56;
    const min = BUTTON_MIN_MARGIN;
    const maxX = Math.max(min, viewportWidth - width - min);
    const maxY = Math.max(min, viewportHeight - height - min);
    return {
      min,
      maxX,
      maxY,
      rangeX: Math.max(1, maxX - min),
      rangeY: Math.max(1, maxY - min)
    };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function resolveButtonPositionFromRecord(record) {
    if (!record || typeof record !== "object") return null;
    const currentRange = calcButtonRange();

    const nx = Number(record.nx);
    const ny = Number(record.ny);
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      return {
        x: currentRange.min + clamp01(nx) * currentRange.rangeX,
        y: currentRange.min + clamp01(ny) * currentRange.rangeY
      };
    }

    const x = Number(record.x);
    const y = Number(record.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const vw = Number(record.vw);
    const vh = Number(record.vh);
    if (Number.isFinite(vw) && Number.isFinite(vh) && vw > 0 && vh > 0) {
      const oldRange = calcButtonRange(vw, vh);
      const ratioX = clamp01((x - oldRange.min) / oldRange.rangeX);
      const ratioY = clamp01((y - oldRange.min) / oldRange.rangeY);
      return {
        x: currentRange.min + ratioX * currentRange.rangeX,
        y: currentRange.min + ratioY * currentRange.rangeY
      };
    }

    return { x, y };
  }

  async function readStoredButtonPositionRecord() {
    try {
      const result = await chrome.storage.local.get([BUTTON_POS_STORAGE_KEY]);
      const stored = result?.[BUTTON_POS_STORAGE_KEY];
      if (stored && typeof stored === "object") {
        return stored;
      }
    } catch {
    }

    return (
      readButtonPositionFromLocalStorage(BUTTON_POS_STORAGE_KEY) ||
      readButtonPositionFromLocalStorage(LEGACY_BUTTON_POS_STORAGE_KEY)
    );
  }

  function saveButtonPosition(x, y) {
    const position = clampButtonPosition(x, y);
    const range = calcButtonRange();
    const record = {
      x: position.x,
      y: position.y,
      nx: clamp01((position.x - range.min) / range.rangeX),
      ny: clamp01((position.y - range.min) / range.rangeY),
      vw: window.innerWidth,
      vh: window.innerHeight,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(BUTTON_POS_STORAGE_KEY, JSON.stringify(record));
      localStorage.setItem(
        LEGACY_BUTTON_POS_STORAGE_KEY,
        JSON.stringify({ x: position.x, y: position.y })
      );
    } catch {
    }

    try {
      void chrome.storage.local.set({
        [BUTTON_POS_STORAGE_KEY]: record
      });
    } catch {
    }
  }

  function clampButtonPosition(x, y) {
    const range = calcButtonRange();
    return {
      x: Math.min(Math.max(range.min, x), range.maxX),
      y: Math.min(Math.max(range.min, y), range.maxY)
    };
  }

  function placeFloatingButtonAt(x, y, persist = true) {
    if (!floatingBtn) return;
    const position = clampButtonPosition(x, y);
    floatingBtn.style.left = `${position.x}px`;
    floatingBtn.style.top = `${position.y}px`;
    floatingBtn.style.right = "auto";
    floatingBtn.style.bottom = "auto";
    if (persist) saveButtonPosition(position.x, position.y);
  }

  function setButtonSide(side, persist = true) {
    if (!floatingBtn) return;
    const normalized = side === "left" ? "left" : "right";
    if (normalized === "left") {
      floatingBtn.classList.add("bl-side-left");
      floatingBtn.classList.remove("bl-side-right");
    } else {
      floatingBtn.classList.add("bl-side-right");
      floatingBtn.classList.remove("bl-side-left");
    }
    if (!persist) return;

    try {
      localStorage.setItem(BUTTON_SIDE_STORAGE_KEY, normalized);
      localStorage.setItem(LEGACY_BUTTON_SIDE_STORAGE_KEY, normalized);
    } catch {
    }

    try {
      void chrome.storage.local.set({
        [BUTTON_SIDE_STORAGE_KEY]: normalized
      });
    } catch {
    }
  }

  async function applyStoredButtonSide() {
    let side =
      readButtonSideFromLocalStorage(BUTTON_SIDE_STORAGE_KEY) ||
      readButtonSideFromLocalStorage(LEGACY_BUTTON_SIDE_STORAGE_KEY) ||
      "right";

    try {
      const result = await chrome.storage.local.get([BUTTON_SIDE_STORAGE_KEY]);
      const stored = result?.[BUTTON_SIDE_STORAGE_KEY];
      if (stored === "left" || stored === "right") {
        side = stored;
      }
    } catch {
    }

    setButtonSide(side, false);
  }

  function applyInitialButtonPosition() {
    if (!floatingBtn) return;
    const width = floatingBtn.offsetWidth || 56;
    const height = floatingBtn.offsetHeight || 56;
    placeFloatingButtonAt(
      window.innerWidth - width - 24,
      window.innerHeight - height - 24,
      false
    );
  }

  async function restoreStoredButtonPosition() {
    const record = await readStoredButtonPositionRecord();
    const position = resolveButtonPositionFromRecord(record);
    if (!position) return;
    placeFloatingButtonAt(position.x, position.y, false);
  }


  function bindFloatingButtonDrag() {
    if (!floatingBtn) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let moved = false;

    floatingBtn.addEventListener("pointerdown", (event) => {
      pointerId = event.pointerId;
      floatingBtn.setPointerCapture(pointerId);
      const rect = floatingBtn.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      originX = rect.left;
      originY = rect.top;
      moved = false;
    });

    floatingBtn.addEventListener("pointermove", (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const nextX = originX + (event.clientX - startX);
      const nextY = originY + (event.clientY - startY);
      if (
        Math.abs(event.clientX - startX) > 4 ||
        Math.abs(event.clientY - startY) > 4
      ) {
        moved = true;
      }
      placeFloatingButtonAt(nextX, nextY, false);
    });

    const finishDrag = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      floatingBtn.releasePointerCapture(pointerId);
      pointerId = null;

      const rect = floatingBtn.getBoundingClientRect();
      placeFloatingButtonAt(rect.left, rect.top, true);
      const centerX = rect.left + rect.width / 2;
      setButtonSide(centerX < window.innerWidth / 2 ? "left" : "right");

      suppressButtonClick = moved;
      if (moved) {
        setTimeout(() => {
          suppressButtonClick = false;
        }, 0);
      }
    };

    floatingBtn.addEventListener("pointerup", finishDrag);
    floatingBtn.addEventListener("pointercancel", finishDrag);
  }

  function isLikelyFullscreenPlayback() {
    // Bilibili Music uses fullscreen-related body classes for its normal player layout.
    if (isSpecialMediaUrl(location.href)) return false;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      return true;
    }

    const bodyClass = document.body?.className || "";
    if (/(webfullscreen|fullscreen|player-mode-full)/i.test(bodyClass)) {
      return true;
    }

    const playerContainer = document.querySelector(".bpx-player-container");
    const playerScreen = String(playerContainer?.getAttribute("data-screen") || "");
    if (playerScreen === "full" || playerScreen === "web") {
      return true;
    }

    return false;
  }

  function updateFloatingUiVisibility() {
    if (!root) return;
    if (isSpecialMediaUrl(location.href)) {
      root.classList.remove("bl-fullscreen-hidden");
      return;
    }
    const shouldHide = isLikelyFullscreenPlayback();
    root.classList.toggle("bl-fullscreen-hidden", shouldHide);
    if (shouldHide) {
      closeCollectorModal();
      closeCreateFolderModal();
    }
  }

  function startFullscreenWatch() {
    updateFloatingUiVisibility();
    window.addEventListener("fullscreenchange", updateFloatingUiVisibility);
    window.addEventListener("webkitfullscreenchange", updateFloatingUiVisibility);

    if (fullscreenObserver) {
      fullscreenObserver.disconnect();
      fullscreenObserver = null;
    }
    const observerTarget = document.body || document.documentElement;
    if (observerTarget) {
      fullscreenObserver = new MutationObserver(() => {
        updateFloatingUiVisibility();
      });
      fullscreenObserver.observe(observerTarget, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    if (fullscreenPollTimer !== null) {
      window.clearInterval(fullscreenPollTimer);
      fullscreenPollTimer = null;
    }
    fullscreenPollTimer = window.setInterval(() => {
      updateFloatingUiVisibility();
    }, 1500);
  }

  function startPlaybackOverlayWatch() {
    if (playbackOverlayTimer !== null) {
      window.clearInterval(playbackOverlayTimer);
      playbackOverlayTimer = null;
    }

    lastPlaybackOverlayUrl = location.href;
    void refreshPlaybackOverlay();

    playbackOverlayTimer = window.setInterval(() => {
      if (lastPlaybackOverlayUrl !== location.href) {
        lastPlaybackOverlayUrl = location.href;
        void refreshFloatingFavoriteStateFromPage(true);
      }
      void refreshPlaybackOverlay();
    }, 1500);

    window.addEventListener("focus", () => {
      lastPlaybackOverlayUrl = location.href;
      void refreshPlaybackOverlay();
      void refreshFloatingFavoriteStateFromPage(true);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      lastPlaybackOverlayUrl = location.href;
      void refreshPlaybackOverlay();
      void refreshFloatingFavoriteStateFromPage(true);
    });
  }

  async function getThemePreference() {
    try {
      const result = await chrome.storage.local.get([THEME_STORAGE_KEY]);
      const mode = result?.[THEME_STORAGE_KEY];
      if (mode === THEME_DARK || mode === THEME_LIGHT || mode === THEME_AUTO) {
        return mode;
      }
    } catch {
    }
    return THEME_AUTO;
  }

  function resolveThemeMode(mode) {
    if (mode === THEME_DARK || mode === THEME_LIGHT) return mode;
    return themeMediaQuery.matches ? THEME_DARK : THEME_LIGHT;
  }

  function applyTheme() {
    const mode = resolveThemeMode(activeThemePreference);
    if (panel) panel.dataset.theme = mode;
    if (floatingBtn) floatingBtn.dataset.theme = mode;
    if (modal) modal.dataset.theme = mode;
    if (playbackOverlay) playbackOverlay.dataset.theme = mode;
    if (nativeFavoriteStatus) nativeFavoriteStatus.dataset.theme = mode;
  }

  function injectStyles() {
    if (document.getElementById("bl-floating-style")) return;
    const style = document.createElement("style");
    style.id = "bl-floating-style";
    style.textContent = `
      #bl-floating-root {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 999998;
        font-family: "Noto Sans SC", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei UI", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      #bl-floating-root.bl-fullscreen-hidden {
        display: none !important;
      }
      .bl-hidden { display: none !important; }

      #bl-floating-btn {
        position: fixed;
        z-index: 999999;
        pointer-events: auto;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        border: 1px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
        touch-action: none;
        isolation: isolate;
        transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease;
      }
      #bl-floating-btn[data-theme="light"] {
        background: rgba(255, 255, 255, .98);
        border-color: rgba(27, 36, 53, .12);
        color: #313746;
        box-shadow: 0 8px 24px rgba(20, 28, 43, .18), 0 1px 2px rgba(20, 28, 43, .08);
      }
      #bl-floating-btn[data-theme="dark"] {
        background: rgba(28, 31, 40, .98);
        border-color: rgba(255, 255, 255, .16);
        color: #f1f3f7;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .32), 0 1px 2px rgba(0, 0, 0, .24);
      }
      #bl-floating-btn[data-favorite-state='saved'][data-theme="light"] {
        background: rgba(255, 245, 248, .98);
        border-color: rgba(251, 114, 153, .7);
        color: #d94872;
        box-shadow: 0 8px 24px rgba(217, 72, 114, .2), 0 0 0 3px rgba(251, 114, 153, .08);
      }
      #bl-floating-btn[data-favorite-state='saved'][data-theme="dark"] {
        background: rgba(67, 28, 42, .98);
        border-color: rgba(251, 114, 153, .78);
        color: #ff91b1;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .34), 0 0 0 3px rgba(251, 114, 153, .14);
      }
      #bl-floating-btn[data-favorite-state='saved'] > svg path {
        fill: currentColor;
        stroke: currentColor;
      }
      #bl-floating-btn:hover { transform: translateY(-2px); }
      #bl-floating-btn[data-theme="light"]:hover {
        border-color: rgba(251, 114, 153, .48);
        box-shadow: 0 12px 28px rgba(20, 28, 43, .2), 0 0 0 3px rgba(251, 114, 153, .1);
      }
      #bl-floating-btn[data-theme="dark"]:hover {
        border-color: rgba(251, 114, 153, .58);
        box-shadow: 0 12px 30px rgba(0, 0, 0, .38), 0 0 0 3px rgba(251, 114, 153, .12);
      }
      #bl-floating-btn:active { cursor: grabbing; transform: scale(.98); }
      #bl-floating-btn > svg { width: 22px; height: 22px; }
      #bl-floating-btn[data-favorite-state="loading"] > svg { animation: bl-favorite-loading .8s ease-in-out infinite alternate; }
      .bl-native-favorite-status { vertical-align: middle; }
      .bl-native-favorite-status[data-state="loading"] { opacity: .68; }
      .bl-native-favorite-status:hover { border-color: #d94872 !important; }
      @keyframes bl-favorite-loading {
        from { opacity: .38; transform: scale(.92); }
        to { opacity: .8; transform: scale(1.04); }
      }

      #bl-collector-backdrop {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(8, 14, 30, .42);
        animation: bl-backdrop-in .2s ease-out both;
      }
      #bl-collector-backdrop.is-closing { animation: bl-backdrop-out .18s ease-in both; }

      #bl-floating-panel {
        pointer-events: auto;
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1000000;
        width: min(468px, calc(100vw - 24px));
        max-height: min(86vh, 760px);
        overflow: auto;
        transform: translate(-50%, -50%);
        border-radius: 16px;
        border: 1px solid;
        padding: 16px 16px 14px;
        box-sizing: border-box;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: 0 24px 52px rgba(8, 14, 30, .24);
        transform-origin: center;
        animation: bl-panel-in .24s cubic-bezier(.2, .8, .2, 1) both;
      }
      #bl-floating-panel.is-closing { animation: bl-panel-out .18s ease-in both; }
      @keyframes bl-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bl-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
      @keyframes bl-panel-in {
        from { opacity: 0; transform: translate(-50%, calc(-50% + 18px)) scale(.965); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes bl-panel-out {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, calc(-50% + 10px)) scale(.98); }
      }
      #bl-floating-panel[data-theme="light"] {
        border-color: #d7dfe1;
        background: #f7f9f9;
        color: #18232d;
      }
      #bl-floating-panel[data-theme="dark"] {
        border-color: #36454e;
        background: #11191f;
        color: #e7edef;
      }

      .bl-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
      .bl-title-row { display: flex; align-items: center; gap: 8px; }
      .bl-brand-mark {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .bl-brand-mark svg { width: 28px; height: 28px; }
      .bl-title-wrap { display: flex; flex-direction: column; gap: 2px; }
      .bl-title { margin: 0; font-size: 18px; font-weight: 700; }
      #bl-floating-panel[data-theme="light"] .bl-title { color: #18232d; }
      #bl-floating-panel[data-theme="dark"] .bl-title { color: #f7f9fa; }

      .bl-btn {
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.15;
        cursor: pointer;
        transition: all .14s ease;
      }
      .bl-btn:disabled { opacity: .56; cursor: not-allowed; }
      .bl-btn-primary { background: #d94872; color: #fff; border-color: #d94872; }
      .bl-btn-secondary { background: #e8f7f4; color: #17675d; border-color: #bfe8e1; }
      .bl-btn-outline { background: transparent; border: 1px solid; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-secondary { background: #173d39; color: #a8eee5; border-color: #276159; }
      #bl-floating-panel[data-theme="light"] .bl-btn-outline { border-color: #d4dcde; color: #33424b; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-outline { border-color: #465761; color: #dce4e7; }

      .bl-video-card {
        margin-top: 12px;
        border: 1px solid;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 116px 1fr;
        gap: 10px;
        padding: 10px;
      }
      #bl-floating-panel[data-theme="light"] .bl-video-card { border-color: #d7dfe1; background: #fff; }
      #bl-floating-panel[data-theme="dark"] .bl-video-card { border-color: #36454e; background: #1a242c; }
      .bl-video-cover { width: 116px; height: 65px; border-radius: 6px; object-fit: cover; background: #d9e0ef; }
      .bl-video-title { margin: 0; font-size: 13px; line-height: 1.35; font-weight: 650; }
      .bl-video-meta { margin-top: 6px; font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-video-meta { color: #63717a; }
      #bl-floating-panel[data-theme="dark"] .bl-video-meta { color: #9eabb2; }
      .bl-card { margin-top: 12px; border: 1px solid; border-radius: 8px; padding: 10px; }
      #bl-floating-panel[data-theme="light"] .bl-card { border-color: #d7dfe1; background: #fff; }
      #bl-floating-panel[data-theme="dark"] .bl-card { border-color: #36454e; background: #1a242c; }
      .bl-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
      .bl-label { font-size: 12px; font-weight: 600; }

      .bl-input {
        width: 100%;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid;
        padding: 9px 10px;
        font-size: 13px;
        transition: border-color .16s ease, box-shadow .16s ease;
      }
      #bl-floating-panel[data-theme="light"] .bl-input { border-color: #d4dcde; background: #fff; color: #18232d; }
      #bl-floating-panel[data-theme="dark"] .bl-input { border-color: #465761; background: #11191f; color: #edf2f3; }
      .bl-input:focus { outline: none; border-color: #d94872; box-shadow: 0 0 0 3px rgba(217, 72, 114, .16); }

      .bl-folder-toolbar { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
      .bl-folder-toolbar .bl-input { margin: 0; }
      .bl-folder-toolbar .bl-btn { white-space: nowrap; }

      .bl-folder-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
      .bl-folder-actions-left { display: flex; gap: 6px; }
      .bl-selected-count { font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-selected-count { color: #5f6f8f; }
      #bl-floating-panel[data-theme="dark"] .bl-selected-count { color: #93a4c3; }
      .bl-current-favorite-folders { margin: 0 0 8px; font-size: 11px; line-height: 1.4; }
      #bl-floating-panel[data-theme="light"] .bl-current-favorite-folders { color: #17675d; }
      #bl-floating-panel[data-theme="dark"] .bl-current-favorite-folders { color: #a8eee5; }

      .bl-folder-list {
        max-height: 230px;
        overflow: auto;
        border: 1px solid;
        border-radius: 8px;
        padding: 6px;
      }
      #bl-floating-panel[data-theme="light"] .bl-folder-list { border-color: #d7dfe1; background: #fff; }
      #bl-floating-panel[data-theme="dark"] .bl-folder-list { border-color: #465761; background: #11191f; }
      .bl-folder-item { display: flex; align-items: flex-start; gap: 8px; padding: 7px; border-radius: 8px; }
      .bl-folder-group { margin: 8px 6px 4px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 700; color: #63717a; }
      .bl-folder-group-toggle { border: 0; padding: 0 3px; background: transparent; color: inherit; font-size: 15px; line-height: 1; cursor: pointer; }
      .bl-folder-item.is-active {
        outline: 2px solid rgba(217, 72, 114, .32);
        outline-offset: -1px;
      }
      #bl-floating-panel[data-theme="light"] .bl-folder-item:hover { background: rgba(217, 72, 114, .08); }
      #bl-floating-panel[data-theme="dark"] .bl-folder-item:hover { background: rgba(243, 111, 152, .12); }
      .bl-folder-item input { margin-top: 2px; }
      .bl-folder-content { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .bl-folder-name { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.3; word-break: break-word; }
      .bl-folder-meta { margin: 0; font-size: 11px; }
      #bl-floating-panel[data-theme="light"] .bl-folder-meta { color: #63717a; }
      #bl-floating-panel[data-theme="dark"] .bl-folder-meta { color: #9eabb2; }
      .bl-empty { font-size: 12px; text-align: center; padding: 16px 8px; }
      #bl-floating-panel[data-theme="light"] .bl-empty { color: #7c8aa6; }
      #bl-floating-panel[data-theme="dark"] .bl-empty { color: #94a3be; }
      .bl-tag-suggestions {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .bl-tag-suggestion {
        appearance: none;
        border-radius: 999px;
        border: 1px solid #bfe8e1;
        background: #e8f7f4;
        color: #17675d;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        transition: transform .14s ease, border-color .14s ease, background .14s ease;
      }
      .bl-tag-suggestion:hover {
        transform: translateY(-1px);
        border-color: rgba(217, 72, 114, .42);
        background: rgba(217, 72, 114, .08);
      }
      #bl-floating-panel[data-theme="dark"] .bl-tag-suggestion {
        border-color: #276159;
        background: #173d39;
        color: #a8eee5;
      }
      #bl-floating-panel[data-theme="dark"] .bl-tag-suggestion:hover {
        border-color: rgba(243, 111, 152, .55);
        background: rgba(243, 111, 152, .12);
      }

      .bl-footer { margin-top: 12px; display: flex; gap: 8px; }
      .bl-footer .bl-btn { flex: 1; }
      .bl-save-feedback {
        margin-top: 12px;
        padding: 11px 12px;
        border: 1px solid;
        border-radius: 10px;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        gap: 9px;
        align-items: center;
      }
      .bl-save-feedback.is-entering { animation: bl-save-feedback-in .26s cubic-bezier(.2, .8, .2, 1); }
      .bl-save-feedback-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        background: #12a36d;
      }
      .bl-save-feedback-icon svg { width: 14px; height: 14px; }
      .bl-save-feedback-copy { min-width: 0; }
      .bl-save-feedback-title { margin: 0; font-size: 13px; font-weight: 750; line-height: 1.35; }
      .bl-save-feedback-message { margin: 2px 0 0; font-size: 12px; line-height: 1.4; word-break: break-word; }
      #bl-floating-panel[data-theme="light"] .bl-save-feedback {
        color: #126344;
        border-color: rgba(18, 163, 109, .3);
        background: #edf9f3;
      }
      #bl-floating-panel[data-theme="dark"] .bl-save-feedback {
        color: #9af0c9;
        border-color: rgba(52, 211, 153, .36);
        background: rgba(12, 66, 47, .5);
      }
      .bl-save-feedback[data-state="removed"] .bl-save-feedback-icon { background: #64748b; }
      #bl-floating-panel[data-theme="light"] .bl-save-feedback[data-state="removed"] {
        color: #475569;
        border-color: #cbd5e1;
        background: #f8fafc;
      }
      #bl-floating-panel[data-theme="dark"] .bl-save-feedback[data-state="removed"] {
        color: #cbd5e1;
        border-color: #475569;
        background: rgba(30, 41, 59, .72);
      }
      @keyframes bl-save-feedback-in {
        from { opacity: 0; transform: translateY(7px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bl-credit { margin-top: 8px; font-size: 11px; text-align: right; }
      #bl-floating-panel[data-theme="light"] .bl-credit { color: #7283a3; }
      #bl-floating-panel[data-theme="dark"] .bl-credit { color: #95a5c4; }

      .bl-toast-root {
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 1000001;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      .Vue-Toastification__toast {
        pointer-events: auto;
        min-width: 280px;
        max-width: 360px;
        border-radius: 16px;
        border: 1px solid transparent;
        padding: 14px 16px;
        font-size: 13px;
        line-height: 1.4;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        box-shadow: 0 18px 38px rgba(17, 24, 39, .26);
        animation: bl-toast-in .18s ease;
        backdrop-filter: none;
      }
      .Vue-Toastification__icon {
        margin-top: 1px;
        font-size: 13px;
        line-height: 1;
      }
      .Vue-Toastification__toast-body {
        flex: 1;
        min-width: 0;
      }
      .Vue-Toastification__toast--success {
        color: #14673f;
        background: #f5fbfa;
        border-color: #7bd9a6;
      }
      .Vue-Toastification__toast--error {
        color: #9f223a;
        background: #fff8f8;
        border-color: #ff9fb0;
      }
      .Vue-Toastification__toast--info {
        color: #1f3d84;
        background: #fff9fb;
        border-color: #96bbff;
      }
      .Vue-Toastification__toast.is-leaving {
        opacity: 0;
        transform: translateY(6px) scale(.98);
        transition: opacity .22s ease, transform .22s ease;
      }
      @keyframes bl-toast-in {
        from { opacity: 0; transform: translateY(8px) scale(.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--success {
        color: #a7f3d0;
        background: #172722;
        border-color: #39c78a;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--error {
        color: #fecaca;
        background: #2a1b22;
        border-color: #fb7185;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--info {
        color: #cfe3ff;
        background: #291b23;
        border-color: #60a5fa;
      }

      #bl-floating-panel {
        width: min(560px, calc(100vw - 24px));
        max-height: min(84vh, 760px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
        border-radius: 12px;
      }
      #bl-floating-panel[data-theme="light"] {
        border-color: #d4dee0;
        background: #f7f9f9;
      }
      #bl-floating-panel[data-theme="dark"] {
        border-color: #36454e;
        background: #11191f;
      }
      .bl-header {
        flex: 0 0 auto;
        align-items: center;
        padding: 13px 16px 12px;
        border-bottom: 1px solid;
      }
      #bl-floating-panel[data-theme="light"] .bl-header { border-color: #d7dfe1; }
      #bl-floating-panel[data-theme="dark"] .bl-header { border-color: #2d3b43; }
      .bl-title-row { gap: 9px; }
      .bl-brand-mark,
      .bl-brand-mark svg { width: 30px; height: 30px; }
      .bl-title { font-size: 17px; letter-spacing: -.01em; }
      .bl-icon-btn {
        width: 32px;
        height: 32px;
        padding: 0;
        border-radius: 7px;
        font-size: 21px;
        font-weight: 450;
        line-height: 1;
      }
      .bl-panel-scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }
      .bl-video-card {
        margin: 0;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 11px;
        padding: 13px 16px;
        border: 0;
        border-bottom: 1px solid;
        border-radius: 0;
      }
      #bl-floating-panel[data-theme="light"] .bl-video-card {
        border-color: #d7dfe1;
        background: #eef5f4;
      }
      #bl-floating-panel[data-theme="dark"] .bl-video-card {
        border-color: #2d3b43;
        background: #172229;
      }
      .bl-video-cover { width: 96px; height: 54px; border-radius: 6px; }
      .bl-video-title { font-size: 13px; line-height: 1.38; }
      .bl-video-meta { margin-top: 4px; font-size: 11px; }
      .bl-card {
        margin: 0;
        padding: 14px 16px;
        border: 0;
        border-bottom: 1px solid;
        border-radius: 0;
        background: transparent;
      }
      #bl-floating-panel[data-theme="light"] .bl-card { border-color: #d7dfe1; background: transparent; }
      #bl-floating-panel[data-theme="dark"] .bl-card { border-color: #2d3b43; background: transparent; }
      .bl-card-head { margin-bottom: 9px; }
      .bl-label { font-size: 12px; font-weight: 750; }
      .bl-btn { min-height: 32px; padding: 7px 10px; border-radius: 7px; font-size: 11.5px; }
      .bl-btn-primary { box-shadow: 0 8px 18px -12px rgba(217, 72, 114, .9); }
      .bl-btn-secondary { background: #e8f7f4; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-secondary { background: #173d39; }
      .bl-input {
        min-height: 36px;
        padding: 8px 10px;
        border-radius: 7px;
        font-size: 12px;
      }
      .bl-input:focus { border-color: #4ccbbb; box-shadow: 0 0 0 3px rgba(76, 203, 187, .14); }
      .bl-folder-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; margin-bottom: 8px; }
      .bl-folder-toolbar .bl-btn { white-space: nowrap; }
      .bl-folder-actions { margin-bottom: 8px; }
      .bl-folder-actions-left { gap: 6px; }
      .bl-selected-count { color: #17675d; font-size: 11px; font-weight: 700; }
      #bl-floating-panel[data-theme="dark"] .bl-selected-count { color: #a8eee5; }
      .bl-current-favorite-folders { margin-bottom: 8px; font-size: 10.5px; }
      .bl-folder-list { max-height: 196px; padding: 4px; border-radius: 7px; }
      .bl-folder-item { gap: 8px; padding: 7px 8px; border-radius: 6px; }
      .bl-folder-item.is-active { outline: 1px solid rgba(217, 72, 114, .52); }
      .bl-folder-name { font-size: 12px; }
      .bl-folder-meta { font-size: 10.5px; }
      .bl-empty { min-height: 76px; display: flex; align-items: center; justify-content: center; padding: 12px 8px; }
      .bl-tag-suggestions { margin-top: 8px; gap: 6px; }
      .bl-tag-suggestion { padding: 6px 10px; font-size: 11px; }
      .bl-save-feedback { margin: 0; border-radius: 0; border-width: 0 0 1px; padding: 11px 16px; }
      .bl-footer {
        flex: 0 0 auto;
        display: block;
        margin: 0;
        padding: 11px 16px 10px;
        border-top: 0;
      }
      .bl-footer .bl-btn { width: 100%; min-height: 40px; }
      .bl-credit { margin: 7px 0 0; font-size: 10px; text-align: center; }
      #bl-floating-panel[data-theme="light"] .bl-credit { color: #829097; }
      #bl-floating-panel[data-theme="dark"] .bl-credit { color: #718089; }

      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast {
        position: relative;
        min-width: 280px;
        max-width: 350px;
        border-radius: 8px;
        border: 1px solid #d4dee0;
        border-left: 3px solid #4ccbbb;
        padding: 10px 12px 10px 10px;
        background: #ffffff;
        color: #26343d;
        box-shadow: 0 16px 34px -20px rgba(24, 35, 45, .7);
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 2px;
        background: #4ccbbb;
        opacity: .38;
        transform-origin: left;
        animation: bl-toast-progress 3.2s linear forwards;
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: rgba(76, 203, 187, .14);
        color: #219887;
        font-size: 13px;
        font-weight: 800;
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--error {
        border-color: #f0c4ca;
        border-left-color: #e05262;
        background: #fff8f8;
        color: #8e3040;
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--error::after { background: #e05262; }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--error .Vue-Toastification__icon {
        background: rgba(224, 82, 98, .13);
        color: #d14355;
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--info {
        border-left-color: #d94872;
        background: #fff9fb;
        color: #8f3354;
      }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--info::after { background: #d94872; }
      #bl-floating-panel ~ .bl-toast-root .Vue-Toastification__toast--info .Vue-Toastification__icon {
        background: rgba(217, 72, 114, .13);
        color: #c63c66;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast {
        border-color: #40515a;
        background: #1a242c;
        color: #e7edef;
        box-shadow: 0 16px 34px -18px rgba(0, 0, 0, .86);
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--error {
        border-color: #70404a;
        background: #2a1b22;
        color: #fecdd3;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--info {
        border-color: #6b3b50;
        background: #291b23;
        color: #ffd4e0;
      }
      @keyframes bl-toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }

      #bl-create-folder-modal {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(8, 14, 30, .38);
        padding: 14px;
        box-sizing: border-box;
      }
      .bl-modal-panel { width: min(560px, calc(100vw - 28px)); border-radius: 8px; border: 1px solid; padding: 14px; }
      #bl-create-folder-modal[data-theme="light"] .bl-modal-panel { border-color: #d7dfe1; background: #ffffff; color: #18232d; }
      #bl-create-folder-modal[data-theme="dark"] .bl-modal-panel { border-color: #36454e; background: #1a242c; color: #e7edef; }
      .bl-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .bl-modal-title { margin: 0; font-size: 17px; font-weight: 700; }
      .bl-form-item { margin-bottom: 10px; }
      .bl-form-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .bl-form-label { font-size: 12px; font-weight: 600; }
      .bl-form-count { font-size: 12px; }
      #bl-create-folder-modal[data-theme="light"] .bl-form-count { color: #63717a; }
      #bl-create-folder-modal[data-theme="dark"] .bl-form-count { color: #9eabb2; }
      .bl-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid;
        border-radius: 8px;
        padding: 10px;
        min-height: 88px;
        font-size: 13px;
        resize: vertical;
      }
      #bl-create-folder-modal[data-theme="light"] .bl-input,
      #bl-create-folder-modal[data-theme="light"] .bl-textarea { border-color: #d4dcde; background: #fff; color: #18232d; }
      #bl-create-folder-modal[data-theme="dark"] .bl-input,
      #bl-create-folder-modal[data-theme="dark"] .bl-textarea { border-color: #465761; background: #11191f; color: #edf2f3; }
      .bl-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

      #bl-playback-overlay {
        pointer-events: auto;
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 1000000;
        width: min(420px, calc(100vw - 32px));
        border-radius: 8px;
        border: 1px solid;
        padding: 14px;
        box-shadow: 0 24px 56px rgba(8, 14, 30, .24);
      }
      #bl-playback-overlay[data-theme="light"] {
        border-color: #d7dfe1;
        background: #fff;
        color: #18232d;
      }
      #bl-playback-overlay[data-theme="dark"] {
        border-color: #36454e;
        background: #1a242c;
        color: #e7edef;
      }
      .bl-playback-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .bl-playback-header-copy {
        min-width: 0;
        flex: 1;
      }
      .bl-playback-caption {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .bl-playback-title {
        margin: 8px 0 0;
        font-size: 15px;
        line-height: 1.45;
        font-weight: 700;
      }
      .bl-playback-meta {
        margin: 6px 0 0;
        font-size: 12px;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-meta {
        color: #63717a;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-meta {
        color: #9eabb2;
      }
      .bl-playback-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .bl-playback-actions .bl-btn {
        width: 100%;
      }
      .bl-playback-header-actions {
        display: flex;
        justify-content: flex-end;
      }
      .bl-playback-header-actions .bl-btn {
        min-width: 82px;
      }
      .bl-playback-list {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 292px;
        overflow: auto;
        padding-right: 2px;
      }
      .bl-playback-empty {
        padding: 14px 10px;
        border-radius: 8px;
        font-size: 12px;
        text-align: center;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-empty {
        background: #eef2f3;
        color: #63717a;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-empty {
        background: #202c34;
        color: #aeb9be;
      }
      .bl-playback-list-item {
        width: 100%;
        display: grid;
        grid-template-columns: 60px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid;
        text-align: left;
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background-color .16s ease;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-item {
        border-color: #d7dfe1;
        background: #fff;
        color: #18232d;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item {
        border-color: #36454e;
        background: #11191f;
        color: #e7edef;
      }
      .bl-playback-list-item:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .bl-playback-list-item.is-active,
      .bl-playback-list-item:disabled {
        cursor: default;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-item.is-active,
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-item:disabled {
        border-color: rgba(217, 72, 114, .62);
        background: rgba(217, 72, 114, .08);
        box-shadow: inset 0 0 0 1px rgba(217, 72, 114, .08);
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item.is-active,
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item:disabled {
        border-color: rgba(243, 111, 152, .7);
        background: rgba(243, 111, 152, .12);
        box-shadow: inset 0 0 0 1px rgba(243, 111, 152, .12);
      }
      .bl-playback-thumb {
        width: 60px;
        height: 40px;
        border-radius: 6px;
        object-fit: cover;
        display: block;
      }
      .bl-playback-list-copy {
        min-width: 0;
      }
      .bl-playback-list-title {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .bl-playback-list-meta {
        margin: 4px 0 0;
        font-size: 11px;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-meta {
        color: #64748b;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-meta {
        color: #9eabb2;
      }
      .bl-playback-list-index {
        min-width: 28px;
        height: 28px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-index {
        background: #e8f7f4;
        color: #17675d;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-index {
        background: #173d39;
        color: #a8eee5;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-actions,
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-list {
        display: none;
      }
      #bl-playback-overlay[data-collapsed="true"] {
        left: auto;
        right: 16px;
        width: max-content;
        max-width: min(240px, calc(100vw - 32px));
        padding: 7px;
        border-radius: 10px;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-header-copy {
        display: none;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-header {
        align-items: center;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-header-actions,
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-header-actions .bl-btn {
        width: auto;
        min-width: 0;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-header-actions .bl-btn {
        padding: 7px 14px;
      }

      @media (max-width: 680px) {
        #bl-floating-panel {
          width: calc(100vw - 16px);
          max-height: calc(100dvh - 16px);
        }
        .bl-header,
        .bl-video-card,
        .bl-card,
        .bl-footer {
          padding-left: 12px;
          padding-right: 12px;
        }
        .bl-folder-toolbar {
          grid-template-columns: minmax(0, 1fr);
        }
        #bl-playback-overlay {
          left: 12px;
          right: 12px;
          bottom: 12px;
          width: max-content;
        }
        #bl-playback-overlay[data-collapsed="true"] {
          left: auto;
          right: 12px;
          width: auto;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #bl-collector-backdrop,
        #bl-floating-panel,
        #bl-floating-btn,
        .bl-save-feedback,
        .Vue-Toastification__toast {
          animation: none !important;
          transition-duration: .01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bindEvents() {
    if (!floatingBtn || !panel || !panelBackdrop) return;

    floatingBtn.addEventListener("click", async () => {
      if (suppressButtonClick) return;
      if (!panel.classList.contains("bl-hidden")) {
        closeCollectorModal();
        return;
      }

      await openCollectorModal();
    });

    closeBtn?.addEventListener("click", closeCollectorModal);
    saveBtn?.addEventListener("click", saveCollectorItem);

    folderSearchInput?.addEventListener("input", (event) => {
      renderFolders(event.target.value || "");
    });

    customTagsInput?.addEventListener("input", () => {
      renderCustomTagSuggestions();
    });

    openCreateFolderBtn?.addEventListener("click", () => {
      openCreateFolderModal();
    });

    selectAllFoldersBtn?.addEventListener("click", () => {
      const keyword = (folderSearchInput?.value || "").trim().toLowerCase();
      const visibleIds = allFolders
        .filter((folder) => folder.name.toLowerCase().includes(keyword))
        .map((folder) => folder.id);
      selectedFolderIds = new Set([...selectedFolderIds, ...visibleIds]);
      renderFolders(folderSearchInput?.value || "");
    });

    clearFolderSelectionBtn?.addEventListener("click", () => {
      selectedFolderIds.clear();
      renderFolders(folderSearchInput?.value || "");
    });

    folderModalCloseBtn?.addEventListener("click", closeCreateFolderModal);
    folderModalCancelBtn?.addEventListener("click", closeCreateFolderModal);
    folderModalSaveBtn?.addEventListener("click", handleCreateFolder);

    folderModalNameInput?.addEventListener("input", syncCreateFolderCounter);
    folderModalDescInput?.addEventListener("input", syncCreateFolderCounter);
    folderModalNameInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleCreateFolder();
      }
    });

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeCreateFolderModal();
      }
    });

    panelBackdrop.addEventListener("click", (event) => {
      if (event.target === panelBackdrop) {
        closeCollectorModal();
      }
    });

    window.addEventListener("resize", () => {
      updateFloatingUiVisibility();
      const rect = floatingBtn.getBoundingClientRect();
      placeFloatingButtonAt(rect.left, rect.top, false);
      scheduleNativeFavoriteStatusMount();
    });
    window.addEventListener("keydown", handleQuickFavoriteShortcut);
  }

  function injectUi() {
    injectStyles();

    root = document.createElement("div");
    root.id = "bl-floating-root";

    panelBackdrop = createEl("div", {
      id: "bl-collector-backdrop",
      className: "bl-hidden"
    });

    panel = createEl(
      "div",
      {
        id: "bl-floating-panel",
        className: "bl-hidden",
        attrs: {
          "data-theme": "light",
          role: "dialog",
          "aria-modal": "true",
          "aria-hidden": "true",
          "aria-labelledby": "bl-collector-title"
        }
      },
      [
        createEl("div", { className: "bl-header" }, [
          createEl("div", { className: "bl-title-wrap" }, [
            createEl("h2", { id: "bl-collector-title", className: "bl-title" }, [
              createEl("span", { className: "bl-title-row" }, [
                createEl(
                  "span",
                  { className: "bl-brand-mark", attrs: { "aria-hidden": "true" } },
                  [createBrandMarkSvg()]
                ),
                createEl("span", { text: t("title.collector") })
              ])
            ])
          ]),
          createEl("button", {
            id: "bl-close-btn",
            className: "bl-btn bl-btn-outline bl-icon-btn",
            attrs: {
              type: "button",
              title: t("button.close"),
              "aria-label": t("button.close")
            },
            text: "×"
          })
        ]),
        createEl("div", { className: "bl-panel-scroll" }, [
        createEl("section", { className: "bl-video-card" }, [
          createEl("img", {
            id: "bl-video-cover",
            className: "bl-video-cover",
            attrs: { src: DEFAULT_COVER, alt: t("status.coverAlt") }
          }),
          createEl("div", {}, [
            createEl("p", {
              id: "bl-video-title",
              className: "bl-video-title",
              text: t("status.noVideoTitle")
            }),
            createEl("p", {
              id: "bl-video-meta",
              className: "bl-video-meta",
              text: "-"
            })
          ])
        ]),
        createEl("section", { className: "bl-card" }, [
          createEl("div", { className: "bl-card-head" }, [
            createEl("span", {
              className: "bl-label",
              text: t(articleMode ? "section.articleFolders" : "section.folders")
            }),
            createEl("span", {
              id: "bl-selected-count",
              className: "bl-selected-count",
              text: t("status.selectedCount", { count: 0 })
            })
          ]),
          createEl("div", { className: "bl-folder-toolbar" }, [
            createEl("input", {
              id: "bl-folder-search",
              className: "bl-input",
              attrs: { placeholder: t("field.searchFolders") }
            }),
            createEl("button", {
              id: "bl-folder-create-open",
              className: "bl-btn bl-btn-secondary",
              attrs: { type: "button" },
              text: t(articleMode ? "button.newArticleFolder" : "button.newFolder")
            })
          ]),
          createEl("p", {
            id: "bl-current-favorite-folders",
            className: "bl-current-favorite-folders",
            text: activeLocale === LOCALE_ZH
              ? "当前内容尚未收藏到 BiliShelf"
              : "This content is not saved in BiliShelf"
          }),
          createEl("div", { className: "bl-folder-actions" }, [
            createEl("div", { className: "bl-folder-actions-left" }, [
              createEl("button", {
                id: "bl-select-all-folders",
                className: "bl-btn bl-btn-outline",
                attrs: { type: "button" },
                text: t("button.selectAll")
              }),
              createEl("button", {
                id: "bl-clear-folders",
                className: "bl-btn bl-btn-outline",
                attrs: { type: "button" },
                text: t("button.clear")
              })
            ]),
          ]),
          createEl("div", { id: "bl-folder-list", className: "bl-folder-list" })
        ]),
        createEl("section", { id: "bl-custom-tags-section", className: "bl-card" }, [
          createEl("div", { className: "bl-card-head" }, [
            createEl("span", {
              className: "bl-label",
              text: t("section.customTags")
            })
          ]),
          createEl("input", {
            id: "bl-custom-tags",
            className: "bl-input",
            attrs: { placeholder: t("field.customTags") }
          }),
          createEl("div", {
            id: "bl-custom-tag-suggestions",
            className: "bl-tag-suggestions bl-hidden"
          })
        ]),
        createEl(
          "div",
          {
            id: "bl-save-feedback",
            className: "bl-save-feedback bl-hidden",
            attrs: { role: "status", "aria-live": "polite", "data-state": "saved" }
          },
          [
            createEl("span", { className: "bl-save-feedback-icon" }, [createCheckSvg()]),
            createEl("div", { className: "bl-save-feedback-copy" }, [
              createEl("p", {
                id: "bl-save-feedback-title",
                className: "bl-save-feedback-title",
                text: t("status.favoriteSavedTitle")
              }),
              createEl("p", {
                id: "bl-save-feedback-message",
                className: "bl-save-feedback-message",
                text: ""
              })
            ])
          ]
        ),
        ]),
        createEl("div", { className: "bl-footer" }, [
          createEl("button", {
            id: "bl-save-btn",
            className: "bl-btn bl-btn-primary",
            attrs: { type: "button" },
            text: t("button.save")
          }),
          createEl("p", { className: "bl-credit", text: t("footer.credit") })
        ])
      ]
    );

    modal = createEl(
      "div",
      {
        id: "bl-create-folder-modal",
        className: "bl-hidden",
        attrs: { "data-theme": "light" }
      },
      [
        createEl("div", { className: "bl-modal-panel" }, [
          createEl("div", { className: "bl-modal-header" }, [
            createEl("h3", {
              className: "bl-modal-title",
              text: t(articleMode ? "modal.createArticleFolder" : "modal.createFolder")
            }),
            createEl("button", {
              id: "bl-modal-folder-close",
              className: "bl-btn bl-btn-outline",
              attrs: { type: "button" },
              text: t("button.close")
            })
          ]),
          createEl("div", { className: "bl-form-item" }, [
            createEl("div", { className: "bl-form-row" }, [
              createEl("span", { className: "bl-form-label" }, [
                t("modal.name"),
                " ",
                createEl("span", {
                  attrs: { style: "color:#ef4444" },
                  text: "*"
                })
              ]),
              createEl("span", {
                id: "bl-folder-name-count",
                className: "bl-form-count",
                text: "0/20"
              })
            ]),
            createEl("input", {
              id: "bl-modal-folder-name",
              className: "bl-input",
              attrs: {
                maxlength: "20",
                placeholder: t("modal.folderNamePlaceholder")
              }
            })
          ]),
          createEl("div", { className: "bl-form-item" }, [
            createEl("div", { className: "bl-form-row" }, [
              createEl("span", {
                className: "bl-form-label",
                text: t("modal.description")
              }),
              createEl("span", {
                id: "bl-folder-desc-count",
                className: "bl-form-count",
                text: "0/200"
              })
            ]),
            createEl("textarea", {
              id: "bl-modal-folder-desc",
              className: "bl-textarea",
              attrs: {
                maxlength: "200",
                placeholder: t("modal.folderDescPlaceholder")
              }
            })
          ]),
          createEl("div", { className: "bl-form-item" }, [
            createEl("span", {
              className: "bl-form-label",
              text: t("modal.group")
            }),
            createEl("input", {
              id: "bl-modal-folder-group",
              className: "bl-input",
              attrs: {
                maxlength: "40",
                placeholder: t("modal.groupPlaceholder")
              }
            })
          ]),
          createEl("div", { className: "bl-modal-actions" }, [
            createEl("button", {
              id: "bl-modal-folder-cancel",
              className: "bl-btn bl-btn-outline",
              attrs: { type: "button" },
              text: t("button.cancel")
            }),
            createEl("button", {
              id: "bl-modal-folder-save",
              className: "bl-btn bl-btn-primary",
              attrs: { type: "button" },
              text: t("button.create")
            })
          ])
        ])
      ]
    );

    playbackOverlay = createEl(
      "section",
      {
        id: "bl-playback-overlay",
        className: "bl-hidden",
        attrs: { "data-theme": "light", "aria-live": "polite" }
      },
      [
        createEl("p", {
          className: "bl-playback-header"
        }, [
          createEl("div", { className: "bl-playback-header-copy" }, [
            createEl("p", {
              className: "bl-playback-caption",
              text: t("playback.title")
            }),
            createEl("p", {
              id: "bl-playback-current-title",
              className: "bl-playback-title",
              text: t("status.noVideoTitle")
            }),
            createEl("p", {
              id: "bl-playback-progress",
              className: "bl-playback-meta",
              text: t("playback.progress", { current: 0, total: 0 })
            })
          ]),
          createEl("div", { className: "bl-playback-header-actions" }, [
            createEl("button", {
              id: "bl-playback-collapse",
              className: "bl-btn bl-btn-outline",
              attrs: { type: "button" },
              text: t("button.collapse")
            })
          ])
        ]),
        createEl("div", { className: "bl-playback-actions" }, [
          createEl("button", {
            id: "bl-playback-prev",
            className: "bl-btn bl-btn-outline",
            attrs: { type: "button" },
            text: t("button.previous")
          }),
          createEl("button", {
            id: "bl-playback-next",
            className: "bl-btn bl-btn-primary",
            attrs: { type: "button" },
            text: t("button.next")
          }),
          createEl("button", {
            id: "bl-playback-list-toggle",
            className: "bl-btn bl-btn-secondary",
            attrs: { type: "button" },
            text: t("button.hideList")
          })
        ]),
        createEl("div", {
          id: "bl-playback-list",
          className: "bl-playback-list"
        })
      ]
    );

    floatingBtn = createEl(
      "button",
      {
        id: "bl-floating-btn",
        attrs: {
          "data-theme": "light",
          "data-favorite-state": "loading",
          "aria-controls": "bl-floating-panel",
          "aria-expanded": "false",
          "aria-pressed": "false",
          title: t("title.collector"),
          "aria-label": t("title.collector")
        }
      },
      [createFloatingButtonSvg()]
    );

    toastRoot = createEl("div", {
      className: "bl-toast-root",
      attrs: { "aria-live": "polite", "aria-atomic": "true" }
    });

    root.appendChild(panelBackdrop);
    root.appendChild(panel);
    root.appendChild(modal);
    root.appendChild(playbackOverlay);
    root.appendChild(floatingBtn);
    root.appendChild(toastRoot);
    document.body.appendChild(root);

    folderListEl = panel.querySelector("#bl-folder-list");
    folderSearchInput = panel.querySelector("#bl-folder-search");
    customTagsInput = panel.querySelector("#bl-custom-tags");
    customTagsSection = panel.querySelector("#bl-custom-tags-section");
    customTagSuggestionsEl = panel.querySelector("#bl-custom-tag-suggestions");
    saveBtn = panel.querySelector("#bl-save-btn");
    closeBtn = panel.querySelector("#bl-close-btn");
    openCreateFolderBtn = panel.querySelector("#bl-folder-create-open");
    selectAllFoldersBtn = panel.querySelector("#bl-select-all-folders");
    clearFolderSelectionBtn = panel.querySelector("#bl-clear-folders");
    selectedCountEl = panel.querySelector("#bl-selected-count");
    currentFavoriteFoldersEl = panel.querySelector("#bl-current-favorite-folders");
    videoTitleEl = panel.querySelector("#bl-video-title");
    videoMetaEl = panel.querySelector("#bl-video-meta");
    videoCoverEl = panel.querySelector("#bl-video-cover");
    saveFeedbackEl = panel.querySelector("#bl-save-feedback");
    saveFeedbackTitleEl = panel.querySelector("#bl-save-feedback-title");
    saveFeedbackMessageEl = panel.querySelector("#bl-save-feedback-message");

    folderNameCountEl = modal.querySelector("#bl-folder-name-count");
    folderDescCountEl = modal.querySelector("#bl-folder-desc-count");
    folderModalNameInput = modal.querySelector("#bl-modal-folder-name");
    folderModalDescInput = modal.querySelector("#bl-modal-folder-desc");
    folderModalGroupInput = modal.querySelector("#bl-modal-folder-group");
    folderModalSaveBtn = modal.querySelector("#bl-modal-folder-save");
    folderModalCancelBtn = modal.querySelector("#bl-modal-folder-cancel");
    folderModalCloseBtn = modal.querySelector("#bl-modal-folder-close");
    playbackOverlayTitleEl = playbackOverlay.querySelector("#bl-playback-current-title");
    playbackOverlayProgressEl = playbackOverlay.querySelector("#bl-playback-progress");
    playbackPrevBtn = playbackOverlay.querySelector("#bl-playback-prev");
    playbackNextBtn = playbackOverlay.querySelector("#bl-playback-next");
    playbackListToggleBtn = playbackOverlay.querySelector("#bl-playback-list-toggle");
    playbackCollapseBtn = playbackOverlay.querySelector("#bl-playback-collapse");
    playbackListEl = playbackOverlay.querySelector("#bl-playback-list");

    applyInitialButtonPosition();
    void restoreStoredButtonPosition();
    void applyStoredButtonSide();
    syncFloatingButtonLabel();
    bindFloatingButtonDrag();
    bindEvents();
    mountNativeFavoriteStatus();
    if (nativeFavoriteStatusObserver) nativeFavoriteStatusObserver.disconnect();
    nativeFavoriteStatusObserver = new MutationObserver(scheduleNativeFavoriteStatusMount);
    nativeFavoriteStatusObserver.observe(document.body, { childList: true, subtree: true });
    startFullscreenWatch();
    startPlaybackOverlayWatch();
    renderVideo(null);
    renderFolders("");
    renderCustomTagSuggestions();
    renderPlaybackQueueList([], -1);
    syncPlaybackOverlayState();
    syncCreateFolderCounter();
    void refreshFloatingFavoriteStateFromPage(true);
  }

  function setupThemeSync() {
    getThemePreference()
      .then((mode) => {
        activeThemePreference = mode;
        applyTheme();
      })
      .catch(() => {
        activeThemePreference = THEME_AUTO;
        applyTheme();
      });

    themeMediaQuery.addEventListener("change", () => {
      if (activeThemePreference === THEME_AUTO) {
        applyTheme();
      }
    });

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (changes[THEME_STORAGE_KEY]) {
          const next = changes[THEME_STORAGE_KEY].newValue;
          if (
            next === THEME_AUTO ||
            next === THEME_LIGHT ||
            next === THEME_DARK
          ) {
            activeThemePreference = next;
            applyTheme();
          }
        }
        if (changes[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]) {
          activeQuickFavoriteShortcut = resolveStoredShortcut(
            changes[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY].newValue ?? null
          );
          syncFloatingButtonLabel();
        }
      });
    }

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type !== "bl-theme-updated") return;
        const next = message?.theme;
        if (
          next === THEME_AUTO ||
          next === THEME_LIGHT ||
          next === THEME_DARK
        ) {
          activeThemePreference = next;
          applyTheme();
        }
      });
    }
  }

  const COMMENT_COMPONENT_SELECTOR = [
    "bili-comments",
    "bili-comments-header-renderer",
    "bili-comment-thread-renderer",
    "bili-comment-thread",
    "bili-comment-renderer",
    "bili-comment-reply-renderer",
    "bili-comment-replies-renderer",
    "bili-comment-action-buttons-renderer",
    "bili-comment-user-info",
    "bili-comment-user-info-renderer",
    "bili-comment-pictures-renderer",
    "bili-rich-text",
    "bili-avatar"
  ].join(",");
  const COMMENT_CANDIDATE_SELECTOR = [
    ".root-reply-container",
    ".reply-item",
    ".reply-item[data-rpid]",
    ".reply-item[data-id]",
    ".sub-reply-item",
    ".sub-reply-container",
    ".reply-wrap",
    ".root-reply",
    ".sub-reply",
    "[class*='root-reply-container']",
    "[class*='reply-item']",
    "[class*='reply-wrap']",
    "bili-comment-renderer",
    "bili-comment-reply-renderer"
  ].join(",");

  function getComposedParent(element) {
    if (element?.parentElement) return element.parentElement;
    const rootNode = element?.getRootNode?.();
    return rootNode?.host || null;
  }

  function collectElementSearchRoots(element) {
    const roots = [element];
    const queue = [element];
    const seen = new Set(roots);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current?.shadowRoot && !seen.has(current.shadowRoot)) {
        seen.add(current.shadowRoot);
        roots.push(current.shadowRoot);
        queue.push(current.shadowRoot);
      }
      for (const child of current?.querySelectorAll?.(COMMENT_COMPONENT_SELECTOR) || []) {
        if (child.shadowRoot && !seen.has(child.shadowRoot)) {
          seen.add(child.shadowRoot);
          roots.push(child.shadowRoot);
          queue.push(child.shadowRoot);
        }
      }
    }
    return roots;
  }

  function queryCommentElement(element, selectors) {
    const roots = collectElementSearchRoots(element);
    for (const selector of selectors) {
      for (const rootNode of roots) {
        const found = rootNode.querySelector?.(selector);
        if (found) return found;
      }
    }
    return null;
  }

  function readCommentId(element) {
    let current = element;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const propertyCandidates = [
        current.rpid,
        current.replyId,
        current.data?.rpid,
        current.data?.rpid_str,
        current.reply?.rpid,
        current.reply?.rpid_str,
        current.__data?.rpid,
        current.__data?.rpid_str
      ];
      for (const candidate of propertyCandidates) {
        const match = String(candidate ?? "").match(/^(\d{3,32})$/);
        if (match) return match[1];
      }
      for (const attribute of ["data-rpid", "rpid", "data-reply-id", "data-id", "id"]) {
        const value = current.getAttribute?.(attribute) || "";
        const match = String(value).match(/^\D*(\d{3,32})\D*$/);
        if (match) return match[1];
      }
      const directLink = queryCommentElement(current, [
        "a[href*='#reply']",
        "a[href*='comment_secondary_id']",
        "a[href*='comment_root_id']"
      ]);
      const href = directLink?.href || directLink?.getAttribute?.("href") || "";
      const secondaryMatch = href.match(/[?&]comment_secondary_id=(\d{3,32})/);
      if (secondaryMatch) return secondaryMatch[1];
      const hashMatch = href.match(/#reply(\d{3,32})/);
      if (hashMatch) return hashMatch[1];
      const rootMatch = href.match(/[?&]comment_root_id=(\d{3,32})/);
      if (rootMatch) return rootMatch[1];
      current = getComposedParent(current);
    }
    return "";
  }

  function readRootCommentId(element, fallbackRpid) {
    let current = element;
    for (let depth = 0; current && depth < 10; depth += 1) {
      for (const candidate of [
        current.rootRpid,
        current.rootId,
        current.data?.root,
        current.data?.root_str,
        current.reply?.root,
        current.reply?.root_str,
        current.__data?.root,
        current.__data?.root_str
      ]) {
        const match = String(candidate ?? "").match(/^(\d{3,32})$/);
        if (match) return match[1];
      }
      if (
        current.matches?.("bili-comment-thread") ||
        (current.matches?.(".reply-item") && !current.matches?.(".sub-reply-item"))
      ) {
        const id = readCommentId(current);
        if (id) return id;
      }
      current = getComposedParent(current);
    }
    return fallbackRpid;
  }

  function commentElementText(element, selectors) {
    return readCommentElementText(queryCommentElement(element, selectors));
  }

  function readCommentElementText(element) {
    if (!element) return "";
    const roots = collectElementSearchRoots(element);
    for (const root of roots) {
      const lightText = root.textContent?.trim() || "";
      if (lightText && root === element) return lightText;
      const shadowContent = root.querySelector?.(
        "#contents,#content,.contents,.content,[part='content']"
      );
      const nestedText = shadowContent?.textContent?.trim() || "";
      if (nestedText) return nestedText;
      if (root !== element && lightText) return lightText;
    }
    return "";
  }

  function readCommentImageUrl(image) {
    const source =
      image?.currentSrc ||
      image?.src ||
      image?.getAttribute?.("data-src") ||
      image?.getAttribute?.("data-original") ||
      String(image?.getAttribute?.("srcset") || "").split(/[\s,]+/)[0] ||
      "";
    return ensureAbsoluteUrl(source, "");
  }

  function collectCommentImages(...elements) {
    const urls = [];
    for (const element of elements.filter(Boolean)) {
      for (const rootNode of collectElementSearchRoots(element)) {
        for (const image of rootNode.querySelectorAll?.("img") || []) {
          const url = readCommentImageUrl(image);
          if (
            !url ||
            /\/bfs\/(?:emote|face|garb)\//i.test(url) ||
            /(?:avatar|user-face|userface)/i.test(url)
          ) {
            continue;
          }
          urls.push(url);
        }
        for (const styled of rootNode.querySelectorAll?.("[style*='background-image']") || []) {
          const styleValue = styled.style?.backgroundImage || "";
          const match = styleValue.match(/url\(["']?([^"')]+)["']?\)/i);
          const url = ensureAbsoluteUrl(match?.[1] || "", "");
          if (url && !/\/bfs\/(?:emote|face|garb)\//i.test(url)) {
            urls.push(url);
          }
        }
      }
    }
    return [...new Set(urls)];
  }

  function buildFavoriteCommentFromElement(element) {
    const contentElement = queryCommentElement(element, [
      ".reply-content",
      ".sub-reply-content",
      "[class*='reply-content']",
      "bili-rich-text",
      "[part='content']",
      "#content",
      ".content"
    ]);
    const content = readCommentElementText(contentElement);
    const pictureElement = queryCommentElement(element, [
      "bili-comment-pictures-renderer",
      ".reply-pictures",
      ".comment-pictures",
      "[class*='reply-picture']",
      "[class*='comment-picture']"
    ]);
    const contentImageUrls = collectCommentImages(contentElement, pictureElement);
    if (!content && contentImageUrls.length === 0) return null;

    const authorLink = queryCommentElement(element, [
      "a.user-name[href*='space.bilibili.com']",
      "a[href*='space.bilibili.com']"
    ]);
    const authorName =
      commentElementText(element, [
        ".user-name",
        ".sub-user-name",
        "[class*='user-name']",
        "[part='user-name']"
      ]) || readCommentElementText(authorLink);
    const authorSpaceUrl = ensureAbsoluteUrl(authorLink?.href || "", "");
    const authorMid = authorSpaceUrl.match(/space\.bilibili\.com\/(\d+)/)?.[1] || "";
    const avatarElement = queryCommentElement(element, [
      "img.avatar",
      "img[class*='avatar']",
      "img[class*='face']"
    ]);
    const timeElement = queryCommentElement(element, [
      "time",
      ".reply-time",
      ".sub-reply-time",
      "[class*='reply-time']",
      "[class*='pubdate']",
      "[class*='time']"
    ]);
    const publishedAtText = timeElement?.textContent?.trim() || "";
    const publishedAtRaw =
      timeElement?.getAttribute?.("datetime") ||
      timeElement?.getAttribute?.("data-time") ||
      timeElement?.getAttribute?.("title") ||
      publishedAtText;
    const likeText = commentElementText(element, [
      "[class*='like'] [class*='count']",
      "[class*='like-count']",
      ".like"
    ]);
    const rpid = readCommentId(element);
    const rootRpid = readRootCommentId(element, rpid);
    const pageSource = articleMode
      ? currentArticle || pickArticlePayload()
      : currentVideo || pickBasePayload();

    try {
      return normalizeFavoriteComment({
        rpid,
        rootRpid,
        bvid: articleMode ? "" : pageSource?.bvid || "",
        videoTitle:
          pageSource?.title ||
          document.title.replace(/_bilibili$/i, "").trim(),
        videoUrl:
          (articleMode ? pageSource?.sourceUrl : pageSource?.bvidUrl) ||
          location.href,
        content,
        contentImageUrls,
        authorName,
        authorMid,
        authorAvatarUrl: ensureAbsoluteUrl(
          avatarElement?.currentSrc || avatarElement?.src || "",
          ""
        ),
        authorSpaceUrl,
        replyToName: commentElementText(contentElement, [
          ".at",
          "[class*='reply-to']"
        ]).replace(/^@/, ""),
        likeCount: parseBilibiliCount(likeText),
        publishedAt: parseCommentPublishedAt(publishedAtRaw),
        publishedAtText
      });
    } catch {
      return null;
    }
  }

  function renderCommentFavoriteButton(button) {
    const saved = savedCommentKeys.has(button.dataset.commentSourceKey || "");
    button.textContent = saved
      ? `♥ ${t("button.savedComment")}`
      : `♡ ${t("button.favoriteComment")}`;
    button.title = saved
      ? t("button.unfavoriteComment")
      : t("button.favoriteComment");
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.style.color = saved ? "#fb7299" : "var(--text2, #61666d)";
    button.style.borderColor = saved ? "rgba(251,114,153,.55)" : "rgba(128,128,128,.35)";
    button.style.background = saved ? "rgba(251,114,153,.1)" : "var(--bg1, rgba(255,255,255,.72))";
  }

  function syncCommentFavoriteButtons(sourceKey) {
    for (const button of [...commentFavoriteButtons]) {
      if (!button.isConnected) {
        commentFavoriteButtons.delete(button);
        continue;
      }
      if (!sourceKey || button.dataset.commentSourceKey === sourceKey) {
        renderCommentFavoriteButton(button);
      }
    }
  }

  async function toggleCommentFavorite(button, element) {
    const comment = buildFavoriteCommentFromElement(element);
    if (!comment) {
      showToast(t("toast.commentReadFail"), "err");
      return;
    }
    button.dataset.commentSourceKey = comment.sourceKey;
    button.disabled = true;
    try {
      const result = await requestLocalApi("POST", "/comments/toggle", comment);
      if (result?.saved) savedCommentKeys.add(comment.sourceKey);
      else savedCommentKeys.delete(comment.sourceKey);
      syncCommentFavoriteButtons(comment.sourceKey);
    } catch (error) {
      showToast(
        `${t("toast.commentSaveFail")}: ${error instanceof Error ? error.message : t("error.unknown")}`,
        "err"
      );
    } finally {
      button.disabled = false;
    }
  }

  function resolveCommentFavoritePlacement(element) {
    const actionRenderer = element.matches?.(
      "bili-comment-action-buttons-renderer"
    )
      ? element
      : queryCommentElement(element, ["bili-comment-action-buttons-renderer"]);
    const actionRoot = actionRenderer?.shadowRoot;
    if (actionRoot) {
      const replyAction = actionRoot.querySelector("#reply");
      const moreAction = actionRoot.querySelector("#more");
      const mountTarget = moreAction?.parentNode || replyAction?.parentNode || actionRoot;
      const insertBefore =
        moreAction?.parentNode === mountTarget
          ? moreAction
          : replyAction?.parentNode === mountTarget
            ? replyAction.nextSibling
            : null;
      return { mountTarget, insertBefore, embedded: true };
    }

    const actionContainer = queryCommentElement(element, [
      ".reply-info",
      ".sub-reply-info",
      ".reply-operation",
      ".reply-actions",
      "[class*='reply-info']",
      "[class*='reply-operation']",
      "[class*='reply-action']",
      "[class*='operation']",
      "[class*='actions']",
      "[part='footer']",
      ".footer",
      "[class*='footer']",
      "[class*='action']"
    ]);
    const fallbackContainer = actionContainer || queryCommentElement(element, [
      ".reply-content-container",
      ".content-warp",
      ".root-reply",
      ".sub-reply-content",
      "[class*='reply-content-container']",
      "[part='content']"
    ]) || element.shadowRoot || element;
    const mountTarget = fallbackContainer.matches?.("button,a")
      ? fallbackContainer.parentNode
      : fallbackContainer;
    return { mountTarget, insertBefore: null, embedded: Boolean(actionContainer) };
  }

  function placeCommentFavoriteButton(button, placement) {
    const { mountTarget, insertBefore } = placement;
    if (!mountTarget) return false;
    if (
      button.parentNode !== mountTarget ||
      (insertBefore && button.nextSibling !== insertBefore)
    ) {
      mountTarget.insertBefore(button, insertBefore || null);
    }
    button.style.marginTop = placement.embedded ? "0" : "8px";
    return true;
  }

  function mountCommentFavoriteButton(element) {
    if (!element) return;

    const placement = resolveCommentFavoritePlacement(element);
    const mountedButton = element.__bilishelfCommentFavoriteButton;
    if (mountedButton?.isConnected) {
      placeCommentFavoriteButton(mountedButton, placement);
      return;
    }
    if (mountedButton) {
      commentFavoriteButtons.delete(mountedButton);
      element.__bilishelfCommentFavoriteButton = null;
    }
    const existingButton = queryCommentElement(element, [
      "[data-bilishelf-comment-favorite='true']"
    ]);
    if (existingButton) {
      element.__bilishelfCommentFavoriteButton = existingButton;
      commentFavoriteButtons.add(existingButton);
      placeCommentFavoriteButton(existingButton, placement);
      renderCommentFavoriteButton(existingButton);
      return;
    }
    const comment = buildFavoriteCommentFromElement(element);
    if (!placement.mountTarget) return;

    const button = createEl("button", {
      className: "bl-comment-favorite",
      attrs: {
        type: "button",
        "data-bilishelf-comment-favorite": "true",
        "data-comment-source-key": comment?.sourceKey || ""
      }
    });
    button.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "min-height:24px",
      "margin-left:8px",
      "margin-top:0",
      "padding:2px 8px",
      "border:1px solid rgba(128,128,128,.3)",
      "border-radius:6px",
      "font:500 12px/1.4 system-ui,sans-serif",
      "letter-spacing:0",
      "white-space:nowrap",
      "box-shadow:0 1px 3px rgba(0,0,0,.08)",
      "cursor:pointer",
      "transition:color .16s ease,border-color .16s ease,background .16s ease"
    ].join(";");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleCommentFavorite(button, element);
    });
    element.__bilishelfCommentFavoriteButton = button;
    commentFavoriteButtons.add(button);
    placeCommentFavoriteButton(button, placement);
    renderCommentFavoriteButton(button);
  }

  function collectOpenCommentRoots() {
    const roots = [document];
    const queue = [document];
    const seen = new Set(roots);
    while (queue.length > 0) {
      const rootNode = queue.shift();
      for (const element of rootNode.querySelectorAll?.(COMMENT_COMPONENT_SELECTOR) || []) {
        if (!element.shadowRoot || seen.has(element.shadowRoot)) continue;
        seen.add(element.shadowRoot);
        roots.push(element.shadowRoot);
        queue.push(element.shadowRoot);
      }
    }
    return roots;
  }

  function scanCommentFavoriteButtons() {
    for (const rootNode of collectOpenCommentRoots()) {
      if (rootNode.host?.matches?.("bili-comment-renderer,bili-comment-reply-renderer")) {
        mountCommentFavoriteButton(rootNode.host);
      }
      for (const element of rootNode.querySelectorAll?.(COMMENT_CANDIDATE_SELECTOR) || []) {
        mountCommentFavoriteButton(element);
      }
    }
    syncCommentFavoriteButtons();
  }

  async function startCommentFavoriteWatch() {
    try {
      const result = await requestLocalApi("GET", "/comments/keys");
      savedCommentKeys = new Set(
        (Array.isArray(result?.items) ? result.items : [])
          .map((item) => String(item || ""))
          .filter(Boolean)
      );
    } catch {
      savedCommentKeys = new Set();
    }
    scanCommentFavoriteButtons();
    if (commentScanTimer) window.clearInterval(commentScanTimer);
    commentScanTimer = window.setInterval(
      scanCommentFavoriteButtons,
      COMMENT_SCAN_INTERVAL_MS
    );
  }

  async function bootstrap() {
    activeLocale = await resolveLocale();
    if (!isActionSyncPageUrl(location.href)) return;
    articleMode = isArticleUiUrl(location.href);
    bindNativeFavoriteActionListener();
    void fetchBidirectionalSettings(true);
    if (articleMode) {
      injectUi();
      setupThemeSync();
      await loadArticleFavorite();
      void startCommentFavoriteWatch();
      return;
    }
    if (!isCollectorUiUrl(location.href)) return;
    activeQuickFavoriteShortcut = await resolveQuickFavoriteShortcutPreference();
    injectUi();
    setupThemeSync();
    void startCommentFavoriteWatch();
  }

  void bootstrap();
})();





