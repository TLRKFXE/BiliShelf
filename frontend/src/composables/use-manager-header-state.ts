import { computed, type Ref } from "vue";
import type { Locale } from "@/stores/app-ui";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

type UseManagerHeaderStateParams = {
  t: TranslateFn;
  locale: Ref<Locale>;
  isDark: Ref<boolean>;
  trashMode: Ref<boolean>;
  selectedFolderId: Ref<number | null>;
  folders: Ref<Array<{ id: number; name: string }>>;
};

export function useManagerHeaderState(params: UseManagerHeaderStateParams) {
  const { t, locale, isDark, trashMode, selectedFolderId, folders } = params;

  const currentFolderName = computed(() => {
    if (selectedFolderId.value === null) return t("folder.allVideos");
    return (
      folders.value.find((row) => row.id === selectedFolderId.value)?.name ??
      t("folder.unknown")
    );
  });

  const currentViewLabel = computed(() =>
    trashMode.value ? t("view.trash") : t("view.manager")
  );

  const currentScopeLabel = computed(() =>
    trashMode.value
      ? t("scope.trash")
      : t("scope.folder", { name: currentFolderName.value })
  );

  const localeToggleText = computed(() =>
    locale.value === "zh-CN" ? "EN" : "\u4E2D\u6587"
  );

  const batchPanelClasses = computed(() =>
    isDark.value
      ? "fixed bottom-4 left-4 right-4 z-40 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-zinc-100 shadow-2xl backdrop-blur lg:left-[calc(320px+2rem)] lg:right-6"
      : "batch-panel-light fixed bottom-4 left-4 right-4 z-40 rounded-xl border border-slate-300 bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur lg:left-[calc(320px+2rem)] lg:right-6"
  );

  const batchOutlineButtonClasses = computed(() =>
    isDark.value
      ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
  );

  const batchSecondaryButtonClasses = computed(() =>
    isDark.value
      ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
  );

  const batchSelectTriggerClasses = computed(() =>
    isDark.value
      ? "h-10 w-[220px] border-zinc-700 bg-zinc-900 text-zinc-100"
      : "h-10 w-[220px] border-slate-300 bg-white text-slate-900"
  );

  const batchSelectedTextClasses = computed(() =>
    isDark.value ? "text-sm text-zinc-300" : "text-sm text-slate-600"
  );

  return {
    currentFolderName,
    currentViewLabel,
    currentScopeLabel,
    localeToggleText,
    batchPanelClasses,
    batchOutlineButtonClasses,
    batchSecondaryButtonClasses,
    batchSelectTriggerClasses,
    batchSelectedTextClasses,
  };
}
