(function () {
  const API_BASE = "http://127.0.0.1:4321/api";
  const BILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view";
  const BILI_TAG_API = "https://api.bilibili.com/x/tag/archive/tags";
  const DEFAULT_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";

  const BUTTON_POS_STORAGE_KEY = "bili_like_button_pos_v2";
  const BUTTON_SIDE_STORAGE_KEY = "bili_like_button_side_v2";
  const THEME_STORAGE_KEY = "bili_like_ext_theme";

  const THEME_AUTO = "auto";
  const THEME_LIGHT = "light";
  const THEME_DARK = "dark";
  const LOCALE_ZH = "zh-CN";
  const LOCALE_EN = "en-US";

  const I18N = {
    "title.collector": {
      [LOCALE_ZH]: "BiliShelf 采集器",
      [LOCALE_EN]: "BiliShelf Collector"
    },
    "subtitle.collector": {
      [LOCALE_ZH]: "本地保存 · 多收藏夹 · 快速采集",
      [LOCALE_EN]: "Local save · multi-folder · quick capture"
    },
    "button.close": { [LOCALE_ZH]: "关闭", [LOCALE_EN]: "Close" },
    "button.save": { [LOCALE_ZH]: "保存", [LOCALE_EN]: "Save" },
    "button.newFolder": { [LOCALE_ZH]: "新建收藏夹", [LOCALE_EN]: "New Folder" },
    "button.selectAll": { [LOCALE_ZH]: "全选", [LOCALE_EN]: "Select all" },
    "button.clear": { [LOCALE_ZH]: "清空", [LOCALE_EN]: "Clear" },
    "button.cancel": { [LOCALE_ZH]: "取消", [LOCALE_EN]: "Cancel" },
    "button.create": { [LOCALE_ZH]: "创建", [LOCALE_EN]: "Create" },
    "section.folders": { [LOCALE_ZH]: "收藏夹", [LOCALE_EN]: "Folders" },
    "section.customTags": { [LOCALE_ZH]: "自定义标签", [LOCALE_EN]: "Custom Tags" },
    "field.searchFolders": { [LOCALE_ZH]: "搜索收藏夹...", [LOCALE_EN]: "Search folders..." },
    "field.customTags": {
      [LOCALE_ZH]: "自定义标签（逗号分隔）",
      [LOCALE_EN]: "Custom tags (comma separated)"
    },
    "status.noVideoTitle": { [LOCALE_ZH]: "未检测到视频", [LOCALE_EN]: "No video detected" },
    "status.noVideoDesc": {
      [LOCALE_ZH]: "请先打开一个 Bilibili 视频页。",
      [LOCALE_EN]: "Open a Bilibili video page first."
    },
    "status.unknownUploader": { [LOCALE_ZH]: "未知 UP 主", [LOCALE_EN]: "Unknown uploader" },
    "status.untitled": { [LOCALE_ZH]: "未命名视频", [LOCALE_EN]: "Untitled" },
    "status.selectedCount": { [LOCALE_ZH]: "已选 {count}", [LOCALE_EN]: "{count} selected" },
    "status.videosCount": { [LOCALE_ZH]: "{count} 个视频", [LOCALE_EN]: "{count} videos" },
    "status.noFolders": { [LOCALE_ZH]: "没有匹配的收藏夹", [LOCALE_EN]: "No folders found" },
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
    "toast.saveFail": { [LOCALE_ZH]: "保存失败", [LOCALE_EN]: "Save failed" },
    "status.readingCurrentPage": { [LOCALE_ZH]: "正在读取当前页面...", [LOCALE_EN]: "Reading current page..." },
    "error.unknown": { [LOCALE_ZH]: "未知错误", [LOCALE_EN]: "Unknown error" }
  };

  function resolveLocale() {
    const language = (
      chrome?.i18n?.getUILanguage?.() ||
      navigator.language ||
      LOCALE_EN
    ).toLowerCase();
    return language.startsWith("zh") ? LOCALE_ZH : LOCALE_EN;
  }

  let activeLocale = resolveLocale();

  function t(key, vars = {}) {
    const table = I18N[key];
    const template =
      table?.[activeLocale] || table?.[LOCALE_EN] || key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
  }

  let root = null;
  let panel = null;
  let floatingBtn = null;
  let modal = null;
  let toastRoot = null;
  let folderListEl = null;
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

  let suppressButtonClick = false;
  let allFolders = [];
  let selectedFolderIds = new Set();
  let currentVideo = null;
  let activeThemePreference = THEME_AUTO;

  const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function attrOf(selector, attr) {
    const value = document.querySelector(selector)?.getAttribute(attr);
    return value ? value.trim() : "";
  }

  function textOf(selector) {
    const value = document.querySelector(selector)?.textContent;
    return value ? value.trim() : "";
  }

  function createNodeFromHtml(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    return wrapper.firstElementChild;
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
      /投硬币枚数/i,
      /收藏人数/i,
      /转发人数/i,
      /视频作者/i,
      /作者简介/i,
      /相关视频/i,
      /弹幕列表/i,
      /\b\d+(?:\.\d+)?万\b/,
      /\b\d+(?:\.\d+)?亿\b/
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
          .split(/[,，\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ];
  }

  function pickBasePayload() {
    const canonical = attrOf('link[rel="canonical"]', "href") || location.href;
    const bvidMatch =
      canonical.match(/\/video\/(BV[0-9A-Za-z]+)/i) ||
      location.pathname.match(/\/(BV[0-9A-Za-z]+)/i);

    return {
      bvid: bvidMatch?.[1] || "",
      bvidUrl: canonical,
      title:
        attrOf('meta[property="og:title"]', "content") ||
        document.title.replace(/_哔哩哔哩_bilibili$/, "").trim(),
      uploader: textOf(".up-name") || textOf(".up-name--text") || "",
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

  async function fetchFolders() {
    const response = await fetch(`${API_BASE}/folders`);
    if (!response.ok) {
      throw new Error(`${t("toast.folderLoadFail")} (${response.status})`);
    }
    const data = await response.json();
    return data?.items || [];
  }

  async function createFolder(payload) {
    const response = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.message === "string") {
          message = parsed.message;
        }
      } catch {
      }
      const error = new Error(message || t("toast.folderCreateFail"));
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  function showToast(message, type = "ok") {
    if (!toastRoot || !message) return;
    const toastType =
      type === "err" ? "error" : type === "info" ? "info" : "success";
    const node = document.createElement("div");
    node.className = `Vue-Toastification__toast Vue-Toastification__toast--${toastType}`;

    const icon = document.createElement("span");
    icon.className = "Vue-Toastification__icon";
    icon.textContent = toastType === "error" ? "⚠" : toastType === "info" ? "ℹ" : "✓";

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
    videoMetaEl.textContent = `${video.uploader || t("status.unknownUploader")} · ${video.bvid || "-"}`;
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

    folderListEl.innerHTML = "";
    if (visible.length === 0) {
      folderListEl.appendChild(
        createNodeFromHtml(`<div class="bl-empty">${t("status.noFolders")}</div>`)
      );
      renderSelectedCount();
      return;
    }

    for (const folder of visible) {
      const checked = selectedFolderIds.has(folder.id) ? "checked" : "";
      const node = createNodeFromHtml(`
        <label class="bl-folder-item">
          <input type="checkbox" data-folder-id="${folder.id}" ${checked} />
          <div class="bl-folder-content">
            <p class="bl-folder-name"></p>
            <p class="bl-folder-meta"></p>
          </div>
        </label>
      `);
      node.querySelector(".bl-folder-name").textContent = folder.name;
      node.querySelector(".bl-folder-meta").textContent = t("status.videosCount", {
        count: folder.itemCount ?? 0
      });

      const checkbox = node.querySelector("input");
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

  function openPanel() {
    if (!panel) return;
    panel.classList.remove("bl-hidden");
    positionPanelNearButton();
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.add("bl-hidden");
    closeCreateFolderModal();
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
      renderVideo(null);
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
      bvidUrl: ensureAbsoluteUrl(
        base.bvidUrl,
        `https://www.bilibili.com/video/${base.bvid}`
      ),
      title: (detail?.title || base.title || "").trim(),
      coverUrl: ensureAbsoluteUrl(detail?.pic || base.coverUrl, DEFAULT_COVER),
      uploader:
        (detail?.owner?.name || base.uploader || "").trim() ||
        t("status.unknownUploader"),
      description: pickSafeDescription(detail),
      publishAt,
      systemTags: mergeSystemTags(apiSystemTags, detail)
    };

    if (!currentVideo.title) {
      currentVideo = null;
      renderVideo(null);
      setStatus(t("toast.videoLoadFail"), "err");
      return;
    }

    renderVideo(currentVideo);
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

  async function saveVideo() {
    if (!currentVideo?.bvid || !currentVideo?.title || !currentVideo?.bvidUrl) {
      setStatus(t("toast.videoIncomplete"), "err");
      return;
    }
    if (!saveBtn) return;

    saveBtn.disabled = true;
    try {
      const payload = {
        ...currentVideo,
        folderIds: [...selectedFolderIds],
        customTags: parseTags(customTagsInput?.value || ""),
        systemTags: currentVideo.systemTags || [],
        isInvalid: false
      };

      const response = await fetch(`${API_BASE}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `${t("toast.saveFail")} (${response.status})`);
      }

      setStatus(t("toast.saved"), "ok");
      await loadFolders();
    } catch (error) {
      setStatus(
        `${t("toast.saveFail")}: ${error instanceof Error ? error.message : t("error.unknown")}`,
        "err"
      );
    } finally {
      saveBtn.disabled = false;
    }
  }

  function readStoredButtonPosition() {
    try {
      const raw = localStorage.getItem(BUTTON_POS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const x = Number(parsed?.x);
      const y = Number(parsed?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    } catch {
      return null;
    }
  }

  function saveButtonPosition(x, y) {
    try {
      localStorage.setItem(BUTTON_POS_STORAGE_KEY, JSON.stringify({ x, y }));
    } catch {
    }
  }

  function clampButtonPosition(x, y) {
    const width = floatingBtn?.offsetWidth || 56;
    const height = floatingBtn?.offsetHeight || 56;
    const margin = 12;
    const maxX = window.innerWidth - width - margin;
    const maxY = window.innerHeight - height - margin;
    return {
      x: Math.min(Math.max(margin, x), Math.max(margin, maxX)),
      y: Math.min(Math.max(margin, y), Math.max(margin, maxY))
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
    if (panel && !panel.classList.contains("bl-hidden")) {
      positionPanelNearButton();
    }
  }

  function setButtonSide(side) {
    if (!floatingBtn) return;
    if (side === "left") {
      floatingBtn.classList.add("bl-side-left");
      floatingBtn.classList.remove("bl-side-right");
    } else {
      floatingBtn.classList.add("bl-side-right");
      floatingBtn.classList.remove("bl-side-left");
    }
    try {
      localStorage.setItem(BUTTON_SIDE_STORAGE_KEY, side);
    } catch {
    }
  }

  function applyStoredButtonSide() {
    const saved = localStorage.getItem(BUTTON_SIDE_STORAGE_KEY);
    setButtonSide(saved === "left" ? "left" : "right");
  }

  function applyInitialButtonPosition() {
    if (!floatingBtn) return;
    const stored = readStoredButtonPosition();
    if (stored) {
      placeFloatingButtonAt(stored.x, stored.y, false);
      return;
    }
    const width = floatingBtn.offsetWidth || 56;
    const height = floatingBtn.offsetHeight || 56;
    placeFloatingButtonAt(
      window.innerWidth - width - 24,
      window.innerHeight - height - 24,
      false
    );
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

  function positionPanelNearButton() {
    if (!panel || !floatingBtn) return;

    const panelWidth = panel.offsetWidth || 440;
    const panelHeight = panel.offsetHeight || 640;
    const buttonRect = floatingBtn.getBoundingClientRect();
    const gap = 10;

    let left = buttonRect.left + buttonRect.width - panelWidth;
    let top = buttonRect.top - panelHeight - gap;

    if (top < 10) top = buttonRect.bottom + gap;
    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) {
      left = window.innerWidth - panelWidth - 10;
    }
    if (top + panelHeight > window.innerHeight - 10) {
      top = window.innerHeight - panelHeight - 10;
    }

    panel.style.left = `${Math.max(10, left)}px`;
    panel.style.top = `${Math.max(10, top)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
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
        font-family: Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
      }
      .bl-hidden { display: none !important; }

      #bl-floating-btn {
        position: fixed;
        z-index: 999999;
        pointer-events: auto;
        width: 56px;
        height: 56px;
        border-radius: 999px;
        border: 1px solid rgba(140, 165, 255, .45);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
        touch-action: none;
        transition: transform .22s ease, box-shadow .2s ease, background .2s ease;
      }
      #bl-floating-btn[data-theme="light"] {
        background: linear-gradient(145deg, #5f7dff 0%, #3e5dfd 100%);
        color: #fff;
        box-shadow: 0 14px 30px rgba(63, 92, 255, .46);
      }
      #bl-floating-btn[data-theme="dark"] {
        background: linear-gradient(145deg, #88a2ff 0%, #6888ff 100%);
        color: #0b1225;
        box-shadow: 0 14px 30px rgba(90, 130, 255, .42);
      }
      #bl-floating-btn:hover { transform: translateY(-2px); }
      #bl-floating-btn:active { cursor: grabbing; transform: scale(.97); }
      #bl-floating-btn svg { width: 24px; height: 24px; }

      #bl-floating-panel {
        pointer-events: auto;
        position: fixed;
        width: min(440px, calc(100vw - 24px));
        max-height: min(84vh, 740px);
        overflow: auto;
        border-radius: 18px;
        border: 1px solid;
        padding: 14px;
        box-sizing: border-box;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 30px 54px rgba(8, 14, 30, .22);
      }
      #bl-floating-panel[data-theme="light"] {
        border-color: rgba(208, 220, 248, .9);
        background: linear-gradient(165deg, rgba(255,255,255,.95), rgba(244,248,255,.92));
        color: #17213b;
      }
      #bl-floating-panel[data-theme="dark"] {
        border-color: rgba(66, 82, 126, .85);
        background: linear-gradient(165deg, rgba(16,24,44,.95), rgba(12,18,36,.92));
        color: #e2e8f0;
      }

      .bl-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
      .bl-title-wrap { display: flex; flex-direction: column; gap: 2px; }
      .bl-title { margin: 0; font-size: 18px; font-weight: 700; }
      .bl-subtitle { font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-title { color: #111c37; }
      #bl-floating-panel[data-theme="dark"] .bl-title { color: #f1f5ff; }
      #bl-floating-panel[data-theme="light"] .bl-subtitle { color: #60708e; }
      #bl-floating-panel[data-theme="dark"] .bl-subtitle { color: #94a3c0; }

      .bl-btn {
        border: 0;
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all .16s ease;
      }
      .bl-btn:disabled { opacity: .56; cursor: not-allowed; }
      .bl-btn-primary { background: linear-gradient(135deg, #5d7cff 0%, #3f5cff 100%); color: #fff; }
      .bl-btn-secondary { background: #e8eefb; color: #2d426f; }
      .bl-btn-outline { background: transparent; border: 1px solid; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-secondary { background: #22385d; color: #d6e6ff; }
      #bl-floating-panel[data-theme="light"] .bl-btn-outline { border-color: #d3ddf2; color: #334766; }
      #bl-floating-panel[data-theme="dark"] .bl-btn-outline { border-color: #415378; color: #d2dcf1; }

      .bl-video-card {
        margin-top: 12px;
        border: 1px solid;
        border-radius: 14px;
        display: grid;
        grid-template-columns: 116px 1fr;
        gap: 10px;
        padding: 10px;
      }
      #bl-floating-panel[data-theme="light"] .bl-video-card { border-color: rgba(212, 223, 246, .95); background: rgba(255, 255, 255, .62); }
      #bl-floating-panel[data-theme="dark"] .bl-video-card { border-color: rgba(60, 76, 114, .92); background: rgba(15, 24, 46, .72); }
      .bl-video-cover { width: 116px; height: 65px; border-radius: 10px; object-fit: cover; background: #d9e0ef; }
      .bl-video-title { margin: 0; font-size: 13px; line-height: 1.35; font-weight: 650; }
      .bl-video-meta { margin-top: 6px; font-size: 12px; }
      #bl-floating-panel[data-theme="light"] .bl-video-meta { color: #60708e; }
      #bl-floating-panel[data-theme="dark"] .bl-video-meta { color: #98a8c5; }

      .bl-card { margin-top: 12px; border: 1px solid; border-radius: 14px; padding: 10px; }
      #bl-floating-panel[data-theme="light"] .bl-card { border-color: rgba(214, 225, 248, .95); background: rgba(255, 255, 255, .66); }
      #bl-floating-panel[data-theme="dark"] .bl-card { border-color: rgba(60, 76, 114, .92); background: rgba(13, 21, 40, .76); }
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

      .bl-folder-toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
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
      #bl-floating-panel[data-theme="light"] .bl-folder-list { border-color: #dde5f5; background: rgba(255, 255, 255, .82); }
      #bl-floating-panel[data-theme="dark"] .bl-folder-list { border-color: #3e4f74; background: rgba(13, 21, 40, .8); }
      .bl-folder-item { display: flex; align-items: flex-start; gap: 8px; padding: 7px; border-radius: 8px; }
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
        min-width: 220px;
        max-width: 360px;
        border-radius: 12px;
        border: 1px solid transparent;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.4;
        display: flex;
        align-items: flex-start;
        gap: 9px;
        box-shadow: 0 14px 28px rgba(17, 24, 39, .22);
        animation: bl-toast-in .18s ease;
        backdrop-filter: blur(12px);
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
        background: rgba(27, 169, 88, .16);
        border-color: rgba(27, 169, 88, .3);
      }
      .Vue-Toastification__toast--error {
        color: #9f223a;
        background: rgba(230, 38, 76, .15);
        border-color: rgba(230, 38, 76, .3);
      }
      .Vue-Toastification__toast--info {
        color: #1f3d84;
        background: rgba(59, 130, 246, .14);
        border-color: rgba(59, 130, 246, .26);
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
        background: rgba(16, 185, 129, .18);
        border-color: rgba(16, 185, 129, .34);
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--error {
        color: #fecaca;
        background: rgba(248, 113, 113, .2);
        border-color: rgba(248, 113, 113, .35);
      }
      #bl-floating-panel[data-theme="dark"] ~ .bl-toast-root .Vue-Toastification__toast--info {
        color: #cfe3ff;
        background: rgba(59, 130, 246, .2);
        border-color: rgba(96, 165, 250, .35);
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
    `;
    document.head.appendChild(style);
  }

  function bindEvents() {
    if (!floatingBtn || !panel) return;

    floatingBtn.addEventListener("click", async () => {
      if (suppressButtonClick) return;
      if (!panel.classList.contains("bl-hidden")) {
        closePanel();
        return;
      }

      openPanel();
      await Promise.all([loadVideo(), loadFolders()]);
    });

    closeBtn?.addEventListener("click", () => closePanel());
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

    window.addEventListener("resize", () => {
      if (!panel.classList.contains("bl-hidden")) {
        positionPanelNearButton();
      }
      const rect = floatingBtn.getBoundingClientRect();
      placeFloatingButtonAt(rect.left, rect.top, true);
    });
  }

  function injectUi() {
    injectStyles();

    root = document.createElement("div");
    root.id = "bl-floating-root";

    panel = createNodeFromHtml(`
      <div id="bl-floating-panel" class="bl-hidden" data-theme="light">
        <div class="bl-header">
          <div class="bl-title-wrap">
            <h2 class="bl-title">${t("title.collector")}</h2>
            <p class="bl-subtitle">${t("subtitle.collector")}</p>
          </div>
          <button id="bl-close-btn" class="bl-btn bl-btn-outline" type="button">${t("button.close")}</button>
        </div>

        <section class="bl-video-card">
          <img id="bl-video-cover" class="bl-video-cover" src="${DEFAULT_COVER}" alt="cover" />
          <div>
            <p id="bl-video-title" class="bl-video-title">Title: -</p>
            <p id="bl-video-meta" class="bl-video-meta">-</p>
          </div>
        </section>

        <section class="bl-card">
          <div class="bl-card-head">
            <span class="bl-label">${t("section.folders")}</span>
          </div>

          <div class="bl-folder-toolbar">
            <input id="bl-folder-search" class="bl-input" placeholder="${t("field.searchFolders")}" />
            <button id="bl-folder-create-open" class="bl-btn bl-btn-secondary" type="button">${t("button.newFolder")}</button>
          </div>

          <div class="bl-folder-actions">
            <div class="bl-folder-actions-left">
              <button id="bl-select-all-folders" class="bl-btn bl-btn-outline" type="button">${t("button.selectAll")}</button>
              <button id="bl-clear-folders" class="bl-btn bl-btn-outline" type="button">${t("button.clear")}</button>
            </div>
            <span id="bl-selected-count" class="bl-selected-count">${t("status.selectedCount", { count: 0 })}</span>
          </div>

          <div id="bl-folder-list" class="bl-folder-list"></div>
        </section>

        <section class="bl-card">
          <div class="bl-card-head">
            <span class="bl-label">${t("section.customTags")}</span>
          </div>
          <input id="bl-custom-tags" class="bl-input" placeholder="${t("field.customTags")}" />
        </section>

        <div class="bl-footer">
          <button id="bl-save-btn" class="bl-btn bl-btn-primary" type="button">${t("button.save")}</button>
        </div>
      </div>
    `);

    modal = createNodeFromHtml(`
      <div id="bl-create-folder-modal" class="bl-hidden" data-theme="light">
        <div class="bl-modal-panel">
          <div class="bl-modal-header">
            <h3 class="bl-modal-title">${t("modal.createFolder")}</h3>
            <button id="bl-modal-folder-close" class="bl-btn bl-btn-outline" type="button">${t("button.close")}</button>
          </div>

          <div class="bl-form-item">
            <div class="bl-form-row">
              <span class="bl-form-label">${t("modal.name")} <span style="color:#ef4444">*</span></span>
              <span id="bl-folder-name-count" class="bl-form-count">0/20</span>
            </div>
            <input id="bl-modal-folder-name" maxlength="20" class="bl-input" placeholder="${t("modal.folderNamePlaceholder")}" />
          </div>

          <div class="bl-form-item">
            <div class="bl-form-row">
              <span class="bl-form-label">${t("modal.description")}</span>
              <span id="bl-folder-desc-count" class="bl-form-count">0/200</span>
            </div>
            <textarea id="bl-modal-folder-desc" maxlength="200" class="bl-textarea" placeholder="${t("modal.folderDescPlaceholder")}"></textarea>
          </div>

          <div class="bl-modal-actions">
            <button id="bl-modal-folder-cancel" class="bl-btn bl-btn-outline" type="button">${t("button.cancel")}</button>
            <button id="bl-modal-folder-save" class="bl-btn bl-btn-primary" type="button">${t("button.create")}</button>
          </div>
        </div>
      </div>
    `);

    floatingBtn = createNodeFromHtml(`
      <button id="bl-floating-btn" data-theme="light" title="${t("title.collector")}" aria-label="${t("title.collector")}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.25"></circle>
          <path d="m10 8.75 5.5 3.25-5.5 3.25z" fill="currentColor" stroke="none"></path>
          <path d="M6.2 5.4h.01"></path>
          <path d="M17.8 18.6h.01"></path>
        </svg>
      </button>
    `);

    toastRoot = createNodeFromHtml(`
      <div class="bl-toast-root" aria-live="polite" aria-atomic="true"></div>
    `);

    root.appendChild(panel);
    root.appendChild(modal);
    root.appendChild(floatingBtn);
    root.appendChild(toastRoot);
    document.body.appendChild(root);

    folderListEl = panel.querySelector("#bl-folder-list");
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
    const subtitleEl = panel.querySelector(".bl-subtitle");
    if (subtitleEl) subtitleEl.textContent = t("subtitle.collector");

    applyInitialButtonPosition();
    applyStoredButtonSide();
    bindFloatingButtonDrag();
    bindEvents();
    renderVideo(null);
    renderFolders("");
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
        if (areaName !== "local" || !changes[THEME_STORAGE_KEY]) return;
        const next = changes[THEME_STORAGE_KEY].newValue;
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

  injectUi();
  setupThemeSync();
})();
