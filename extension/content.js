import {
  containsFavoriteActionKeyword,
  extractFavoriteFolderIdFromUrl,
  extractBvidFromAny,
  isActionSyncPageUrl,
  isCollectorUiUrl,
  normalizeBvidToken,
} from "./utils/bili-action-sync.js";
import {
  buildQuickFavoriteToastMessage,
  isEditableTarget,
  matchesQuickFavoriteShortcut,
} from "./utils/quick-favorite.js";
import {
  findPlaybackQueueIndex,
  getAdjacentPlaybackItems,
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

(function () {
  const LOCAL_API_MESSAGE = "BILISHELF_LOCAL_API";
  const BILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view";
  const BILI_TAG_API = "https://api.bilibili.com/x/tag/archive/tags";
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
    "button.newFolder": { [LOCALE_ZH]: "新建收藏夹", [LOCALE_EN]: "New Folder" },
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
    "section.folders": { [LOCALE_ZH]: "收藏夹", [LOCALE_EN]: "Folders" },
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
    "status.noFolders": { [LOCALE_ZH]: "没有匹配的收藏夹", [LOCALE_EN]: "No folders found" },
    "status.savedFoldersCurrent": {
      [LOCALE_ZH]: "当前已在本地收藏夹：{folders}",
      [LOCALE_EN]: "Already saved in local folders: {folders}"
    },
    "status.savedBadge": { [LOCALE_ZH]: "已收藏", [LOCALE_EN]: "Saved" },
    "status.quickFavoriteHint": {
      [LOCALE_ZH]: "快捷键 {shortcut}",
      [LOCALE_EN]: "Shortcut {shortcut}"
    },
    "modal.createFolder": { [LOCALE_ZH]: "新建收藏夹", [LOCALE_EN]: "Create Folder" },
    "modal.name": { [LOCALE_ZH]: "名称", [LOCALE_EN]: "Name" },
    "modal.description": { [LOCALE_ZH]: "简介", [LOCALE_EN]: "Description" },
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

  function t(key, vars = {}) {
    const table = I18N[key];
    const template =
      table?.[activeLocale] || table?.[LOCALE_EN] || key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
  }

  function syncFloatingButtonLabel() {
    if (!floatingBtn) return;
    const shortcutLabel = formatShortcutLabel(activeQuickFavoriteShortcut);
    const label = `${t("title.collector")} (${shortcutLabel})`;
    floatingBtn.title = label;
    floatingBtn.setAttribute("aria-label", label);
  }

  let root = null;
  let panelBackdrop = null;
  let panel = null;
  let floatingBtn = null;
  let modal = null;
  let toastRoot = null;
  let folderListEl = null;
  let existingFoldersSummaryEl = null;
  let folderSearchInput = null;
  let customTagsInput = null;
  let saveBtn = null;
  let closeBtn = null;
  let openCreateFolderBtn = null;
  let selectAllFoldersBtn = null;
  let clearFolderSelectionBtn = null;
  let selectedCountEl = null;
  let videoTitleEl = null;
  let videoMetaEl = null;
  let videoCoverEl = null;
  let folderNameCountEl = null;
  let folderDescCountEl = null;
  let folderModalNameInput = null;
  let folderModalDescInput = null;
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

  let suppressButtonClick = false;
  let allFolders = [];
  let selectedFolderIds = new Set();
  let currentVideo = null;
  let currentVideoLocalFolders = [];
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

  function createBrandMarkSvg(fillColor) {
    return createSvgEl(
      "svg",
      { viewBox: "0 0 24 24", fill: "none" },
      [
        createSvgEl("path", {
          d: "M12 4.5L19 8.5V15.5L12 19.5L5 15.5V8.5L12 4.5Z",
          fill: fillColor
        }),
        createSvgEl("path", {
          d: "M12 8L16 10.3V13.7L12 16L8 13.7V10.3L12 8Z",
          fill: "#4C66FF"
        }),
        createSvgEl("path", {
          d: "M12 4.5V19.5",
          stroke: "#4C66FF",
          "stroke-width": "1.5",
          "stroke-linecap": "round"
        }),
        createSvgEl("path", {
          d: "M5 8.5L19 15.5",
          stroke: "#4C66FF",
          "stroke-width": "1.5",
          "stroke-linecap": "round"
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
          d: "M12 4.5L19 8.5V15.5L12 19.5L5 15.5V8.5L12 4.5Z",
          fill: "currentColor"
        }),
        createSvgEl("path", {
          d: "M12 8L16 10.3V13.7L12 16L8 13.7V10.3L12 8Z",
          fill: "#4C66FF"
        }),
        createSvgEl("path", {
          d: "M12 4.5V19.5",
          stroke: "#4C66FF",
          "stroke-width": "1.5",
          "stroke-linecap": "round"
        }),
        createSvgEl("path", {
          d: "M5 8.5L19 15.5",
          stroke: "#4C66FF",
          "stroke-width": "1.5",
          "stroke-linecap": "round"
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

  function pickBasePayload() {
    const canonical = attrOf('link[rel="canonical"]', "href") || location.href;
    const canonicalBvid = normalizeBvidToken(
      canonical.match(/\/video\/(BV[0-9A-Za-z]+)/i)?.[1] || ""
    );
    const pathnameBvid = normalizeBvidToken(
      location.pathname.match(/\/(BV[0-9A-Za-z]+)/i)?.[1] || ""
    );
    const queryBvid = normalizeBvidToken(
      new URLSearchParams(location.search).get("bvid")
    );
    const detectedBvid = canonicalBvid || pathnameBvid || queryBvid;
    const canonicalUrl = ensureAbsoluteUrl(canonical, location.href);

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
      bvid: detectedBvid,
      bvidUrl: detectedBvid
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
      typeof detail?.desc === "string" ? detail.desc : ""
    );
    if (apiDesc) return apiDesc;

    const jsonDesc = normalizeDescription(pickDescriptionFromJsonLd());
    if (jsonDesc) return jsonDesc;

    const domDesc = normalizeDescription(pickDescriptionFromDom());
    if (domDesc) return domDesc;

    return "";
  }

  async function fetchVideoDetail(bvid) {
    const url = `${BILI_VIEW_API}?bvid=${encodeURIComponent(bvid)}`;
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
    const data = await requestLocalApi("GET", "/folders");
    return data?.items || [];
  }

  function folderNamesFromIds(folderIds = []) {
    const idSet = new Set(folderIds.map((id) => Number(id)));
    return allFolders
      .filter((folder) => idSet.has(folder.id))
      .map((folder) => folder.name)
      .filter(Boolean);
  }

  function currentVideoLocalFolderNames() {
    return currentVideoLocalFolders.map((folder) => folder.name).filter(Boolean);
  }

  function currentVideoLocalFolderIds() {
    return currentVideoLocalFolders
      .map((folder) => Number(folder?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  function renderExistingFolderSummary(target) {
    if (!target) return;
    const folders = currentVideoLocalFolderNames();
    if (folders.length === 0) {
      target.textContent = "";
      target.classList.add("bl-hidden");
      return;
    }
    target.classList.remove("bl-hidden");
    target.textContent = t("status.savedFoldersCurrent", { folders: folders.join("、") });
  }

  async function fetchCurrentVideoLocalFoldersByBvid(bvid) {
    const normalizedBvid = normalizeBvidToken(bvid || "");
    if (!normalizedBvid) return [];

    const query = encodeURIComponent(normalizedBvid);
    const searchResult = await requestLocalApi(
      "GET",
      `/videos/search?q=${query}&page=1&pageSize=20`
    );
    const items = Array.isArray(searchResult?.items) ? searchResult.items : [];
    const matched = items.find(
      (item) => normalizeBvidToken(item?.bvid || "") === normalizedBvid
    );
    if (!matched?.id) return [];
    const detail = await requestLocalApi("GET", `/videos/${matched.id}`);
    return Array.isArray(detail?.folders) ? detail.folders : [];
  }

  async function refreshCurrentVideoLocalFolders() {
    const bvid = normalizeBvidToken(currentVideo?.bvid || "");
    if (!bvid) {
      currentVideoLocalFolders = [];
      renderExistingFolderSummary(existingFoldersSummaryEl);
      return;
    }
    try {
      currentVideoLocalFolders = await fetchCurrentVideoLocalFoldersByBvid(bvid);
    } catch {
      currentVideoLocalFolders = [];
    }
    renderExistingFolderSummary(existingFoldersSummaryEl);
  }

  async function createFolder(payload) {
    return requestLocalApi("POST", "/folders", payload);
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

    const icon = document.createElement("span");
    icon.className = "Vue-Toastification__icon";
    icon.textContent = toastType === "error" ? "x" : toastType === "info" ? "i" : "ok";

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

    videoTitleEl.textContent = video.title || t("status.untitled");
    videoMetaEl.textContent = `${video.uploader || t("status.unknownUploader")} - ${video.bvid || "-"}`;
    videoCoverEl.src = ensureAbsoluteUrl(video.coverUrl, DEFAULT_COVER);
  }

  function renderSelectedCount() {
    if (!selectedCountEl) return;
    selectedCountEl.textContent = t("status.selectedCount", {
      count: selectedFolderIds.size
    });
  }

  function renderFolders(keyword = "") {
    if (!folderListEl) return;
    const lower = keyword.trim().toLowerCase();
    const visible = allFolders.filter((folder) =>
      folder.name.toLowerCase().includes(lower)
    );

    folderListEl.replaceChildren();
    if (visible.length === 0) {
      folderListEl.appendChild(
        createEl("div", { className: "bl-empty", text: t("status.noFolders") })
      );
      renderSelectedCount();
      return;
    }

    for (const folder of visible) {
      const node = createEl("label", { className: "bl-folder-item" });
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
          text: t("status.videosCount", { count: folder.itemCount ?? 0 })
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

    renderSelectedCount();
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
    panelBackdrop.classList.remove("bl-hidden");
    panel.classList.remove("bl-hidden");
    if (folderSearchInput) {
      folderSearchInput.value = "";
    }
    await refreshCollectorData();
    const rememberedFolderIds = await readRememberedCollectorFolderIds();
    const currentVideoFolderIds = currentVideoLocalFolders
      .map((folder) => Number(folder?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    selectedFolderIds = new Set([...currentVideoFolderIds, ...rememberedFolderIds]);
    renderFolders("");
    folderSearchInput?.focus();
  }

  function closeCollectorModal() {
    if (!panel || !panelBackdrop) return;
    panel.classList.add("bl-hidden");
    panelBackdrop.classList.add("bl-hidden");
    closeCreateFolderModal();
  }

  function hidePlaybackOverlay() {
    if (!playbackOverlay) return;
    playbackOverlay.classList.add("bl-hidden");
  }

  function resolvePlaybackCursor() {
    const base = pickBasePayload();
    return {
      bvid: normalizeBvidToken(base.bvid || currentVideo?.bvid || "")
    };
  }

  function resolvePlaybackItemUrl(item) {
    const directUrl = ensureAbsoluteUrl(item?.url, "");
    if (directUrl) return directUrl;

    const bvid = normalizeBvidToken(item?.bvid || "");
    return bvid ? `https://www.bilibili.com/video/${bvid}/` : "";
  }

  function navigateToPlaybackItem(item) {
    const url = resolvePlaybackItemUrl(item);
    if (!url) return;
    window.location.href = url;
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
        navigateToPlaybackItem(item);
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
      const currentIndex = findPlaybackQueueIndex(session.queue, cursor);
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
        playbackPrevBtn.onclick = () => navigateToPlaybackItem(adjacent.previous.item);
      }
      if (playbackNextBtn) {
        playbackNextBtn.disabled = adjacent.next.disabled;
        playbackNextBtn.onclick = () => navigateToPlaybackItem(adjacent.next.item);
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
    await Promise.all([loadVideo(), loadFolders()]);
  }

  function handleQuickFavoriteShortcut(event) {
    if (matchesQuickFavoriteShortcut(event, activeQuickFavoriteShortcut)) {
      if (isEditableTarget(event.target)) return;
      if (!isCollectorUiUrl(location.href)) return;
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
      void saveVideo();
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
    if (!base.bvid) {
      currentVideo = null;
      currentVideoLocalFolders = [];
      renderVideo(null);
      renderExistingFolderSummary(existingFoldersSummaryEl);
      setStatus(t("toast.detectBvidFail"), "err");
      return;
    }

    let detail = null;
    let apiSystemTags = [];
    try {
      detail = await fetchVideoDetail(base.bvid);
    } catch {
      detail = null;
    }
    try {
      apiSystemTags = await fetchVideoTags(base.bvid);
    } catch {
      apiSystemTags = [];
    }

    const publishAt =
      typeof detail?.pubdate === "number" && Number.isFinite(detail.pubdate)
        ? Math.trunc(detail.pubdate * 1000)
        : null;

    currentVideo = {
      bvid: (base.bvid || detail?.bvid || "").trim(),
      aid:
        typeof detail?.aid === "number" && Number.isFinite(detail.aid)
          ? Math.trunc(detail.aid)
          : null,
      bvidUrl: ensureAbsoluteUrl(
        base.bvidUrl,
        `https://www.bilibili.com/video/${base.bvid}`
      ),
      title: (detail?.title || base.title || "").trim(),
      coverUrl: ensureAbsoluteUrl(detail?.pic || base.coverUrl, DEFAULT_COVER),
      uploader:
        (detail?.owner?.name || base.uploader || "").trim() ||
        t("status.unknownUploader"),
      uploaderSpaceUrl:
        (typeof detail?.owner?.mid === "number" && Number.isFinite(detail.owner.mid)
          ? `https://space.bilibili.com/${Math.trunc(detail.owner.mid)}`
          : base.uploaderSpaceUrl || ""),
      description: pickSafeDescription(detail),
      partition: typeof detail?.tname === "string" ? detail.tname.trim() : "",
      publishAt,
      systemTags: mergeSystemTags(apiSystemTags, detail)
    };

    if (!currentVideo.title) {
      currentVideo = null;
      currentVideoLocalFolders = [];
      renderVideo(null);
      renderExistingFolderSummary(existingFoldersSummaryEl);
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

  async function handleCreateFolder() {
    const name = (folderModalNameInput?.value || "").trim();
    const description = (folderModalDescInput?.value || "").trim();
    if (!name) {
      setStatus(t("toast.folderNameRequired"), "err");
      return;
    }

    if (!folderModalSaveBtn) return;
    folderModalSaveBtn.disabled = true;

    try {
      const created = await createFolder({ name, description: description || undefined });

      folderModalNameInput.value = "";
      folderModalDescInput.value = "";
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

  async function saveVideoWithFolderIds(folderIds, options = {}) {
    if (!currentVideo?.bvid || !currentVideo?.title || !currentVideo?.bvidUrl) {
      setStatus(t("toast.videoIncomplete"), "err");
      return;
    }
    const triggerButton = options.button || null;
    if (triggerButton) triggerButton.disabled = true;
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

      setStatus(toastMessage, "ok");
      currentVideoLocalFolders = Array.isArray(result?.finalFolders) ? result.finalFolders : [];
      selectedFolderIds = new Set(currentVideoLocalFolderIds());
      try {
        await chrome.storage.local.set(
          createRememberedCollectorFolderIdsRecord([...folderIds])
        );
      } catch {
      }
      renderExistingFolderSummary(existingFoldersSummaryEl);
      renderFolders(folderSearchInput?.value || "");
      await loadFolders();
      return result;
    } catch (error) {
      setStatus(
        `${t("toast.saveFail")}: ${error instanceof Error ? error.message : t("error.unknown")}`,
        "err"
      );
    } finally {
      if (triggerButton) triggerButton.disabled = false;
    }
  }

  async function saveVideo() {
    if (!saveBtn) return;
    return saveVideoWithFolderIds(selectedFolderIds, { button: saveBtn });
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
      }
      void refreshPlaybackOverlay();
    }, 1500);

    window.addEventListener("focus", () => {
      lastPlaybackOverlayUrl = location.href;
      void refreshPlaybackOverlay();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      lastPlaybackOverlayUrl = location.href;
      void refreshPlaybackOverlay();
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
        width: 44px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid rgba(120, 156, 255, .58);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
        touch-action: none;
        transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
      }
      #bl-floating-btn[data-theme="light"] {
        background: linear-gradient(145deg, #79a3ff 0%, #3e5dfe 100%);
        color: #fff;
        box-shadow: 0 10px 24px rgba(62, 93, 254, .38);
      }
      #bl-floating-btn[data-theme="dark"] {
        background: linear-gradient(145deg, #9ab6ff 0%, #7194ff 100%);
        color: #081229;
        box-shadow: 0 10px 24px rgba(113, 148, 255, .33);
      }
      #bl-floating-btn:hover { transform: translateY(-1px); }
      #bl-floating-btn:active { cursor: grabbing; transform: scale(.98); }
      #bl-floating-btn svg { width: 18px; height: 18px; }

      #bl-collector-backdrop {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(8, 14, 30, .42);
      }

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
      }
      #bl-floating-panel[data-theme="light"] {
        border-color: rgba(201, 216, 246, .98);
        background: linear-gradient(165deg, rgba(255,255,255,.995), rgba(247,250,255,.99));
        color: #17213b;
      }
      #bl-floating-panel[data-theme="dark"] {
        border-color: rgba(82, 103, 154, .95);
        background: linear-gradient(165deg, rgba(16,26,49,.992), rgba(13,22,43,.988));
        color: #e2e8f0;
      }

      .bl-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
      .bl-title-row { display: flex; align-items: center; gap: 8px; }
      .bl-brand-mark {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background: linear-gradient(145deg, #79a3ff 0%, #3e5dfe 100%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        box-shadow: 0 8px 16px rgba(62, 93, 254, .34);
      }
      .bl-brand-mark svg { width: 13px; height: 13px; }
      .bl-title-wrap { display: flex; flex-direction: column; gap: 2px; }
      .bl-title { margin: 0; font-size: 18px; font-weight: 700; }
      #bl-floating-panel[data-theme="light"] .bl-title { color: #111c37; }
      #bl-floating-panel[data-theme="dark"] .bl-title { color: #f1f5ff; }

      .bl-btn {
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.15;
        cursor: pointer;
        transition: all .14s ease;
      }
      .bl-btn:disabled { opacity: .56; cursor: not-allowed; }
      .bl-btn-primary { background: linear-gradient(135deg, #5f7eff 0%, #3e5dfe 100%); color: #fff; border-color: rgba(62, 93, 254, .55); }
      .bl-btn-secondary { background: #eaf0ff; color: #2d436f; border-color: #d4dff5; }
      .bl-btn-outline { background: transparent; border: 1px solid; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-secondary { background: #20355c; color: #d8e7ff; border-color: #304a7d; }
      #bl-floating-panel[data-theme="light"] .bl-btn-outline { border-color: #d2dcf2; color: #32486a; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-outline { border-color: #42557d; color: #d1ddf3; }

      .bl-video-card {
        margin-top: 12px;
        border: 1px solid;
        border-radius: 14px;
        display: grid;
        grid-template-columns: 116px 1fr;
        gap: 10px;
        padding: 10px;
      }
      #bl-floating-panel[data-theme="light"] .bl-video-card { border-color: rgba(206, 220, 248, .98); background: rgba(255, 255, 255, .92); }
      #bl-floating-panel[data-theme="dark"] .bl-video-card { border-color: rgba(67, 86, 130, .96); background: rgba(17, 27, 50, .9); }
      .bl-video-cover { width: 116px; height: 65px; border-radius: 10px; object-fit: cover; background: #d9e0ef; }
      .bl-video-title { margin: 0; font-size: 13px; line-height: 1.35; font-weight: 650; }
      .bl-video-meta { margin-top: 6px; font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-video-meta { color: #60708e; }
      #bl-floating-panel[data-theme="dark"] .bl-video-meta { color: #98a8c5; }
      .bl-existing-folders-summary {
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.45;
        border-radius: 10px;
        border: 1px dashed;
        padding: 8px 10px;
      }
      #bl-floating-panel[data-theme="light"] .bl-existing-folders-summary {
        color: #47597d;
        border-color: #cdd8ef;
        background: rgba(243, 247, 255, .92);
      }
      #bl-floating-panel[data-theme="dark"] .bl-existing-folders-summary {
        color: #c6d4ee;
        border-color: #42557d;
        background: rgba(18, 31, 58, .86);
      }

      .bl-card { margin-top: 12px; border: 1px solid; border-radius: 14px; padding: 10px; }
      #bl-floating-panel[data-theme="light"] .bl-card { border-color: rgba(210, 223, 249, .96); background: rgba(255, 255, 255, .94); }
      #bl-floating-panel[data-theme="dark"] .bl-card { border-color: rgba(66, 84, 127, .95); background: rgba(14, 23, 44, .9); }
      .bl-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
      .bl-label { font-size: 12px; font-weight: 600; }

      .bl-input {
        width: 100%;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid;
        padding: 9px 10px;
        font-size: 13px;
        transition: border-color .16s ease, box-shadow .16s ease;
      }
      #bl-floating-panel[data-theme="light"] .bl-input { border-color: #d5def1; background: rgba(255, 255, 255, .92); color: #15213e; }
      #bl-floating-panel[data-theme="dark"] .bl-input { border-color: #405075; background: #101b34; color: #edf2ff; }
      .bl-input:focus { outline: none; border-color: #6b86ff; box-shadow: 0 0 0 3px rgba(90, 122, 255, .18); }

      .bl-folder-toolbar { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
      .bl-folder-toolbar .bl-input { margin: 0; }
      .bl-folder-toolbar .bl-btn { white-space: nowrap; }

      .bl-folder-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
      .bl-folder-actions-left { display: flex; gap: 6px; }
      .bl-selected-count { font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-selected-count { color: #5f6f8f; }
      #bl-floating-panel[data-theme="dark"] .bl-selected-count { color: #93a4c3; }

      .bl-folder-list {
        max-height: 230px;
        overflow: auto;
        border: 1px solid;
        border-radius: 10px;
        padding: 6px;
      }
      #bl-floating-panel[data-theme="light"] .bl-folder-list { border-color: #d9e3f6; background: rgba(255, 255, 255, .94); }
      #bl-floating-panel[data-theme="dark"] .bl-folder-list { border-color: #455984; background: rgba(12, 21, 41, .92); }
      .bl-folder-item { display: flex; align-items: flex-start; gap: 8px; padding: 7px; border-radius: 8px; }
      .bl-folder-item.is-active {
        outline: 2px solid rgba(93, 126, 255, .32);
        outline-offset: -1px;
      }
      #bl-floating-panel[data-theme="light"] .bl-folder-item:hover { background: rgba(107, 134, 255, .1); }
      #bl-floating-panel[data-theme="dark"] .bl-folder-item:hover { background: rgba(108, 139, 255, .16); }
      .bl-folder-item input { margin-top: 2px; }
      .bl-folder-content { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .bl-folder-name { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.3; word-break: break-word; }
      .bl-folder-meta { margin: 0; font-size: 11px; }
      #bl-floating-panel[data-theme="light"] .bl-folder-meta { color: #6a7a99; }
      #bl-floating-panel[data-theme="dark"] .bl-folder-meta { color: #90a2c4; }
      .bl-empty { font-size: 12px; text-align: center; padding: 16px 8px; }
      #bl-floating-panel[data-theme="light"] .bl-empty { color: #7c8aa6; }
      #bl-floating-panel[data-theme="dark"] .bl-empty { color: #94a3be; }

      .bl-footer { margin-top: 12px; display: flex; gap: 8px; }
      .bl-footer .bl-btn { flex: 1; }
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
        background: linear-gradient(135deg, #effcf4 0%, #d7f7e4 100%);
        border-color: #7bd9a6;
      }
      .Vue-Toastification__toast--error {
        color: #9f223a;
        background: linear-gradient(135deg, #fff2f4 0%, #ffdfe5 100%);
        border-color: #ff9fb0;
      }
      .Vue-Toastification__toast--info {
        color: #1f3d84;
        background: linear-gradient(135deg, #eff6ff 0%, #dceaff 100%);
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
        background: linear-gradient(135deg, #153326 0%, #1c5b3d 100%);
        border-color: #39c78a;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--error {
        color: #fecaca;
        background: linear-gradient(135deg, #461322 0%, #8e1e3d 100%);
        border-color: #fb7185;
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--info {
        color: #cfe3ff;
        background: linear-gradient(135deg, #142544 0%, #234f98 100%);
        border-color: #60a5fa;
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
      .bl-modal-panel { width: min(560px, calc(100vw - 28px)); border-radius: 16px; border: 1px solid; padding: 14px; }
      #bl-create-folder-modal[data-theme="light"] .bl-modal-panel { border-color: #d5dff3; background: #ffffff; color: #17213b; }
      #bl-create-folder-modal[data-theme="dark"] .bl-modal-panel { border-color: #455984; background: #101b34; color: #e2e8f0; }
      .bl-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .bl-modal-title { margin: 0; font-size: 17px; font-weight: 700; }
      .bl-form-item { margin-bottom: 10px; }
      .bl-form-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .bl-form-label { font-size: 12px; font-weight: 600; }
      .bl-form-count { font-size: 12px; }
      #bl-create-folder-modal[data-theme="light"] .bl-form-count { color: #6a7a99; }
      #bl-create-folder-modal[data-theme="dark"] .bl-form-count { color: #94a4c3; }
      .bl-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid;
        border-radius: 10px;
        padding: 10px;
        min-height: 88px;
        font-size: 13px;
        resize: vertical;
      }
      #bl-create-folder-modal[data-theme="light"] .bl-input,
      #bl-create-folder-modal[data-theme="light"] .bl-textarea { border-color: #d5def1; background: #fff; color: #15213e; }
      #bl-create-folder-modal[data-theme="dark"] .bl-input,
      #bl-create-folder-modal[data-theme="dark"] .bl-textarea { border-color: #405075; background: #101b34; color: #edf2ff; }
      .bl-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

      #bl-playback-overlay {
        pointer-events: auto;
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 1000000;
        width: min(420px, calc(100vw - 32px));
        border-radius: 22px;
        border: 1px solid;
        padding: 14px;
        box-shadow: 0 24px 56px rgba(8, 14, 30, .24);
      }
      #bl-playback-overlay[data-theme="light"] {
        border-color: rgba(208, 221, 246, .96);
        background: linear-gradient(180deg, rgba(255, 255, 255, .99) 0%, rgba(244, 248, 255, .98) 100%);
        color: #17213b;
      }
      #bl-playback-overlay[data-theme="dark"] {
        border-color: rgba(82, 103, 154, .95);
        background: linear-gradient(180deg, rgba(17, 27, 49, .98) 0%, rgba(10, 18, 35, .98) 100%);
        color: #e2e8f0;
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
        letter-spacing: .02em;
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
        color: #60708e;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-meta {
        color: #94a3c0;
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
        border-radius: 14px;
        font-size: 12px;
        text-align: center;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-empty {
        background: rgba(230, 238, 255, .72);
        color: #5d6f92;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-empty {
        background: rgba(28, 40, 68, .82);
        color: #a7b5d1;
      }
      .bl-playback-list-item {
        width: 100%;
        display: grid;
        grid-template-columns: 60px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid;
        text-align: left;
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background-color .16s ease;
      }
      #bl-playback-overlay[data-theme="light"] .bl-playback-list-item {
        border-color: rgba(208, 220, 245, .95);
        background: rgba(255, 255, 255, .82);
        color: #17213b;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item {
        border-color: rgba(66, 84, 126, .95);
        background: rgba(18, 27, 49, .9);
        color: #e2e8f0;
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
        border-color: rgba(92, 124, 255, .65);
        background: rgba(235, 241, 255, .92);
        box-shadow: inset 0 0 0 1px rgba(92, 124, 255, .1);
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item.is-active,
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-item:disabled {
        border-color: rgba(128, 156, 255, .72);
        background: rgba(34, 48, 84, .96);
        box-shadow: inset 0 0 0 1px rgba(140, 166, 255, .18);
      }
      .bl-playback-thumb {
        width: 60px;
        height: 40px;
        border-radius: 12px;
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
        color: #9fb0d0;
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
        background: rgba(224, 232, 250, .9);
        color: #35508d;
      }
      #bl-playback-overlay[data-theme="dark"] .bl-playback-list-index {
        background: rgba(43, 60, 96, .95);
        color: #d7e3ff;
      }
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-actions,
      #bl-playback-overlay[data-collapsed="true"] .bl-playback-list {
        display: none;
      }

      @media (max-width: 680px) {
        #bl-playback-overlay {
          left: 12px;
          right: 12px;
          bottom: 12px;
          width: auto;
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
    saveBtn?.addEventListener("click", saveVideo);

    folderSearchInput?.addEventListener("input", (event) => {
      renderFolders(event.target.value || "");
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
        attrs: { "data-theme": "light" }
      },
      [
        createEl("div", { className: "bl-header" }, [
          createEl("div", { className: "bl-title-wrap" }, [
            createEl("h2", { className: "bl-title" }, [
              createEl("span", { className: "bl-title-row" }, [
                createEl(
                  "span",
                  { className: "bl-brand-mark", attrs: { "aria-hidden": "true" } },
                  [createBrandMarkSvg("white")]
                ),
                createEl("span", { text: t("title.collector") })
              ])
            ])
          ]),
          createEl("button", {
            id: "bl-close-btn",
            className: "bl-btn bl-btn-outline",
            attrs: { type: "button" },
            text: t("button.close")
          })
        ]),
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
            }),
            createEl("p", {
              id: "bl-panel-existing-folders-summary",
              className: "bl-existing-folders-summary bl-hidden",
              text: ""
            })
          ])
        ]),
        createEl("section", { className: "bl-card" }, [
          createEl("div", { className: "bl-card-head" }, [
            createEl("span", {
              className: "bl-label",
              text: t("section.folders")
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
              text: t("button.newFolder")
            })
          ]),
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
            createEl("span", {
              id: "bl-selected-count",
              className: "bl-selected-count",
              text: t("status.selectedCount", { count: 0 })
            })
          ]),
          createEl("div", { id: "bl-folder-list", className: "bl-folder-list" })
        ]),
        createEl("section", { className: "bl-card" }, [
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
          })
        ]),
        createEl("div", { className: "bl-footer" }, [
          createEl("button", {
            id: "bl-save-btn",
            className: "bl-btn bl-btn-primary",
            attrs: { type: "button" },
            text: t("button.save")
          })
        ]),
        createEl("p", { className: "bl-credit", text: t("footer.credit") })
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
              text: t("modal.createFolder")
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
    existingFoldersSummaryEl = panel.querySelector("#bl-panel-existing-folders-summary");
    folderSearchInput = panel.querySelector("#bl-folder-search");
    customTagsInput = panel.querySelector("#bl-custom-tags");
    saveBtn = panel.querySelector("#bl-save-btn");
    closeBtn = panel.querySelector("#bl-close-btn");
    openCreateFolderBtn = panel.querySelector("#bl-folder-create-open");
    selectAllFoldersBtn = panel.querySelector("#bl-select-all-folders");
    clearFolderSelectionBtn = panel.querySelector("#bl-clear-folders");
    selectedCountEl = panel.querySelector("#bl-selected-count");
    videoTitleEl = panel.querySelector("#bl-video-title");
    videoMetaEl = panel.querySelector("#bl-video-meta");
    videoCoverEl = panel.querySelector("#bl-video-cover");

    folderNameCountEl = modal.querySelector("#bl-folder-name-count");
    folderDescCountEl = modal.querySelector("#bl-folder-desc-count");
    folderModalNameInput = modal.querySelector("#bl-modal-folder-name");
    folderModalDescInput = modal.querySelector("#bl-modal-folder-desc");
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
    startFullscreenWatch();
    startPlaybackOverlayWatch();
    renderVideo(null);
    renderFolders("");
    renderExistingFolderSummary(existingFoldersSummaryEl);
    renderPlaybackQueueList([], -1);
    syncPlaybackOverlayState();
    syncCreateFolderCounter();
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

  async function bootstrap() {
    activeLocale = await resolveLocale();
    if (!isActionSyncPageUrl(location.href)) return;
    bindNativeFavoriteActionListener();
    void fetchBidirectionalSettings(true);
    if (!isCollectorUiUrl(location.href)) return;
    activeQuickFavoriteShortcut = await resolveQuickFavoriteShortcutPreference();
    injectUi();
    setupThemeSync();
  }

  void bootstrap();
})();





