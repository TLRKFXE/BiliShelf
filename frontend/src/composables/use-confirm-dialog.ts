import { ref } from "vue";

export type ConfirmVariant = "default" | "destructive";

export function useConfirmDialog(
  getDefaultTitle: () => string,
  getDefaultConfirmText: () => string
) {
  const confirmDialogOpen = ref(false);
  const confirmDialogTitle = ref("");
  const confirmDialogDescription = ref("");
  const confirmDialogConfirmText = ref("");
  const confirmDialogVariant = ref<ConfirmVariant>("destructive");

  let resolver: ((value: boolean) => void) | null = null;

  function openConfirmDialog(options: {
    title?: string;
    description?: string;
    confirmText?: string;
    variant?: ConfirmVariant;
  }) {
    confirmDialogTitle.value = options.title || getDefaultTitle();
    confirmDialogDescription.value = options.description || "";
    confirmDialogConfirmText.value =
      options.confirmText || getDefaultConfirmText();
    confirmDialogVariant.value = options.variant ?? "destructive";
    confirmDialogOpen.value = true;
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function resolveConfirmDialog(result: boolean) {
    confirmDialogOpen.value = false;
    const currentResolver = resolver;
    resolver = null;
    currentResolver?.(result);
  }

  function setConfirmDialogOpen(open: boolean) {
    confirmDialogOpen.value = open;
    if (!open && resolver) {
      const currentResolver = resolver;
      resolver = null;
      currentResolver(false);
    }
  }

  return {
    confirmDialogOpen,
    confirmDialogTitle,
    confirmDialogDescription,
    confirmDialogConfirmText,
    confirmDialogVariant,
    openConfirmDialog,
    resolveConfirmDialog,
    setConfirmDialogOpen,
  };
}
