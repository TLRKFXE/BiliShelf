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
      [LOCALE_ZH]: "设置采集悬浮窗主题，并打开管理中心",
      [LOCALE_EN]: "Configure collector theme and open manager"
    },
    "popup.credit": {
      [LOCALE_ZH]: "By TLRK · © 2026 TLRK · MIT License",
      [LOCALE_EN]: "By TLRK · © 2026 TLRK · MIT License"
    },
    "theme.title": { [LOCALE_ZH]: "悬浮窗主题", [LOCALE_EN]: "Floating Panel Theme" },
    "theme.subtitle": {
      [LOCALE_ZH]: "可选浅色 / 深色 / 自动（跟随系统）",
      [LOCALE_EN]: "Choose light / dark / auto (follow system)"
    },
    "theme.auto": { [LOCALE_ZH]: "自动", [LOCALE_EN]: "Auto" },
    "theme.light": { [LOCALE_ZH]: "浅色", [LOCALE_EN]: "Light" },
    "theme.dark": { [LOCALE_ZH]: "深色", [LOCALE_EN]: "Dark" },
    "theme.groupLabel": { [LOCALE_ZH]: "主题模式", [LOCALE_EN]: "Theme mode" },
    "button.openManager": { [LOCALE_ZH]: "打开管理中心", [LOCALE_EN]: "Open Manager" },
    "button.openVideo": { [LOCALE_ZH]: "打开 Bilibili 视频页", [LOCALE_EN]: "Open Bilibili Video" },
    "toast.themeUpdated": {
      [LOCALE_ZH]: "主题已切换：{mode}",
      [LOCALE_EN]: "Theme updated: {mode}"
    },
    "toast.managerOpened": { [LOCALE_ZH]: "已打开管理中心", [LOCALE_EN]: "Manager opened" },
    "toast.biliOpened": { [LOCALE_ZH]: "已打开 Bilibili", [LOCALE_EN]: "Bilibili opened" },
    "toast.initFail": { [LOCALE_ZH]: "初始化失败", [LOCALE_EN]: "Initialization failed" }
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

  function t(key, vars = {}) {
    const table = I18N[key];
    const template = table?.[activeLocale] || table?.[LOCALE_EN] || key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
  }

  const toastRoot = document.getElementById("toast-root");
  const openManagerBtn = document.getElementById("open-manager");
  const openVideoBtn = document.getElementById("open-video");
  const themeInputs = Array.from(
    document.querySelectorAll('input[name="theme"]')
  );

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
    if (openManagerBtn) openManagerBtn.textContent = t("button.openManager");
    if (openVideoBtn) openVideoBtn.textContent = t("button.openVideo");
  }

  function showToast(message, type = "success") {
    if (!toastRoot || !message) return;
    const normalizedType =
      type === "error" ? "error" : type === "info" ? "info" : "success";
    const node = document.createElement("div");
    node.className = `Vue-Toastification__toast Vue-Toastification__toast--${normalizedType}`;

    const icon = document.createElement("span");
    icon.className = "Vue-Toastification__icon";
    icon.textContent =
      normalizedType === "error" ? "✖" : normalizedType === "info" ? "ℹ" : "✓";

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

  async function notifyActiveTabThemeChanged(mode) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "bl-theme-updated",
          theme: mode
        });
      } catch {
      }
    }
  }

  async function init() {
    activeLocale = await resolveLocale();
    applyI18n();

    const mode = await getThemeMode();
    syncThemeChecked(mode);
    applyPopupTheme(mode);

    themeMediaQuery.addEventListener("change", () => {
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

    openManagerBtn?.addEventListener("click", async () => {
      await chrome.tabs.create({ url: MANAGER_URL });
      showToast(t("toast.managerOpened"));
    });

    openVideoBtn?.addEventListener("click", async () => {
      await chrome.tabs.create({ url: BILIBILI_VIDEO_URL });
      showToast(t("toast.biliOpened"));
    });
  }

  init().catch((error) => {
    showToast(
      error instanceof Error ? error.message : t("toast.initFail"),
      "error"
    );
  });
})();
