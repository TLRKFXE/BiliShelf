(function () {
  const THEME_KEY = "bili_like_ext_theme";
  const MANAGER_URL = "http://127.0.0.1:5173";
  const BILIBILI_VIDEO_URL = "https://www.bilibili.com/video/";
  const LOCALE_ZH = "zh-CN";
  const LOCALE_EN = "en-US";
  const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const I18N = {
    "popup.title": { [LOCALE_ZH]: "BiliShelf 助手", [LOCALE_EN]: "BiliShelf Helper" },
    "popup.subtitle": { [LOCALE_ZH]: "插件设置", [LOCALE_EN]: "Extension settings" },
    "theme.title": { [LOCALE_ZH]: "悬浮窗主题", [LOCALE_EN]: "Floating Panel Theme" },
    "theme.subtitle": {
      [LOCALE_ZH]: "与管理页面主题同步：浅色 / 深色 / 自动。",
      [LOCALE_EN]: "Same theme style as manager: light / dark / auto."
    },
    "theme.auto": { [LOCALE_ZH]: "自动", [LOCALE_EN]: "Auto" },
    "theme.light": { [LOCALE_ZH]: "浅色", [LOCALE_EN]: "Light" },
    "theme.dark": { [LOCALE_ZH]: "深色", [LOCALE_EN]: "Dark" },
    "theme.groupLabel": { [LOCALE_ZH]: "主题模式", [LOCALE_EN]: "Theme mode" },
    "button.openManager": { [LOCALE_ZH]: "打开管理页", [LOCALE_EN]: "Open Manager" },
    "button.openVideo": { [LOCALE_ZH]: "打开 Bilibili 视频", [LOCALE_EN]: "Open Bilibili Video" },
    "toast.themeUpdated": {
      [LOCALE_ZH]: "主题已切换：{mode}",
      [LOCALE_EN]: "Theme updated: {mode}"
    },
    "toast.managerOpened": { [LOCALE_ZH]: "已打开管理页", [LOCALE_EN]: "Manager opened" },
    "toast.biliOpened": { [LOCALE_ZH]: "已打开 Bilibili", [LOCALE_EN]: "Bilibili opened" },
    "toast.initFail": { [LOCALE_ZH]: "初始化失败", [LOCALE_EN]: "Initialization failed" }
  };

  function resolveLocale() {
    const language = (
      chrome?.i18n?.getUILanguage?.() ||
      navigator.language ||
      LOCALE_EN
    ).toLowerCase();
    return language.startsWith("zh") ? LOCALE_ZH : LOCALE_EN;
  }

  const activeLocale = resolveLocale();

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
    const themeTitle = document.getElementById("theme-title");
    const themeSubtitle = document.getElementById("theme-subtitle");
    const themeAutoLabel = document.getElementById("theme-auto-label");
    const themeLightLabel = document.getElementById("theme-light-label");
    const themeDarkLabel = document.getElementById("theme-dark-label");
    const themeGroup = document.querySelector(".theme-options");

    if (popupTitle) popupTitle.textContent = t("popup.title");
    if (popupSubtitle) popupSubtitle.textContent = t("popup.subtitle");
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
      normalizedType === "error" ? "⚠" : normalizedType === "info" ? "ℹ" : "✓";

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
