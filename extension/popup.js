import {
  DEFAULT_QUICK_FAVORITE_SHORTCUT,
  QUICK_FAVORITE_SHORTCUT_STORAGE_KEY,
  formatShortcutLabel,
  isValidShortcutRecord,
  resolveStoredShortcut,
} from "./utils/shortcut-config.js";
import {
  createPopupToastGate,
  isModifierOnlyShortcutEvent,
} from "./utils/popup-feedback.js";

(function () {
  const THEME_KEY = "bili_like_ext_theme";
  const LOCALE_KEY = "bili_like_locale";
  const MANAGER_URL = chrome.runtime.getURL("manager/index.html");
  const BILIBILI_VIDEO_URL = "https://www.bilibili.com/video/";
  const LOCALE_ZH = "zh-CN";
  const LOCALE_EN = "en-US";
  const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const I18N = {
    "popup.title": { [LOCALE_ZH]: "BiliShelf 助手", [LOCALE_EN]: "BiliShelf Helper" },
    "popup.subtitle": {
      [LOCALE_ZH]: "配置收藏悬浮窗主题，并快速打开管理页。",
      [LOCALE_EN]: "Configure collector theme and open manager",
    },
    "popup.credit": {
      [LOCALE_ZH]: "By TLRK · © 2026 TLRK · MIT License",
      [LOCALE_EN]: "By TLRK · © 2026 TLRK · MIT License",
    },
    "theme.title": { [LOCALE_ZH]: "悬浮窗主题", [LOCALE_EN]: "Floating Panel Theme" },
    "theme.subtitle": {
      [LOCALE_ZH]: "可选浅色、深色或自动跟随系统。",
      [LOCALE_EN]: "Choose light / dark / auto (follow system)",
    },
    "theme.auto": { [LOCALE_ZH]: "自动", [LOCALE_EN]: "Auto" },
    "theme.light": { [LOCALE_ZH]: "浅色", [LOCALE_EN]: "Light" },
    "theme.dark": { [LOCALE_ZH]: "深色", [LOCALE_EN]: "Dark" },
    "theme.groupLabel": { [LOCALE_ZH]: "主题模式", [LOCALE_EN]: "Theme mode" },
    "shortcut.title": {
      [LOCALE_ZH]: "快捷收藏快捷键",
      [LOCALE_EN]: "Quick Favorite Shortcut",
    },
    "shortcut.subtitle": {
      [LOCALE_ZH]: "录制一个自定义快捷键，或临时禁用它。",
      [LOCALE_EN]: "Record a custom shortcut or temporarily disable it.",
    },
    "shortcut.button.startRecording": {
      [LOCALE_ZH]: "开始录制",
      [LOCALE_EN]: "Start Recording",
    },
    "shortcut.button.recording": {
      [LOCALE_ZH]: "请按下按键...",
      [LOCALE_EN]: "Press Keys...",
    },
    "shortcut.button.restoreDefault": {
      [LOCALE_ZH]: "恢复默认",
      [LOCALE_EN]: "Restore Default",
    },
    "shortcut.button.clear": { [LOCALE_ZH]: "清空", [LOCALE_EN]: "Clear" },
    "shortcut.hint.idle": {
      [LOCALE_ZH]: "点击开始录制后，使用 Alt 或 Ctrl 搭配一个字母或数字，按 Esc 取消。",
      [LOCALE_EN]:
        "Press Start Recording, then use Alt or Ctrl with one letter or number. Press Esc to cancel.",
    },
    "shortcut.hint.recording": {
      [LOCALE_ZH]: "正在录制：请按下 Alt 或 Ctrl 搭配一个字母或数字，按 Esc 取消。",
      [LOCALE_EN]:
        "Recording: press Alt or Ctrl with one letter or number. Press Esc to cancel.",
    },
    "shortcut.hint.disabled": {
      [LOCALE_ZH]: "当前已禁用快捷键；可恢复默认或重新录制。",
      [LOCALE_EN]: "Shortcut is disabled. Restore default or record a new one.",
    },
    "button.aiPlaceholder": {
      [LOCALE_ZH]: "AI（预留）",
      [LOCALE_EN]: "AI (Soon)",
    },
    "button.openManager": { [LOCALE_ZH]: "打开管理中心", [LOCALE_EN]: "Open Manager" },
    "button.openVideo": { [LOCALE_ZH]: "打开 Bilibili 视频", [LOCALE_EN]: "Open Bilibili Video" },
    "toast.themeUpdated": {
      [LOCALE_ZH]: "主题已切换：{mode}",
      [LOCALE_EN]: "Theme updated: {mode}",
    },
    "toast.managerOpened": { [LOCALE_ZH]: "已打开管理中心", [LOCALE_EN]: "Manager opened" },
    "toast.biliOpened": { [LOCALE_ZH]: "已打开 Bilibili", [LOCALE_EN]: "Bilibili opened" },
    "toast.shortcutSaved": {
      [LOCALE_ZH]: "快捷键已更新：{shortcut}",
      [LOCALE_EN]: "Shortcut updated: {shortcut}",
    },
    "toast.shortcutDisabled": {
      [LOCALE_ZH]: "快捷键已禁用",
      [LOCALE_EN]: "Shortcut disabled",
    },
    "toast.shortcutRestored": {
      [LOCALE_ZH]: "已恢复默认快捷键：{shortcut}",
      [LOCALE_EN]: "Default shortcut restored: {shortcut}",
    },
    "toast.shortcutInvalid": {
      [LOCALE_ZH]: "仅支持 Alt/Ctrl + 可选 Shift + 单个字母或数字",
      [LOCALE_EN]: "Use Alt/Ctrl + optional Shift + one letter or number",
    },
    "toast.shortcutRecordingCancelled": {
      [LOCALE_ZH]: "已取消录制",
      [LOCALE_EN]: "Recording cancelled",
    },
    "toast.comingSoon": { [LOCALE_ZH]: "coming soon", [LOCALE_EN]: "coming soon" },
    "toast.initFail": { [LOCALE_ZH]: "初始化失败", [LOCALE_EN]: "Initialization failed" },
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
      const result = await chrome.storage.local.get([LOCALE_KEY]);
      const saved = result?.[LOCALE_KEY];
      if (saved === LOCALE_ZH || saved === LOCALE_EN) return saved;
    } catch {
    }
    return fallback;
  }

  let activeLocale = LOCALE_EN;
  let activeShortcut = resolveStoredShortcut(DEFAULT_QUICK_FAVORITE_SHORTCUT);
  let isRecordingShortcut = false;
  const toastGate = createPopupToastGate();

  function t(key, vars = {}) {
    const table = I18N[key];
    const template = table?.[activeLocale] || table?.[LOCALE_EN] || key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
  }

  const toastRoot = document.getElementById("toast-root");
  const openAiPlaceholderBtn = document.getElementById("open-ai-placeholder");
  const openManagerBtn = document.getElementById("open-manager");
  const openVideoBtn = document.getElementById("open-video");
  const themeInputs = Array.from(document.querySelectorAll('input[name="theme"]'));
  const shortcutTitle = document.getElementById("shortcut-title");
  const shortcutSubtitle = document.getElementById("shortcut-subtitle");
  const shortcutCurrentLabel = document.getElementById("shortcut-current-label");
  const shortcutRecordingHint = document.getElementById("shortcut-recording-hint");
  const shortcutStartRecordingBtn = document.getElementById("shortcut-start-recording");
  const shortcutRestoreDefaultBtn = document.getElementById("shortcut-restore-default");
  const shortcutClearBtn = document.getElementById("shortcut-clear");

  function applyI18n() {
    document.documentElement.lang = activeLocale === LOCALE_ZH ? "zh-CN" : "en";
    const popupTitle = document.getElementById("popup-title");
    const popupSubtitle = document.getElementById("popup-subtitle");
    const popupCredit = document.getElementById("popup-credit");
    const themeTitle = document.getElementById("theme-title");
    const themeSubtitle = document.getElementById("theme-subtitle");
    const themeAutoLabel = document.getElementById("theme-auto-label");
    const themeLightLabel = document.getElementById("theme-light-label");
    const themeDarkLabel = document.getElementById("theme-dark-label");
    const themeGroup = document.querySelector(".theme-options");

    if (popupTitle) popupTitle.textContent = t("popup.title");
    if (popupSubtitle) popupSubtitle.textContent = t("popup.subtitle");
    if (popupCredit) popupCredit.textContent = t("popup.credit");
    if (themeTitle) themeTitle.textContent = t("theme.title");
    if (themeSubtitle) themeSubtitle.textContent = t("theme.subtitle");
    if (themeAutoLabel) themeAutoLabel.textContent = t("theme.auto");
    if (themeLightLabel) themeLightLabel.textContent = t("theme.light");
    if (themeDarkLabel) themeDarkLabel.textContent = t("theme.dark");
    if (themeGroup) themeGroup.setAttribute("aria-label", t("theme.groupLabel"));
    if (shortcutTitle) shortcutTitle.textContent = t("shortcut.title");
    if (shortcutSubtitle) shortcutSubtitle.textContent = t("shortcut.subtitle");
    if (shortcutRestoreDefaultBtn) {
      shortcutRestoreDefaultBtn.textContent = t("shortcut.button.restoreDefault");
    }
    if (shortcutClearBtn) shortcutClearBtn.textContent = t("shortcut.button.clear");
    if (openAiPlaceholderBtn) openAiPlaceholderBtn.textContent = t("button.aiPlaceholder");
    if (openManagerBtn) openManagerBtn.textContent = t("button.openManager");
    if (openVideoBtn) openVideoBtn.textContent = t("button.openVideo");
    renderShortcutState();
  }

  function showToast(message, type = "success") {
    if (!toastRoot || !message) return;
    const normalizedType =
      type === "error" ? "error" : type === "info" ? "info" : "success";
    if (!toastGate.shouldDisplay(message, normalizedType)) return;

    const node = document.createElement("div");
    node.className = `Vue-Toastification__toast Vue-Toastification__toast--${normalizedType}`;

    const icon = document.createElement("span");
    icon.className = "Vue-Toastification__icon";
    icon.textContent =
      normalizedType === "error" ? "!" : normalizedType === "info" ? "i" : "ok";

    const body = document.createElement("div");
    body.className = "Vue-Toastification__toast-body";
    body.textContent = message;

    node.appendChild(icon);
    node.appendChild(body);
    toastRoot.appendChild(node);

    setTimeout(() => {
      node.classList.add("is-leaving");
      setTimeout(() => node.remove(), 220);
    }, 2800);
  }

  async function getThemeMode() {
    try {
      const result = await chrome.storage.local.get([THEME_KEY]);
      const mode = result?.[THEME_KEY];
      if (mode === "light" || mode === "dark" || mode === "auto") return mode;
    } catch {
    }
    return "auto";
  }

  async function setThemeMode(mode) {
    await chrome.storage.local.set({ [THEME_KEY]: mode });
  }

  async function getShortcutConfig() {
    try {
      const result = await chrome.storage.local.get([QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]);
      return resolveStoredShortcut(result?.[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY] ?? null);
    } catch {
      return resolveStoredShortcut(null);
    }
  }

  function resolveAppliedTheme(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return themeMediaQuery.matches ? "dark" : "light";
  }

  function applyPopupTheme(mode) {
    document.body.dataset.theme = resolveAppliedTheme(mode);
  }

  function syncThemeChecked(mode) {
    for (const input of themeInputs) {
      input.checked = input.value === mode;
    }
  }

  function getShortcutHintText() {
    if (isRecordingShortcut) return t("shortcut.hint.recording");
    if (activeShortcut.disabled) return t("shortcut.hint.disabled");
    return t("shortcut.hint.idle");
  }

  function renderShortcutState() {
    if (shortcutCurrentLabel) {
      shortcutCurrentLabel.textContent = formatShortcutLabel(activeShortcut);
    }
    if (shortcutRecordingHint) {
      shortcutRecordingHint.textContent = getShortcutHintText();
    }
    if (shortcutStartRecordingBtn) {
      shortcutStartRecordingBtn.textContent = isRecordingShortcut
        ? t("shortcut.button.recording")
        : t("shortcut.button.startRecording");
      shortcutStartRecordingBtn.setAttribute(
        "aria-pressed",
        isRecordingShortcut ? "true" : "false"
      );
    }
  }

  function listenToThemeChanges(listener) {
    if (typeof themeMediaQuery.addEventListener === "function") {
      themeMediaQuery.addEventListener("change", listener);
      return;
    }
    if (typeof themeMediaQuery.addListener === "function") {
      themeMediaQuery.addListener(listener);
    }
  }

  async function notifyActiveTabThemeChanged(mode) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "bl-theme-updated",
          theme: mode,
        });
      } catch {
      }
    }
  }

  function buildShortcutRecordFromEvent(event) {
    return {
      mode: "custom",
      altKey: Boolean(event.altKey),
      ctrlKey: Boolean(event.ctrlKey),
      shiftKey: Boolean(event.shiftKey),
      code: String(event.code || ""),
      key: String(event.key || "").slice(0, 1).toLowerCase(),
    };
  }

  async function saveCustomShortcut(record) {
    await chrome.storage.local.set({
      [QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]: {
        mode: "custom",
        altKey: record.altKey,
        ctrlKey: record.ctrlKey,
        shiftKey: record.shiftKey,
        code: record.code,
        key: record.key,
      },
    });
    activeShortcut = resolveStoredShortcut(record);
  }

  async function disableShortcut() {
    await chrome.storage.local.set({
      [QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]: { mode: "disabled" },
    });
    activeShortcut = resolveStoredShortcut({ mode: "disabled" });
  }

  async function restoreDefaultShortcut() {
    await chrome.storage.local.remove(QUICK_FAVORITE_SHORTCUT_STORAGE_KEY);
    activeShortcut = resolveStoredShortcut(null);
  }

  function stopShortcutRecording() {
    isRecordingShortcut = false;
    renderShortcutState();
  }

  function startShortcutRecording() {
    isRecordingShortcut = true;
    renderShortcutState();
  }

  async function handleShortcutRecording(event) {
    if (!isRecordingShortcut) return;

    if (event.key === "Escape") {
      event.preventDefault();
      stopShortcutRecording();
      showToast(t("toast.shortcutRecordingCancelled"), "info");
      return;
    }

    if (isModifierOnlyShortcutEvent(event)) {
      return;
    }

    event.preventDefault();
    const record = buildShortcutRecordFromEvent(event);
    if (!isValidShortcutRecord(record)) {
      showToast(t("toast.shortcutInvalid"), "error");
      return;
    }

    await saveCustomShortcut(record);
    stopShortcutRecording();
    showToast(t("toast.shortcutSaved", { shortcut: formatShortcutLabel(activeShortcut) }));
  }

  function handleStorageChanged(changes, areaName) {
    if (areaName !== "local") return;
    if (!changes?.[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY]) return;
    activeShortcut = resolveStoredShortcut(
      changes[QUICK_FAVORITE_SHORTCUT_STORAGE_KEY].newValue ?? null
    );
    renderShortcutState();
  }

  async function init() {
    activeLocale = await resolveLocale();
    applyI18n();

    const mode = await getThemeMode();
    activeShortcut = await getShortcutConfig();
    syncThemeChecked(mode);
    applyPopupTheme(mode);
    renderShortcutState();

    listenToThemeChanges(() => {
      const checked = themeInputs.find((input) => input.checked)?.value ?? "auto";
      applyPopupTheme(checked);
    });

    for (const input of themeInputs) {
      input.addEventListener("change", async (event) => {
        const next = event.target?.value;
        if (next !== "light" && next !== "dark" && next !== "auto") return;
        await setThemeMode(next);
        applyPopupTheme(next);
        await notifyActiveTabThemeChanged(next);
        showToast(t("toast.themeUpdated", { mode: t(`theme.${next}`) }));
      });
    }

    shortcutStartRecordingBtn?.addEventListener("click", () => {
      startShortcutRecording();
    });

    shortcutRestoreDefaultBtn?.addEventListener("click", async () => {
      await restoreDefaultShortcut();
      stopShortcutRecording();
      showToast(
        t("toast.shortcutRestored", { shortcut: formatShortcutLabel(activeShortcut) })
      );
    });

    shortcutClearBtn?.addEventListener("click", async () => {
      await disableShortcut();
      stopShortcutRecording();
      showToast(t("toast.shortcutDisabled"));
    });

    window.addEventListener("keydown", (event) => {
      void handleShortcutRecording(event);
    });

    chrome.storage.onChanged.addListener(handleStorageChanged);

    openManagerBtn?.addEventListener("click", async () => {
      await chrome.tabs.create({ url: MANAGER_URL });
      showToast(t("toast.managerOpened"));
    });

    openAiPlaceholderBtn?.addEventListener("click", () => {
      showToast(t("toast.comingSoon"), "info");
    });

    openVideoBtn?.addEventListener("click", async () => {
      await chrome.tabs.create({ url: BILIBILI_VIDEO_URL });
      showToast(t("toast.biliOpened"));
    });
  }

  init().catch((error) => {
    showToast(error instanceof Error ? error.message : t("toast.initFail"), "error");
  });
})();
