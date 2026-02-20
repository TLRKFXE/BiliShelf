import { defineStore } from "pinia";
import { ref } from "vue";

export type Locale = "zh-CN" | "en-US";
type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "bili-like-theme";
const LOCALE_STORAGE_KEY = "bili-like-locale";
const EXT_LOCALE_STORAGE_KEY = "bili_like_locale";

function resolveInitialLocale(): Locale {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "zh-CN" || saved === "en-US") return saved;
  const language = navigator.language.toLowerCase();
  return language.startsWith("zh") ? "zh-CN" : "en-US";
}

function resolveInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const useAppUiStore = defineStore("app-ui", () => {
  const locale = ref<Locale>("zh-CN");
  const isDark = ref(false);
  const initialized = ref(false);

  function setLocale(next: Locale, persist = true) {
    locale.value = next;
    document.documentElement.lang = next;
    if (persist) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      try {
        const runtimeChrome = (globalThis as { chrome?: { storage?: { local?: { set: (items: Record<string, string>) => Promise<void> | void } } } }).chrome;
        if (runtimeChrome?.storage?.local) {
          void runtimeChrome.storage.local.set({ [EXT_LOCALE_STORAGE_KEY]: next });
        }
      } catch {
      }
    }
  }

  function toggleLocale() {
    setLocale(locale.value === "zh-CN" ? "en-US" : "zh-CN");
  }

  function applyTheme(mode: ThemeMode, persist = true) {
    const dark = mode === "dark";
    document.documentElement.classList.toggle("dark", dark);
    isDark.value = dark;
    if (persist) window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  function withThemeTransition(updateTheme: () => void) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTheme();
      return;
    }

    const root = document.documentElement;
    root.classList.add("theme-transition");
    updateTheme();
    window.setTimeout(() => root.classList.remove("theme-transition"), 140);
  }

  function setTheme(mode: ThemeMode, persist = true) {
    withThemeTransition(() => applyTheme(mode, persist));
  }

  function toggleTheme() {
    setTheme(isDark.value ? "light" : "dark");
  }

  function initFromStorage() {
    if (initialized.value) return;
    setLocale(resolveInitialLocale(), false);
    applyTheme(resolveInitialTheme(), false);
    initialized.value = true;
  }

  return {
    locale,
    isDark,
    initialized,
    setLocale,
    toggleLocale,
    setTheme,
    toggleTheme,
    initFromStorage,
  };
});
