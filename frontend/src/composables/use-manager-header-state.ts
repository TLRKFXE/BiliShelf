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
  const { t, locale, trashMode, selectedFolderId, folders } = params;

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

  const batchPanelClasses = computed(
    () =>
      "panel-surface sticky bottom-3 z-20 rounded-xl border bg-card/95 p-3 text-foreground shadow-2xl backdrop-blur"
  );

  const batchOutlineButtonClasses = computed(
    () => "border-border/80 bg-background/85 text-foreground hover:bg-accent/65"
  );

  const batchSecondaryButtonClasses = computed(
    () => "bg-secondary/90 text-secondary-foreground hover:bg-secondary"
  );

  const batchSelectTriggerClasses = computed(
    () => "h-10 w-[220px] border-border/80 bg-background/90 text-foreground"
  );

  const batchSelectedTextClasses = computed(() => "text-sm text-muted-foreground");

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
